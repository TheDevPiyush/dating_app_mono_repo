import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Keyboard,
  ActivityIndicator,
} from 'react-native'
import { router, useLocalSearchParams, useNavigation } from 'expo-router'
import { Image } from 'expo-image'
import { ChevronLeft, Video, Phone, Lock, Play, Pause, Mic, Send, Square } from 'lucide-react-native'
import { useSocket, Message } from '@/hooks/useSocket'
import { messageAPI } from '@/APIs/messageAPIs'
import { useAuth } from '@/hooks/useAuth'
import { Colors } from '@/constants/Colors'
import { ThemedText } from '@/components/ThemedText'
import CustomLoader from '@/components/CustomLoader'
import CustomDialog, { DialogType } from '@/components/CustomDialog'
import ParsedText from 'react-native-parsed-text'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  RecordingPresets,
  createAudioPlayer,
  AudioModule,
} from 'expo-audio'
import type { AudioRecorder, AudioPlayer, AudioStatus } from 'expo-audio'
import * as FileSystem from 'expo-file-system/legacy'
import { requestPresignedURl, uploadTos3 } from '@/hooks/uploadTos3'
import { useCall } from '@/context/CallContext'

// ---------------------------------------------------------------------------
// Helpers (stable references — defined once outside the component)
// ---------------------------------------------------------------------------

const formatTime = (date: Date) =>
  new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

const formatDateHeader = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatDurationLabel = (totalSeconds: number) => {
  const s = Math.max(0, Math.floor(totalSeconds))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

const truncateName = (name: string, max = 17) =>
  name.length > max ? name.slice(0, max) + '...' : name

// ---------------------------------------------------------------------------
// Memoized bubble components — defined OUTSIDE ChatRoom so React never
// recreates them, which is the #1 FlatList perf killer.
// ---------------------------------------------------------------------------

interface TextBubbleProps {
  item: Message
  isMine: boolean
}

const TextBubble = React.memo(({ item, isMine }: TextBubbleProps) => (
  <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}>
    <ParsedText
      selectable
      style={[
        styles.messageText,
        isMine ? styles.myMessageText : styles.theirMessageText,
        { fontFamily: 'HellixMedium' },
      ]}
      parse={[
        {
          type: 'url',
          style: {
            color: isMine ? Colors.secondaryBackgroundColor : Colors.primaryBackgroundColor,
            textDecorationLine: 'underline',
            fontFamily: 'HellixSemiBold',
          },
          onPress: (url) => Linking.openURL(url),
        },
        { pattern: /\*(.*?)\*/g, style: { fontFamily: 'HellixBold' } },
        { pattern: /_(.*?)_/g, style: { fontFamily: 'HellixRegularItalic' } },
        {
          pattern: /`(.*?)`/g,
          style: {
            fontFamily: 'HellixSemiBold',
            backgroundColor: 'rgba(0,0,0,0.1)',
            borderRadius: 4,
            paddingHorizontal: 3,
            fontSize: 14,
          },
        },
        {
          pattern: /\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b/g,
          style: {
            color: isMine ? Colors.secondaryBackgroundColor : Colors.primaryBackgroundColor,
            textDecorationLine: 'underline',
            fontFamily: 'HellixSemiBold',
          },
          onPress: (url) => {
            const hasProtocol = url.startsWith('http://') || url.startsWith('https://')
            Linking.openURL(hasProtocol ? url : `https://${url}`)
          },
        },
      ]}
    >
      {item.text}
    </ParsedText>
    <ThemedText style={[styles.messageTime, isMine ? styles.myMessageTime : styles.theirMessageTime]}>
      {formatTime(item.createdAt)}
    </ThemedText>
  </View>
))

interface AudioBubbleProps {
  item: Message
  isMine: boolean
  isPlaying: boolean
  isActive: boolean
  playbackPosition: number
  playbackDuration: number
  onToggle: () => void
}

