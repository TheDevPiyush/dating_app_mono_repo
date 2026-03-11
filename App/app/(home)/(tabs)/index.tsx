
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { View, Linking, Platform, TouchableOpacity, Animated, Easing, StyleSheet } from 'react-native'
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
import Ionicons from '@expo/vector-icons/build/Ionicons'
import CustomDialog, { DialogType } from '@/components/CustomDialog'
import { getActiveAnnouncementAPI } from '@/APIs/announcementAPIs'
import { useAuth } from '@/hooks/useAuth'
import CircularLoader from '@/components/CircularLoader'
import { supabase } from '@/config/supabaseConfig'

export default function index() {
  const { t } = useTranslation();
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

  // const getToken = async () => {
  //   const { data } = await supabase.auth.getSession()
  //   console.log(data.session?.access_token)
  // };
  // useEffect(() => {
  //   // console.log("hello")
  //   getToken();
  // }, [profiles])

  const updateLocationInApi = useCallback(
    async (coords: { latitude: number; longitude: number }, city?: string) => {
      if (!idToken) return

      const signature = `${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}|${city || ''}`
      if (lastLocationSentRef.current === signature) return

      try {
        const response = await updateUser(idToken as string, {
          profile: {
            location: {
              type: 'Point' as const,
              coordinates: [coords.longitude, coords.latitude],
              city,
            },
          },
        })

        if (response?.success && response?.data) {
          setDBUser(response.data)
        }

        lastLocationSentRef.current = signature
      } catch (e) {
        console.info('Home: failed to update location in API:', e)
      }
    },
    [idToken, setDBUser, updateUser],
  )

  const updateNotificationTokenInApi = useCallback(
    async (pushToken: string) => {
      if (!idToken) return
      if (!pushToken) return
      if (lastPushTokenSentRef.current === pushToken) return

      try {
        const localTokens = getNotificationTokens()
        const dbTokens = Array.isArray(dbUser?.notificationTokens) ? dbUser!.notificationTokens : []
        const merged = Array.from(new Set([...dbTokens, ...localTokens, pushToken]))

        const response = await updateUser(idToken as string, { notificationTokens: merged })
        if (response?.success && response?.data) {
          setDBUser(response.data)
        }

        lastPushTokenSentRef.current = pushToken
      } catch (e) {
        console.info('Home: failed to update notification token in API:', e)
      }
    },
    [dbUser, getNotificationTokens, idToken, setDBUser, updateUser],
  )

  const ensurePermissions = useCallback(async () => {
    if (isCheckingPermissionsRef.current) return
    isCheckingPermissionsRef.current = true
    setPermissionError(null)

    try {
      // 1) Location permission + update location via API
      const currentLocationPerm = await Location.getForegroundPermissionsAsync()
      const locationStatus =
        currentLocationPerm.status === 'granted'
          ? currentLocationPerm.status
          : (await Location.requestForegroundPermissionsAsync()).status

      if (locationStatus !== 'granted') {
        setPermissionsChecked(false)
        setPermissionError('Location permission is required to continue. Please allow it.')
        return
      }

      try {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })

        let city: string | undefined
        try {
          const reverse = await Location.reverseGeocodeAsync({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          })
          if (reverse?.length) {
            const a = reverse[0]
            const addressParts = [a.city, a.region, a.country].filter(Boolean)
            city = addressParts.join(', ') || undefined
          }
        } catch (e) {
        }

        await updateLocationInApi(
          {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          },
          city,
        )
      } catch (e) {
      }

      // 2) Notifications permission + update token via API
      const currentNotifPerm = await Notifications.getPermissionsAsync()
      const notifStatus =
        currentNotifPerm.status === 'granted'
          ? currentNotifPerm.status
          : (await Notifications.requestPermissionsAsync()).status

      if (notifStatus !== 'granted') {
        setPermissionsChecked(false)
        setPermissionError('Notification permission is required to continue. Please allow it.')
        return
      }

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      })

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

      if (Device.isDevice) {
        const pushToken = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
        })
        if (pushToken?.data) {
          addNotificationToken(pushToken.data)
          await updateNotificationTokenInApi(pushToken.data)
        }
      } else {
        console.warn('Home: must use physical device for push notifications token')
      }

      // 3) Microphone permission (no API call)
      const currentMicPerm = await getRecordingPermissionsAsync()
      const micStatus =
        currentMicPerm.status === 'granted'
          ? currentMicPerm.status
          : (await requestRecordingPermissionsAsync()).status

      if (micStatus !== 'granted') {
        setPermissionsChecked(false)
        setPermissionError('Microphone permission is required to continue. Please allow it.')
        return
      }

      setPermissionsChecked(true)
      setPermissionError(null) // Clear any previous errors
      // Reset dismissed flag when permissions are successfully granted
      userDismissedAlertRef.current = false
      lastPermissionStateRef.current = 'granted'
    } catch (error) {
      // console.error('Home: error ensuring permissions:', error)
      setPermissionError('Could not request permissions. Please try again.')
      setPermissionsChecked(false)
    } finally {
      isCheckingPermissionsRef.current = false
    }
  }, [addNotificationToken, updateLocationInApi, updateNotificationTokenInApi])

  // Ask permissions directly (no routing)
  useEffect(() => {
    ensurePermissions()
  }, [ensurePermissions])

  // Show a quick dialog if permissions are missing, but DO NOT block the swipe deck UI.
  useEffect(() => {
    // Don't show alert if user dismissed it with "Not now"
    if (userDismissedAlertRef.current) return

    // Only show alert if there's an actual permission error (not just initial loading state)
    if (!permissionError) {
      // If permissions are checked and granted, reset the dismissed flag for next time
      if (permissionsChecked) {
        userDismissedAlertRef.current = false
        lastPermissionStateRef.current = 'granted'
      }
      return
    }

    // Avoid spamming the same dialog repeatedly
    const currentState = permissionError
    if (permissionDialogShownRef.current === currentState || lastPermissionStateRef.current === currentState) {
      return
    }

    permissionDialogShownRef.current = currentState
    lastPermissionStateRef.current = currentState

    // Delay slightly so we don't show a dialog during initial render/layout
    const t = setTimeout(() => {
      setPermissionDialogVisible(true)
    }, 250)

    return () => clearTimeout(t)
  }, [permissionError, permissionsChecked, ensurePermissions])

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
        const storiesList: StoryItem[] = data;
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
        console.warn('Unexpected data format from stories API:', data);
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
        });
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
    const userId = (user as any).user_id || user._id;
    if (!userId) {
      console.error('No user ID found in user object:', user);
      return;
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

  useFocusEffect(
    useCallback(() => {
      if (!permissionsChecked && !isCheckingPermissionsRef.current) {
        ensurePermissions()
      }
    }, [ensurePermissions, permissionsChecked])
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

          <TouchableOpacity onPress={()=>{router.push("/subscriptionScreen")}}>
            <Ionicons name="refresh-outline" size={24} color={Colors.primary.red} />
          </TouchableOpacity>
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