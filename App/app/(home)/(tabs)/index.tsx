
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { View, Linking, Platform, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import SwipeDeck, { SwipeAction } from '@/components/SwipeDeck'
import { ThemedText } from '@/components/ThemedText'
import { Colors } from '@/constants/Colors'
import { useUser } from '@/hooks/useUser'
import { RecommendedUser } from '@/types/User'
import { useRouter } from 'expo-router'
import { storyAPI } from '@/APIs/storyAPIs'
import { useStoryStore, StoryItem } from '@/store/storyStore'
import { useAuthStore } from '@/store/authStore'
import { useTranslation } from 'react-i18next'
import * as Location from 'expo-location'
import * as Notifications from 'expo-notifications'
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio'
import { useFocusEffect } from '@react-navigation/native'
import * as Device from 'expo-device'
import CustomDialog from '@/components/CustomDialog'
import { getActiveAnnouncementAPI } from '@/APIs/announcementAPIs'
import { useAuth } from '@/hooks/useAuth'
import CircularLoader from '@/components/CircularLoader'
import { useMessagingStore } from '@/store/messagingStore'
import { Send } from 'lucide-react-native'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: false,
    shouldShowList: true,
  }),
})

export default function index() {
  const { t } = useTranslation()
  const router = useRouter()

  const { getRecommendedUsers, updateUser } = useUser()
  const { idToken, token } = useAuth()
  const { signOut } = useAuth()

  const [profiles, setProfiles] = useState<RecommendedUser[]>([])
  const [consumed, setConsumed] = useState(0)
  const [deckKey, setDeckKey] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [permissionsChecked, setPermissionsChecked] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [permissionDialogVisible, setPermissionDialogVisible] = useState(false)
  const isRefreshingRef = useRef(false)
  const isCheckingPermissionsRef = useRef(false)
  const lastLocationSentRef = useRef<string | null>(null)
  const lastPushTokenSentRef = useRef<string | null>(null)
  const permissionDialogShownRef = useRef<string | null>(null)
  const userDismissedAlertRef = useRef(false)
  const lastPermissionStateRef = useRef<string | null>(null)
  const lastAnnouncementCheckRef = useRef<number>(0)
  const lastShownAnnouncementIdRef = useRef<string | null>(null)
  const lastAnnouncementShownTimeRef = useRef<number>(0)

  // Story store
  const { setCategorizedStories, setLoading: setStoryLoading } = useStoryStore()
  const { dbUser, setDBUser, addNotificationToken, getNotificationTokens } = useAuthStore()

  // Stable refs to avoid recreating callbacks when reactive values change
  const idTokenRef = useRef(idToken)
  idTokenRef.current = idToken
  const dbUserRef = useRef(dbUser)
  dbUserRef.current = dbUser
  const updateUserRef = useRef(updateUser)
  updateUserRef.current = updateUser

  // Background location sync — fully independent, own error handling
  const syncLocation = useCallback(async () => {
    const currentIdToken = idTokenRef.current
    if (!currentIdToken) return

    try {
      const { status } = await Location.getForegroundPermissionsAsync()
      if (status !== 'granted') return

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      let city: string | undefined
      try {
        const reverse = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        })
        if (reverse?.length) {
          const a = reverse[0]
          city = [a.city, a.region, a.country].filter(Boolean).join(', ') || undefined
        }
      } catch { }

      const sig = `${loc.coords.latitude.toFixed(6)},${loc.coords.longitude.toFixed(6)}|${city || ''}`
      if (lastLocationSentRef.current === sig) return

      const response = await updateUserRef.current(currentIdToken, {
        profile: {
          location: {
            type: 'Point' as const,
            coordinates: [loc.coords.longitude, loc.coords.latitude],
            city,
          },
        },
      })

      if (response?.success && response?.data) {
        setDBUser(response.data)
      }
      lastLocationSentRef.current = sig
    } catch (e) {
      console.info('Home: background location sync failed:', e)
    }
  }, [setDBUser])

  // Background notification token sync — fully independent, own error handling
  const syncNotificationToken = useCallback(async () => {
    const currentIdToken = idTokenRef.current
    if (!currentIdToken) return

    try {
      const { status } = await Notifications.getPermissionsAsync()
      if (status !== 'granted') return

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('messages', {
          name: 'messages',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          showBadge: true,
        })
      }

      if (!Device.isDevice) {
        console.warn('Home: must use physical device for push notifications')
        return
      }

      const pushToken = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      })

      if (!pushToken?.data) return

      console.log('Home: [DEBUG] Expo push token:', pushToken.data)

      addNotificationToken(pushToken.data)

      if (lastPushTokenSentRef.current === pushToken.data) return

      const localTokens = getNotificationTokens()
      const currentDbUser = dbUserRef.current
      const dbTokens = Array.isArray(currentDbUser?.notificationTokens) ? currentDbUser!.notificationTokens : []
      const merged = Array.from(new Set([...dbTokens, ...localTokens, pushToken.data]))

      const response = await updateUserRef.current(currentIdToken, { notificationTokens: merged })
      if (response?.success && response?.data) {
        setDBUser(response.data)
      }
      lastPushTokenSentRef.current = pushToken.data
    } catch (e) {
      console.info('Home: background notification token sync failed:', e)
    }
  }, [addNotificationToken, getNotificationTokens, setDBUser])

  // Permission check only — no network calls, no API sync, can never false-positive
  const ensurePermissions = useCallback(async () => {
    if (isCheckingPermissionsRef.current) return
    isCheckingPermissionsRef.current = true
    setPermissionError(null)

    try {
      // 1) Location
      const locPerm = await Location.getForegroundPermissionsAsync()
      if (locPerm.status !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          setPermissionsChecked(false)
          setPermissionError('Location permission is required to continue. Please allow it.')
          return
        }
      }

      // 2) Notifications
      const notifPerm = await Notifications.getPermissionsAsync()
      if (notifPerm.status !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        if (status !== 'granted') {
          setPermissionsChecked(false)
          setPermissionError('Notification permission is required to continue. Please allow it.')
          return
        }
      }

      // 3) Microphone
      const micPerm = await getRecordingPermissionsAsync()
      if (micPerm.status !== 'granted') {
        const { status } = await requestRecordingPermissionsAsync()
        if (status !== 'granted') {
          setPermissionsChecked(false)
          setPermissionError('Microphone permission is required to continue. Please allow it.')
          return
        }
      }

      setPermissionsChecked(true)
      setPermissionError(null)
      userDismissedAlertRef.current = false
      lastPermissionStateRef.current = 'granted'
    } catch (error) {
      console.error('Home: error checking permissions:', error)
      setPermissionError('Could not request permissions. Please try again.')
      setPermissionsChecked(false)
    } finally {
      isCheckingPermissionsRef.current = false
    }
  }, [])

  // On mount: check permissions, then kick off background sync
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      await ensurePermissions()
      if (cancelled) return
      syncLocation()
      syncNotificationToken()
    }
    init()
    return () => { cancelled = true }
  }, [ensurePermissions, syncLocation, syncNotificationToken])

  // On each tab focus: always re-sync location & token; re-check permissions if revoked
  useFocusEffect(
    useCallback(() => {
      syncLocation()
      syncNotificationToken()
      if (!permissionsChecked && !isCheckingPermissionsRef.current) {
        ensurePermissions()
      }
    }, [syncLocation, syncNotificationToken, ensurePermissions, permissionsChecked])
  )

  // Show permission dialog when needed (does NOT depend on ensurePermissions ref)
  useEffect(() => {
    if (userDismissedAlertRef.current) return

    if (!permissionError) {
      if (permissionsChecked) {
        userDismissedAlertRef.current = false
        lastPermissionStateRef.current = 'granted'
      }
      return
    }

    const currentState = permissionError
    if (permissionDialogShownRef.current === currentState || lastPermissionStateRef.current === currentState) {
      return
    }

    permissionDialogShownRef.current = currentState
    lastPermissionStateRef.current = currentState

    const timer = setTimeout(() => {
      setPermissionDialogVisible(true)
    }, 250)

    return () => clearTimeout(timer)
  }, [permissionError, permissionsChecked])

  // Load stories when component mounts
  const loadStories = useCallback(async () => {
    if (!token) {
      setStoryLoading(false)
      return
    }

    try {
      setStoryLoading(true)
      const data = await storyAPI.getStories(token)

      // Handle new categorized structure
      if (data && typeof data === 'object' && !Array.isArray(data) && 'myStory' in data) {
        // New structure with categorized stories
        const categorizedStories = {
          myStory: data.myStory || null,
          friends: Array.isArray(data.friends) ? data.friends : [],
          discover: Array.isArray(data.discover) ? data.discover : []
        }

        // Ensure "Your Story" exists even if empty
        if (!categorizedStories.myStory && dbUser?.user_id) {
          categorizedStories.myStory = {
            id: dbUser.user_id,
            username: dbUser.displayName || `${dbUser.profile?.firstName || ''} ${dbUser.profile?.lastName || ''}`.trim() || 'You',
            avatar: dbUser.photoURL || dbUser.profile?.photos?.[0]?.url || '',
            stories: [],
            isMe: true
          }
        }

        setCategorizedStories(categorizedStories)
      } else if (Array.isArray(data)) {
        // Fallback to old structure (flat array)
        const storiesList: StoryItem[] = data
        const myStoryIndex = storiesList.findIndex(item => item.isMe)

        const currentUserId = dbUser?.user_id
        const currentUserName = dbUser?.displayName || `${dbUser?.profile?.firstName || ''} ${dbUser?.profile?.lastName || ''}`.trim() || 'You'
        const currentUserAvatar = dbUser?.photoURL || dbUser?.profile?.photos?.[0]?.url || ''

        if (myStoryIndex === -1 && currentUserId) {
          const myStory: StoryItem = {
            id: currentUserId,
            username: currentUserName,
            avatar: currentUserAvatar,
            stories: [],
            isMe: true
          }
          storiesList.unshift(myStory)
        }

        const myStory = storiesList.find(item => item.isMe) || (currentUserId ? {
          id: currentUserId,
          username: currentUserName,
          avatar: currentUserAvatar,
          stories: [],
          isMe: true
        } : null)

        const friends = storiesList.filter(item => !item.isMe)

        setCategorizedStories({
          myStory: myStory as StoryItem | null,
          friends: friends,
          discover: []
        })
      } else {
        console.warn('Unexpected data format from stories API:', data)
        setCategorizedStories({
          myStory: dbUser?.user_id ? {
            id: dbUser.user_id,
            username: dbUser.displayName || `${dbUser.profile?.firstName || ''} ${dbUser.profile?.lastName || ''}`.trim() || 'You',
            avatar: dbUser.photoURL || dbUser.profile?.photos?.[0]?.url || '',
            stories: [],
            isMe: true
          } : null,
          friends: [],
          discover: []
        })
      }
    } catch (error: any) {
      if (dbUser?.user_id) {
        const myStory: StoryItem = {
          id: dbUser.user_id,
          username: dbUser.displayName || `${dbUser.profile?.firstName || ''} ${dbUser.profile?.lastName || ''}`.trim() || 'You',
          avatar: dbUser.photoURL || dbUser.profile?.photos?.[0]?.url || '',
          stories: [],
          isMe: true
        }
        setCategorizedStories({
          myStory,
          friends: [],
          discover: []
        })
      } else {
        setCategorizedStories({
          myStory: null,
          friends: [],
          discover: []
        })
      }
    } finally {
      setStoryLoading(false)
    }
  }, [token, setCategorizedStories, setStoryLoading, dbUser])

  const onSwiped = async (item: RecommendedUser, action: SwipeAction) => {
    const nextConsumed = consumed + 1
    setConsumed(nextConsumed)
    const remaining = profiles.length - nextConsumed
    if (remaining <= 5) await loadMoreProfiles()
  }

  const onMatch = (match: any) => {
    router.push({
      pathname: '/matchingScreen',
      params: {
        matchData: JSON.stringify(match),
        matchedUser: JSON.stringify(match.matchedUser || match)
      }
    })
  }

  const onCardPress = (user: RecommendedUser) => {
    // Use _id from RecommendedUser type, with fallback to any user_id property that might exist
    const userId = (user as any).user_id || user._id
    if (!userId) {
      console.error('No user ID found in user object:', user)
      return
    }
    router.push({
      pathname: '/userProfile' as any,
      params: {
        userId: userId
      }
    })
  }

  const initializeProfiles = useCallback(async () => {
    if (!idToken) return
    setIsLoading(true)
    try {
      const recommendedUsers = await getRecommendedUsers(idToken as string, {
        maxDistance: 1000,
        limit: 10,
        offset: 0
      })
      const initial = recommendedUsers?.data || []
      setProfiles(initial)
      setConsumed(0)
      setDeckKey(k => k + 1) // reset deck to first card on full refresh
      profilesLoadedRef.current = true
    } catch (error) {
      console.error('Error initializing profiles:', error)
    } finally {
      setIsLoading(false)
    }
  }, [idToken, getRecommendedUsers])

  // Store initializeProfiles in ref to avoid dependency issues
  const initializeProfilesRef = useRef(initializeProfiles)
  initializeProfilesRef.current = initializeProfiles

  useEffect(() => {
    if (idToken) {
      initializeProfilesRef.current()
    }
  }, [idToken])

  useEffect(() => {
    // Load stories in background - don't wait for permissions
    if (token) {
      loadStories().catch((error) => {
        console.error('Error loading stories in background:', error)
      })
    }
  }, [token])

  const profilesLoadedRef = useRef(false)

  useFocusEffect(
    useCallback(() => {
      if (idToken && profiles.length === 0 && !isRefreshingRef.current && !profilesLoadedRef.current) {
        initializeProfilesRef.current()
        profilesLoadedRef.current = true
      }
    }, [idToken, profiles.length])
  )

  // Track when this tab first gained focus (helps avoid New Arch pause/resume loop when opening modals too soon)
  const tabFocusedAtRef = useRef<number | null>(null)

  // Check for active announcements when screen is focused
  useFocusEffect(
    useCallback(() => {
      let isMounted = true
      const focusTime = Date.now()
      if (tabFocusedAtRef.current === null) {
        tabFocusedAtRef.current = focusTime
      }

      const checkAnnouncement = async () => {
        const now = Date.now()

        if (now - lastAnnouncementCheckRef.current < 5000) {
          return
        }

        // Don't check for announcements for 30 seconds after showing one
        if (now - lastAnnouncementShownTimeRef.current < 30000) {
          return
        }

        // New Arch workaround: avoid opening fullScreenModal too soon after focus.
        // Bridgeless can enter an infinite onUserLeaveHint/onHostPause/onHostResume loop when a modal opens during unstable lifecycle.
        const minFocusedMs = 3000
        if (tabFocusedAtRef.current && now - tabFocusedAtRef.current < minFocusedMs) {
          return
        }

        lastAnnouncementCheckRef.current = now

        if (!token) {
          return
        }

        if (!dbUser?.profile?.isOnboarded) {
          return
        }

        // Safety check: Don't run announcement check on very first load
        // to avoid potential initialization race conditions
        if (!profilesLoadedRef.current) {
          return
        }

        try {
          const activeAnnouncement = await getActiveAnnouncementAPI(token)

          // Only proceed if component is still mounted
          if (!isMounted) {
            return
          }

          if (activeAnnouncement) {
            if (lastShownAnnouncementIdRef.current === activeAnnouncement._id) {
              return
            }

            lastShownAnnouncementIdRef.current = activeAnnouncement._id
            lastAnnouncementShownTimeRef.current = now

            setTimeout(() => {
              // Check again before navigation
              if (isMounted && router) {
                try {
                  router.push('/(home)/annoucements' as any)
                } catch (navError) {
                  console.error('Navigation error:', navError)
                }
              }
            }, 500)
          } else {
            lastShownAnnouncementIdRef.current = null
          }
        } catch (error: any) {
          // Silently catch errors - they're already handled in the API layer
          console.log('Announcement check error (handled gracefully):', error?.message || error)
        }
      }

      // Delay first check (3s to let activity lifecycle settle; was 1.5s — helps avoid New Arch pause/resume loop)
      const delayMs = 3000
      const timer = setTimeout(() => {
        checkAnnouncement()
      }, delayMs)

      return () => {
        isMounted = false
        clearTimeout(timer)
      }
    }, [token, dbUser, router])
  )

  const loadMoreProfiles = async () => {
    try {
      const recommendedUsers = await getRecommendedUsers(idToken as string, {
        maxDistance: 1000,
        limit: 100,
        offset: 0
      })

      if (recommendedUsers?.data && recommendedUsers?.data?.length > 0) {
        setProfiles(prevProfiles => {
          const combined = [...prevProfiles, ...recommendedUsers.data]
          const uniqueProfiles = combined.filter((profile, index, self) =>
            index === self.findIndex(p => p._id === profile._id)
          )
          return uniqueProfiles
        })
      }
    } catch (error) {
      console.error('Error loading more profiles:', error)
    }
  }

  const handleRefreshProfiles = async () => {
    setIsLoading(true)
    profilesLoadedRef.current = false // Reset flag to allow refresh
    await initializeProfiles()
  }

  function ChatIconWithBadge() {

    const totalUnreadCount = useMessagingStore((state) => state.totalUnreadCount)
    const backgroundColor = totalUnreadCount > 0 ? Colors.primaryBackgroundColor : 'transparent'

    return (
      <Pressable
        onPress={() => {
          router.push('/(home)/(tabs)/(chats)')
        }}
        style={{
          position: 'relative',
          backgroundColor: totalUnreadCount > 0 ? Colors.primaryBackgroundColor : 'transparent',
          borderRadius: 25,
          padding: 6,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center'
        }}>

        <Send
          size={16}
          color={totalUnreadCount > 0 ? Colors.light.background : Colors.primaryBackgroundColor}
        />

        {totalUnreadCount > 0 && (
          <View
            style={{
              position: 'absolute',
              top: -5,
              right: -11,
              backgroundColor: Colors.primaryBackgroundColor,
              borderRadius: 15,
              minWidth: 18,
              height: 18,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: 0.9,
              borderWidth: 1.5,
              borderColor: Colors.light.background,
            }}
          >
            <ThemedText
              style={{
                color: Colors.light.background,
                fontSize: 10,
                fontWeight: 'bold',
                lineHeight: 18,
                textAlignVertical: 'center',
                includeFontPadding: false,
              }}
            >
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </ThemedText>
          </View>
        )}
      </Pressable>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.parentBackgroundColor }}>
      <CustomDialog
        visible={permissionDialogVisible}
        type="warning"
        title="Permissions needed"
        message={permissionError || ''}
        onDismiss={() => {
          setPermissionDialogVisible(false)
          userDismissedAlertRef.current = true
          permissionDialogShownRef.current = null
        }}
        primaryButton={{
          text: 'Grant',
          onPress: () => {
            setPermissionDialogVisible(false)
            permissionDialogShownRef.current = null
            lastPermissionStateRef.current = null
            ensurePermissions()
          },
        }}
        secondaryButton={{
          text: 'Open Settings',
          onPress: () => {
            setPermissionDialogVisible(false)
            Linking.openSettings().catch(() => null)
            permissionDialogShownRef.current = null
            lastPermissionStateRef.current = null
          },
        }}
        cancelButton={{
          text: 'Not now',
          onPress: () => {
            setPermissionDialogVisible(false)
            userDismissedAlertRef.current = true
            permissionDialogShownRef.current = null
          },
        }}
      />
      <View style={{ flex: 1 }}>

        <View style={{
          paddingHorizontal: 20,
          paddingTop: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>

          <ThemedText type='title' style={{ color: Colors.primaryBackgroundColor }}>{t('home.discover')}</ThemedText>


          <View style={{ flexDirection: "row" }}>
            {/* <TouchableOpacity onPress={handleRefreshProfiles}>
              <Ionicons name="refresh-outline" size={24} color={Colors.primary.red} />
            </TouchableOpacity> */}
            {ChatIconWithBadge()}
          </View>

        </View>


        {isLoading && profiles.length === 0
          ?
          <CircularLoader message={"Scanning nearby users..."} />
          :
          <SwipeDeck key={deckKey} data={profiles} onSwiped={onSwiped} onMatch={onMatch} onCardPress={onCardPress} />
        }

      </View>
    </SafeAreaView>
  )
}