const AudioBubble = React.memo(
  ({ item, isMine, isPlaying, isActive, playbackPosition, playbackDuration, onToggle }: AudioBubbleProps) => {
    const totalDurationMs =
      isActive && playbackDuration > 0 ? playbackDuration : (item.audioDuration ?? 0) * 1000
    const progress = totalDurationMs > 0 ? Math.min(playbackPosition / totalDurationMs, 1) : 0

    return (
      <View
        style={[
          styles.messageBubble,
          isMine ? styles.myMessage : styles.theirMessage,
          { paddingVertical: 10, paddingHorizontal: 14 },
        ]}
      >
        <View style={styles.audioRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onToggle}
            style={[
              styles.audioPlayBtn,
              { backgroundColor: isMine ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)' },
            ]}
          >
            {isPlaying ? (
              <Pause
                size={18}
                color={isMine ? '#fff' : Colors.primaryBackgroundColor}
                strokeWidth={2}
                fill={isMine ? '#fff' : Colors.primaryBackgroundColor}
              />
            ) : (
              <Play
                size={18}
                color={isMine ? '#fff' : Colors.primaryBackgroundColor}
                strokeWidth={2}
                fill={isMine ? '#fff' : Colors.primaryBackgroundColor}
              />
            )}
          </TouchableOpacity>

          <View style={styles.audioProgressContainer}>
            <View
              style={[
                styles.audioProgressLine,
                { backgroundColor: isMine ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.15)' },
              ]}
            />
            <View
              style={[
                styles.audioProgressIndicator,
                {
                  backgroundColor: isMine ? '#fff' : Colors.primaryBackgroundColor,
                  left: `${progress * 100}%` as any,
                },
              ]}
            />
          </View>

          <ThemedText
            style={[styles.audioDuration, isMine ? styles.myMessageTime : styles.theirMessageTime]}
          >
            {formatDurationLabel(Math.max(0, Math.floor(totalDurationMs / 1000)))}
          </ThemedText>
        </View>

        <ThemedText
          style={[styles.messageTime, isMine ? styles.myMessageTime : styles.theirMessageTime]}
        >
          {formatTime(item.createdAt)}
        </ThemedText>
      </View>
    )
  }
)

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ChatRoom() {
  const params = useLocalSearchParams()
  const { dbUser, token } = useAuth()
  const {
    isConnected,
    checkCallReady,
    joinMatch,
    leaveMatch,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,
    onNewMessage,
    onUserTyping,
    onUserStoppedTyping,
  } = useSocket()

  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isAtBottom, setIsAtBottom] = useState(true)

  const flatListRef = useRef<FlatList>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Recording state
  const [recording, setRecording] = useState<AudioRecorder | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDurationSeconds, setRecordingDurationSeconds] = useState(0)
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const recordingDurationRef = useRef(0)
  const [uploadingAudio, setUploadingAudio] = useState(false)

  // Playback state
  const soundRef = useRef<AudioPlayer | null>(null)
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null)
  const [isSoundPlaying, setIsSoundPlaying] = useState(false)
  const [playbackPosition, setPlaybackPosition] = useState(0)
  const [playbackDuration, setPlaybackDuration] = useState(0)

  const navigation = useNavigation()
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false)
  const { makeCall, makeVideoCall } = useCall()

  const matchId = params.matchId as string
  const userName = params.userName as string
  const userAvatar = params.userAvatar as string
  const otherUserId = params.userId as string
  const insets = useSafeAreaInsets()

  const isPremium =
    dbUser?.subscription?.status === 'active' &&
    (dbUser?.subscription?.plan === 'premium' ||
      dbUser?.subscription?.plan === 'super' ||
      dbUser?.subscription?.plan === 'basic')

  const [imageError, setImageError] = useState(false)
  const [dialogVisible, setDialogVisible] = useState(false)
  const [dialogConfig, setDialogConfig] = useState<{ type: DialogType; title: string; message: string }>({
    type: 'error',
    title: '',
    message: '',
  })

  const showDialog = useCallback((type: DialogType, title: string, message: string) => {
    setDialogConfig({ type, title, message })
    setDialogVisible(true)
  }, [])

  const showPremiumDialog = useCallback(() => {
    setDialogConfig({
      type: 'warning',
      title: 'Premium Required',
      message:
        'Voice and video calling requires a premium subscription. Upgrade now to unlock unlimited calls and other premium features!',
    })
    setDialogVisible(true)
  }, [])

  // ---------------------------------------------------------------------------
  // Header
  // ---------------------------------------------------------------------------

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: '',
      headerLeft: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 4 }}>
            <ChevronLeft size={28} color="#000" strokeWidth={2} />
          </TouchableOpacity>
          {userAvatar && userAvatar.length > 0 && !imageError ? (
            <Image
              source={{ uri: userAvatar }}
              style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12 }}
              contentFit="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                marginRight: 12,
                backgroundColor: '#e1e1e1',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ThemedText style={{ fontSize: 16, fontWeight: '600', color: '#666' }}>
                {userName.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          )}
          <View>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/(home)/userProfile',
                  params: { userId: otherUserId },
                } as any)
              }
            >
              <ThemedText numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: 14, color: '#000' }}>
                {truncateName(userName)}
              </ThemedText>
              {isTyping && (
                <ThemedText style={{ fontSize: 12, color: '#FF3B30', fontStyle: 'italic' }}>
                  typing...
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ),
      headerRight: () => {
        const canCall = dbUser?.user_id && otherUserId && isConnected && isOtherUserOnline
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => {
                if (!dbUser?.user_id || !otherUserId) return
                if (!isPremium) {
                  showDialog('warning', 'Premium Required', 'Video calling requires a premium subscription. Please upgrade to make calls.')
                  return
                }
                if (!isConnected) {
                  showDialog('info', 'Connecting...', 'Please wait while we are connecting to the recipient!')
                  return
                }
                if (!isOtherUserOnline) {
                  showDialog('warning', 'Call unavailable', 'You can only call when the recipient is online on Pookiey!')
                  return
                }
                makeVideoCall(matchId, otherUserId, otherUserId)
              }}
              style={{ padding: 8 }}
            >
              <Video size={22} color={canCall ? '#FF3B30' : '#B0B0B0'} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (!dbUser?.user_id || !otherUserId) return
                if (!isPremium) { showPremiumDialog(); return }
                if (!isConnected) {
                  showDialog('info', 'Connecting...', 'Please wait while we are connecting to the recipient!')
                  return
                }
                if (!isOtherUserOnline) {
                  showDialog('warning', 'Call unavailable', 'You can only call when the recipient is online on Pookiey!')
                  return
                }
                makeCall(matchId, otherUserId, otherUserId)
              }}
              style={{ padding: 8 }}
            >
              <Phone size={18} color={canCall ? '#FF3B30' : '#B0B0B0'} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )
      },
      headerStyle: { backgroundColor: Colors.parentBackgroundColor },
    })

    navigation.getParent()?.setOptions?.({ tabBarStyle: { display: 'none' } })

    return () => {
      navigation.getParent()?.setOptions?.({
        tabBarStyle: { display: 'flex', backgroundColor: Colors.parentBackgroundColor },
      })
    }
  }, [
    navigation,
    userName,
    userAvatar,
    isTyping,
    dbUser?.user_id,
    otherUserId,
    matchId,
    makeCall,
    makeVideoCall,
    isConnected,
    isOtherUserOnline,
    isPremium,
    imageError,
    showDialog,
    showPremiumDialog,
  ])

  // ---------------------------------------------------------------------------
  // Load messages
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        if (token && dbUser?.user_id) {
          const data = await messageAPI.getMessages(token, { matchId })
          setMessages(data)
          markAsRead(matchId)
        }
      } catch (error) {
        console.error('Error loading messages:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [matchId])

  // ---------------------------------------------------------------------------
  // Socket: join / leave match
  // ---------------------------------------------------------------------------

  const hasJoinedRef = useRef(false)
  useEffect(() => {
    if (matchId && isConnected && !hasJoinedRef.current) {
      joinMatch(matchId)
      hasJoinedRef.current = true
    }
    return () => {
      if (matchId && hasJoinedRef.current) {
        leaveMatch(matchId)
        hasJoinedRef.current = false
      }
    }
  }, [matchId, isConnected, joinMatch, leaveMatch])

  // ---------------------------------------------------------------------------
  // Online status polling
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false
    let interval: ReturnType<typeof setInterval> | undefined

    const refresh = async () => {
      if (!matchId || !otherUserId || !isConnected || cancelled) {
        if (!cancelled) setIsOtherUserOnline(false)
        return
      }
      try {
        const online = await checkCallReady(matchId, otherUserId)
        if (!cancelled) setIsOtherUserOnline(online)
      } catch {
        if (!cancelled) setIsOtherUserOnline(false)
      }
    }

    const t = setTimeout(refresh, 500)
    interval = setInterval(refresh, 8000)
    return () => {
      cancelled = true
      clearTimeout(t)
      if (interval) clearInterval(interval)
    }
  }, [matchId, otherUserId, isConnected, checkCallReady])

  // ---------------------------------------------------------------------------
  // Socket: new messages
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const cleanup = onNewMessage((message: Message) => {
      if (message.matchId !== matchId) return
      setMessages((prev) => {
        const exists = prev.some(
          (m) =>
            m._id === message._id ||
            (m._id === undefined &&
              m.text === message.text &&
              m.senderId === message.senderId &&
              Math.abs(new Date(m.createdAt).getTime() - new Date(message.createdAt).getTime()) < 1000)
        )
        return exists ? prev : [...prev, message]
      })
      if (message.senderId !== dbUser?.user_id) markAsRead(matchId)
      // Only auto-scroll if the user is already at the bottom
      setIsAtBottom((atBottom) => {
        if (atBottom) {
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
        }
        return atBottom
      })
    })
    return cleanup
  }, [matchId, dbUser?.user_id, markAsRead, onNewMessage])

  // ---------------------------------------------------------------------------
  // Typing indicators
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const cleanupTyping = onUserTyping((data) => {
      if (data.userId === otherUserId) setIsTyping(true)
    })
    const cleanupStopped = onUserStoppedTyping((data) => {
      if (data.userId === otherUserId) setIsTyping(false)
    })
    return () => { cleanupTyping(); cleanupStopped() }
  }, [otherUserId, onUserTyping, onUserStoppedTyping])

  // ---------------------------------------------------------------------------
  // Keyboard listeners
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setIsKeyboardVisible(true)
      setKeyboardHeight(e.endCoordinates.height)
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    })
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false)
      setKeyboardHeight(0)
    })
    return () => { showSub.remove(); hideSub.remove() }
  }, [])

  // ---------------------------------------------------------------------------
  // Cleanup audio on unmount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current)
      soundRef.current?.remove()
      soundRef.current = null
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Send text
  // ---------------------------------------------------------------------------

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return
    sendMessage({ matchId, text: inputText.trim(), type: 'text' as const })
    setInputText('')
    stopTyping(matchId)
  }, [inputText, matchId, sendMessage, stopTyping])

  const handleTyping = useCallback(
    (text: string) => {
      setInputText(text)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      if (text.length > 0) {
        startTyping(matchId)
        typingTimeoutRef.current = setTimeout(() => stopTyping(matchId), 1000)
      } else {
        stopTyping(matchId)
      }
    },
    [matchId, startTyping, stopTyping]
  )

  // ---------------------------------------------------------------------------
  // Voice notes
  // ---------------------------------------------------------------------------

  const handleSendVoiceNote = useCallback(
    async (localUri: string, durationSeconds: number) => {
      try {
        setUploadingAudio(true)
        const mimeType = 'audio/m4a'
        const presignedUrls = await requestPresignedURl([mimeType])
        if (!Array.isArray(presignedUrls) || presignedUrls.length === 0) throw new Error('Failed to obtain upload URL')
        const { uploadUrl, fileURL } = presignedUrls[0]
        const uploaded = await uploadTos3(localUri, uploadUrl, mimeType)
        if (!uploaded) throw new Error('Upload failed')
        await FileSystem.deleteAsync(localUri, { idempotent: true })
        sendMessage({ matchId, text: '[Voice note]', type: 'audio', mediaUrl: fileURL, audioDuration: durationSeconds })
        stopTyping(matchId)
      } catch (error) {
        console.error('Error sending voice note:', error)
        showDialog('error', 'Upload failed', 'We could not send your voice note. Please try again.')
      } finally {
        await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => { })
        setUploadingAudio(false)
      }
    },
    [matchId, sendMessage, stopTyping, showDialog]
  )

  const finalizeRecording = useCallback(
    async (shouldSend: boolean) => {
      if (!recording) return
      const durationSeconds = Math.max(1, recordingDurationRef.current)
      let uri: string | null = null
      try {
        await recording.stop()
        const status = recording.getStatus()
        uri = status.url ?? recording.uri
      } catch (error) {
        console.error('Error stopping recording:', error)
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = undefined
      }
      setRecording(null)
      setIsRecording(false)
      setRecordingDurationSeconds(0)
      recordingDurationRef.current = 0
      try {
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false })
      } catch (error) {
        console.error('Error resetting audio mode:', error)
      }
      if (!uri) {
        if (shouldSend) showDialog('error', 'Voice note error', 'We could not access the recorded file.')
        return
      }
      if (shouldSend) await handleSendVoiceNote(uri, durationSeconds)
      else await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => { })
    },
    [recording, handleSendVoiceNote, showDialog]
  )

  const startRecordingVoiceNote = useCallback(async () => {
    try {
      const permission = await requestRecordingPermissionsAsync()
      if (!permission.granted) {
        showDialog('warning', 'Microphone access needed', 'Please enable microphone access in your device settings to send voice notes.')
        return
      }
      if (soundRef.current) {
        soundRef.current.remove()
        soundRef.current = null
        setPlayingMessageId(null)
        setIsSoundPlaying(false)
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'doNotMix',
        interruptionModeAndroid: 'duckOthers',
        shouldRouteThroughEarpiece: false,
      })
      const recordingObject = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY)
      await recordingObject.prepareToRecordAsync()
      recordingObject.record()
      setRecording(recordingObject)
      setIsRecording(true)
      recordingDurationRef.current = 0
      setRecordingDurationSeconds(0)
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = setInterval(() => {
        try {
          const status = recordingObject.getStatus()
          if (status.isRecording && typeof status.durationMillis === 'number') {
            const seconds = Math.floor(status.durationMillis / 1000)
            recordingDurationRef.current = seconds
            setRecordingDurationSeconds(seconds)
          }
        } catch (error) {
          console.error('Error updating recording status:', error)
        }
      }, 250)
    } catch (error) {
      console.error('Error starting recording:', error)
      setRecording(null)
      setIsRecording(false)
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => { })
      const msg = error instanceof Error ? error.message : 'Unable to start recording. Please try again.'
      showDialog('error', 'Recording error', msg.includes('Session activation failed') ? 'Another app is using the microphone or audio sources.' : 'Unable to start recording. Please try again.')
    }
  }, [showDialog])

  const handleStopRecording = useCallback(() => {
    finalizeRecording(true).catch((e) => console.error('Error finalizing recording:', e))
  }, [finalizeRecording])

  const handleCancelRecording = useCallback(() => {
    finalizeRecording(false).catch((e) => console.error('Error cancelling recording:', e))
  }, [finalizeRecording])

  // ---------------------------------------------------------------------------
  // Playback
  // ---------------------------------------------------------------------------

  const togglePlayback = useCallback(
    async (message: Message) => {
      if (!message.mediaUrl) return
      try {
        if (playingMessageId === message._id && soundRef.current) {
          const player = soundRef.current
          if (player.isLoaded) {
            if (player.playing) { player.pause(); setIsSoundPlaying(false) }
            else { player.play(); setIsSoundPlaying(true) }
          }
          return
        }
        if (soundRef.current) { soundRef.current.remove(); soundRef.current = null }
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false })
        const player = createAudioPlayer({ uri: message.mediaUrl }, { updateInterval: 250 })
        soundRef.current = player
        setPlayingMessageId(message._id)
        setPlaybackPosition(0)
        setPlaybackDuration((message.audioDuration ?? 0) * 1000)
        setIsSoundPlaying(true)
        player.play()
        const sub = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
          if (!status.isLoaded) return
          setIsSoundPlaying(status.playing ?? false)
          const durationMs = typeof status.duration === 'number' && status.duration > 0
            ? status.duration * 1000
            : (message.audioDuration ?? 0) * 1000
          const positionMs = (status.currentTime ?? 0) * 1000
          setPlaybackPosition(positionMs)
          setPlaybackDuration(durationMs)
          if (status.didJustFinish) {
            sub.remove()
            setPlayingMessageId(null)
            setPlaybackPosition(0)
            setIsSoundPlaying(false)
            setPlaybackDuration((message.audioDuration ?? 0) * 1000)
            soundRef.current = null
            player.remove()
          }
        })
      } catch (error) {
        console.error('Error playing voice note:', error)
        showDialog('error', 'Playback error', 'Unable to play this voice note.')
      }
    },
    [playingMessageId, showDialog]
  )

  // ---------------------------------------------------------------------------
  // Grouped messages — memoized so it doesn't recompute on every keystroke
  // ---------------------------------------------------------------------------

  const groupedMessages = useMemo(() => {
    const result: any[] = []
    let lastDate = ''
    let dividerIndex = 0
    messages.forEach((msg) => {
      const msgDate = formatDateHeader(msg.createdAt)
      if (msgDate !== lastDate) {
        result.push({ type: 'date', id: `date-${dividerIndex}-${msgDate}`, date: msgDate })
        lastDate = msgDate
        dividerIndex++
      }
      result.push(msg)
    })
    return result
  }, [messages])

  // ---------------------------------------------------------------------------
  // renderItem — memoized so FlatList doesn't blow up
  // ---------------------------------------------------------------------------

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      if (item.type === 'date') {
        return (
          <View style={styles.dateContainer}>
            <ThemedText style={styles.dateText}>{item.date}</ThemedText>
          </View>
        )
      }

      const isMine = item.senderId === dbUser?.user_id

      if (item.type === 'audio') {
        return (
          <AudioBubble
            item={item}
            isMine={isMine}
            isPlaying={playingMessageId === item._id && isSoundPlaying}
            isActive={playingMessageId === item._id}
            playbackPosition={playingMessageId === item._id ? playbackPosition : 0}
            playbackDuration={playingMessageId === item._id ? playbackDuration : (item.audioDuration ?? 0) * 1000}
            onToggle={() => togglePlayback(item)}
          />
        )
      }

      return <TextBubble item={item} isMine={isMine} />
    },
    [dbUser?.user_id, playingMessageId, isSoundPlaying, playbackPosition, playbackDuration, togglePlayback]
  )

  const keyExtractor = useCallback((item: any, index: number) => {
    if (item.type === 'date') return item.id || `date-${index}`
    return item._id || `message-${index}`
  }, [])

  const handleScroll = useCallback((e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent
    setIsAtBottom(layoutMeasurement.height + contentOffset.y >= contentSize.height - 40)
  }, [])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primaryBackgroundColor} />
        <ThemedText type="default">Loading messages...</ThemedText>
      </View>
    )
  }

  return (
    <>
      <CustomDialog
        visible={dialogVisible}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        onDismiss={() => setDialogVisible(false)}
        primaryButton={
          dialogConfig.title === 'Premium Required'
            ? { text: 'Buy Premium', onPress: () => { setDialogVisible(false); router.push('/(home)/subscriptionScreenHome') } }
            : { text: 'OK', onPress: () => setDialogVisible(false) }
        }
        secondaryButton={
          dialogConfig.title === 'Premium Required'
            ? { text: 'Not Now', onPress: () => setDialogVisible(false) }
            : undefined
        }
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 1 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={groupedMessages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.messagesList}
          // Perf props
          windowSize={10}
          maxToRenderPerBatch={10}
          initialNumToRender={20}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={50}
          scrollEventThrottle={200}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onScroll={handleScroll}
          onScrollToIndexFailed={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>
                Start your conversation with {userName}
              </ThemedText>
            </View>
          }
        />

        {isRecording && (
          <View style={styles.recordingIndicator}>
            <Mic size={18} color="#FF3B30" strokeWidth={2} style={{ marginRight: 8 }} />
            <ThemedText style={styles.recordingText}>Recording</ThemedText>
            <ThemedText style={styles.recordingTimer}>{formatDurationLabel(recordingDurationSeconds)}</ThemedText>
            <TouchableOpacity style={styles.cancelRecordingButton} onPress={handleCancelRecording}>
              <ThemedText style={styles.cancelRecordingText}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        <View
          style={[
            styles.inputContainer,
            {
              paddingBottom:
                Platform.OS === 'ios'
                  ? insets.bottom
                  : insets.bottom + (isKeyboardVisible ? keyboardHeight : 0) + 6,
            },
          ]}
        >
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={handleTyping}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
            editable={!isRecording && !uploadingAudio}
          />
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.micButton, uploadingAudio && styles.micButtonDisabled]}
              onPress={isRecording ? handleStopRecording : startRecordingVoiceNote}
              disabled={uploadingAudio}
            >
              {isRecording ? (
                <Square size={18} color="#FF3B30" strokeWidth={2} fill="#FF3B30" />
              ) : (
                <Mic size={18} color="#FF3B30" strokeWidth={2} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || uploadingAudio) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim() || uploadingAudio}
            >
              {uploadingAudio ? (
                <ActivityIndicator size="small" color="#FF3B30" />
              ) : (
                <Send size={18} color={inputText.trim() ? '#FF3B30' : '#ccc'} strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.parentBackgroundColor },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.parentBackgroundColor },
  messagesList: { padding: 16, flexGrow: 1 },
  dateContainer: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginVertical: 8,
  },
  dateText: { fontSize: 13, color: '#444', fontFamily: 'HellixMedium' },
  messageBubble: { maxWidth: '75%', padding: 12, borderRadius: 25, marginBottom: 8 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: Colors.primaryBackgroundColor, borderBottomRightRadius: 0 },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: Colors.secondaryBackgroundColor, borderTopLeftRadius: 0 },
  messageText: { fontSize: 13, lineHeight: 20 },
  myMessageText: { color: '#fff' },
  theirMessageText: { color: '#000' },
  messageTime: { fontSize: 11, marginTop: 4 },
  myMessageTime: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  theirMessageTime: { color: '#999' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, color: '#999', textAlign: 'center' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, backgroundColor: '#fff' },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFE9E7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  recordingText: { fontSize: 14, color: '#FF3B30', fontFamily: 'HellixMedium', marginRight: 8 },
  recordingTimer: { fontSize: 14, color: '#FF3B30', fontFamily: 'HellixSemiBold', marginRight: 16 },
  cancelRecordingButton: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: '#fff' },
  cancelRecordingText: { fontSize: 13, color: '#555', fontFamily: 'HellixMedium' },
  actionsContainer: { flexDirection: 'row', alignItems: 'center' },
  micButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  micButtonDisabled: { opacity: 0.5 },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 13,
    marginRight: 8,
  },
  sendButton: { width: 33, height: 33, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { opacity: 0.5 },
  audioRow: { flexDirection: 'row', alignItems: 'center' },
  audioPlayBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  audioProgressContainer: { flex: 1, height: 20, justifyContent: 'center', position: 'relative' },
  audioProgressLine: { position: 'absolute', top: '50%', left: 0, right: 0, height: 2, borderRadius: 2, transform: [{ translateY: -1 }] },
  audioProgressIndicator: {
    position: 'absolute',
    top: '50%',
    width: 10,
    height: 10,
    borderRadius: 5,
    transform: [{ translateY: -5 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  audioDuration: { fontSize: 12, marginLeft: 8, width: 50, textAlign: 'right' },
})