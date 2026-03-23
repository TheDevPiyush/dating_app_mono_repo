import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Pressable, Animated, PanResponder } from 'react-native';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { RTCView, MediaStream } from 'react-native-webrtc';
import { CallSwipeControl } from './CallSwipeControl';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '@/store/authStore';

interface VideoCallUIProps {
  visible: boolean;
  isIncoming: boolean;
  isConnected: boolean;
  isRinging: boolean;
  isConnecting?: boolean;
  userName?: string;
  userAvatar?: string;
  isMuted?: boolean;
  isVideoEnabled?: boolean;
  onToggleMute?: () => void;
  onToggleVideo?: () => void;
  onFlipCamera?: () => void;
  onAnswer?: () => void;
  onReject?: () => void;
  onEnd?: () => void;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  videoTracks?: Map<string, any>;
  isExploreCall?: boolean;
  remainingBalance?: number | null;
}

export const VideoCallUI: React.FC<VideoCallUIProps> = ({
  visible,
  isIncoming,
  isConnected,
  isRinging,
  isConnecting = false,
  userName = 'User',
  userAvatar,
  isMuted = false,
  isVideoEnabled = true,
  onToggleMute,
  onToggleVideo,
  onFlipCamera,
  onAnswer,
  onReject,
  onEnd,
  localStream,
  remoteStream,
  videoTracks = new Map(),
  isExploreCall = false,
  remainingBalance = null,
}) => {
  const { dbUser } = useAuthStore();
  const [showControls, setShowControls] = useState(true);
  const [callSeconds, setCallSeconds] = useState(0);
  const callStartRef = useRef<number | null>(null);
  const swipeY = useRef(new Animated.Value(0)).current;
  const chevronPulse = useRef(new Animated.Value(0)).current;
  const isIncomingPreConnect = !isConnected && (isIncoming || (!!onAnswer && isRinging));
  const isOutgoingPreConnect = !isConnected && !isIncomingPreConnect;
  const localName =
    `${dbUser?.profile?.firstName || ''} ${dbUser?.profile?.lastName || ''}`.trim() ||
    dbUser?.displayName ||
    'You';
  const localAvatar = dbUser?.photoURL || undefined;

  const statusText = isConnected
    ? 'Connected'
    : isConnecting
      ? 'Connecting call...'
      : isRinging
        ? isIncoming
          ? 'Incoming video call...'
          : 'Ringing...'
        : 'Connecting...';

  const showVideoViews = isConnected || isRinging === false;

  useEffect(() => {
    if (isConnected) {
      if (!callStartRef.current) {
        callStartRef.current = Date.now();
      }
      const timer = setInterval(() => {
        const start = callStartRef.current ?? Date.now();
        setCallSeconds(Math.floor((Date.now() - start) / 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
    callStartRef.current = null;
    setCallSeconds(0);
  }, [isConnected]);

  useEffect(() => {
    if (!isConnected) {
      setShowControls(true);
    }
  }, [isConnected]);

  useEffect(() => {
    if (!isOutgoingPreConnect) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(chevronPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(chevronPulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [chevronPulse, isOutgoingPreConnect]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => isOutgoingPreConnect,
        onMoveShouldSetPanResponder: (_, g) => isOutgoingPreConnect && g.dy > 4,
        onPanResponderMove: (_, g) => {
          swipeY.setValue(Math.max(0, g.dy));
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > 90) {
            onEnd?.();
            swipeY.setValue(0);
            return;
          }
          Animated.spring(swipeY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        },
      }),
    [isOutgoingPreConnect, onEnd, swipeY],
  );

  const callTimerText = useMemo(() => {
    const minutes = Math.floor(callSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (callSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [callSeconds]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (isIncomingPreConnect) {
          onReject?.();
        } else {
          onEnd?.();
        }
      }}
    >
      <LinearGradient
        colors={['#070B14', '#0B1220', '#17162A', '#2B1230', '#4A1737', '#7A1F3D']}
        locations={[0, 0.22, 0.42, 0.62, 0.82, 1]}
        style={styles.container}
      >
        <View style={styles.content}>
          {isOutgoingPreConnect ? (
            <View style={styles.outgoingContainer}>
              <View style={styles.partyBlock}>
                <View style={styles.outgoingAvatarCircle}>
                  {userAvatar ? (
                    <Image source={{ uri: userAvatar }} style={styles.outgoingAvatarImage} contentFit="cover" />
                  ) : (
                    <ThemedText style={styles.avatarText}>
                      {userName?.trim()?.charAt(0)?.toUpperCase() || 'U'}
                    </ThemedText>
                  )}
                </View>
                <ThemedText type="defaultSemiBold" style={styles.outgoingName}>
                  {userName}
                </ThemedText>
                <ThemedText style={styles.outgoingStatus}>{statusText}</ThemedText>
              </View>

              <View style={styles.swipeCenter}>
                <Animated.View
                  style={[
                    styles.chevrons,
                    {
                      opacity: chevronPulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }),
                      transform: [{ translateY: chevronPulse.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }) }],
                    },
                  ]}
                >
                  <Ionicons name="chevron-down" size={24} color="rgba(255,255,255,0.25)" />
                  <Ionicons name="chevron-down" size={24} color="rgba(255,255,255,0.35)" />
                  <Ionicons name="chevron-down" size={24} color="rgba(255,255,255,0.5)" />
                </Animated.View>

                <Animated.View
                  {...panResponder.panHandlers}
                  style={[styles.fab, styles.fabCallBlue, { transform: [{ translateY: swipeY }] }]}
                >
                  <Ionicons name="videocam" size={24} color={Colors.primary.white} />
                </Animated.View>
                <ThemedText style={styles.swipeHint}>Swipe down to cancel</ThemedText>
              </View>

              <View style={styles.partyBlock}>
                <View style={styles.outgoingAvatarCircle}>
                  {localAvatar ? (
                    <Image source={{ uri: localAvatar }} style={styles.outgoingAvatarImage} contentFit="cover" />
                  ) : (
                    <ThemedText style={styles.avatarText}>
                      {localName?.trim()?.charAt(0)?.toUpperCase() || 'Y'}
                    </ThemedText>
                  )}
                </View>
                <ThemedText type="defaultSemiBold" style={styles.outgoingName}>
                  {localName}
                </ThemedText>
              </View>
            </View>
          ) : (
            <>
          {/* Video area: remote (large) + local (pip) when connected */}
          <Pressable
            style={styles.videoArea}
            onPress={() => {
              if (isConnected) {
                setShowControls(prev => !prev);
              }
            }}
          >
            {showVideoViews ? (
              <>
                <View style={styles.remoteVideoContainer}>
                  {remoteStream ? (
                    <RTCView
                      streamURL={remoteStream.toURL()}
                      style={styles.remoteVideo}
                      objectFit="cover"
                      mirror={false}
                    />
                  ) : (
                    <View style={styles.placeholderRemote}>
                      {userAvatar ? (
                        <Image source={{ uri: userAvatar }} style={styles.placeholderAvatar} contentFit="cover" />
                      ) : (
                        <ThemedText style={styles.placeholderText}>
                          {userName?.trim()?.charAt(0)?.toUpperCase() || 'U'}
                        </ThemedText>
                      )}
                    </View>
                  )}
                </View>
                {localStream && (
                  <View style={styles.localVideoContainer}>
                    <RTCView
                      streamURL={localStream.toURL()}
                      style={styles.localVideo}
                      objectFit="cover"
                      mirror={true}
                      zOrder={1}
                    />
                  </View>
                )}
              </>
            ) : (
              <View style={styles.avatarCircle}>
                {userAvatar ? (
                  <Image source={{ uri: userAvatar }} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <ThemedText style={styles.avatarText}>
                    {userName?.trim()?.charAt(0)?.toUpperCase() || 'U'}
                  </ThemedText>
                )}
              </View>
            )}
          </Pressable>

          {showControls && (
            <View style={styles.topOverlay}>
              {isConnected ? (
                <>
                  <BlurView intensity={80} tint="dark" style={styles.blurFill} />
                  <View style={styles.overlayTint} />
                </>
              ) : (
                <View style={styles.overlayFallback} />
              )}
              <View style={styles.topBar}>
                <ThemedText style={styles.userName} numberOfLines={1}>
                  {userName}
                </ThemedText>
                {isConnected && (
                  <ThemedText style={styles.timerText}>
                    {callTimerText}
                    {isExploreCall && remainingBalance != null && (
                      <ThemedText style={[styles.timerText, remainingBalance <= 2 ? { color: '#FF453A' } : { color: '#FFD60A' }]}>
                        {'  ●  '}{remainingBalance} {remainingBalance === 1 ? 'Min Remaining' : 'Mins Remaining'}
                      </ThemedText>
                    )}
                  </ThemedText>
                )}
                <ThemedText style={styles.statusText}>{statusText}</ThemedText>
              </View>
            </View>
          )}

          {showControls && (
            <View style={styles.bottomOverlay}>
              {isConnected ? (
                <>
                  <BlurView intensity={80} tint="dark" style={styles.blurFill} />
                  <View style={styles.overlayTint} />
                </>
              ) : (
                <View style={styles.overlayFallback} />
              )}
              {isIncomingPreConnect && !isConnecting ? (
                <CallSwipeControl
                  onAnswer={onAnswer || (() => { })}
                  onReject={onReject || (() => { })}
                  iconName="videocam"
                  showVideoIcons={true}
                />
              ) : isConnecting ? (
                <View style={styles.centerRow}>
                  <TouchableOpacity style={[styles.fab, styles.fabEnd]} onPress={onEnd}>
                    <Ionicons name="call" size={26} color={Colors.primary.white} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.centerRow}>
                  {isConnected && (
                    <>
                      <TouchableOpacity
                        style={[styles.controlButton, isMuted ? styles.muteOn : styles.muteOff]}
                        onPress={onToggleMute}
                      >
                        <Ionicons name="mic-off" size={22} color={isMuted ? '#EF4444' : Colors.primary.white} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.controlButton, isVideoEnabled ? styles.videoOn : styles.videoOff]}
                        onPress={onToggleVideo}
                      >
                        <Ionicons name="videocam" size={22} color={isVideoEnabled ? Colors.primary.white : '#EF4444'} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.controlButton} onPress={onFlipCamera}>
                        <Ionicons name="camera-reverse" size={22} color={Colors.primary.white} />
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity style={[styles.fab, styles.fabEnd]} onPress={onEnd}>
                    <Ionicons name="call" size={26} color={Colors.primary.white} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
            </>
          )}
        </View>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: '100%',
  },
  topOverlay: {
    position: 'absolute',
    top: 36,
    left: 16,
    right: 16,
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 2,
  },
  topBar: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
  },
  userName: {
    fontSize: 30,
    color: Colors.primary.white,
    fontWeight: '700',
    marginBottom: 6,
  },
  statusText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.78)',
  },
  timerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.92)',
    marginBottom: 4,
  },
  blurFill: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 16, 24, 0.35)',
  },
  overlayFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 12, 18, 0.65)',
  },
  videoArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideoContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  remoteVideo: {
    flex: 1,
    width: '100%',
  },
  placeholderRemote: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  placeholderAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  placeholderText: {
    fontSize: 64,
    color: Colors.primary.white,
    fontWeight: 'bold',
  },
  localVideoContainer: {
    position: 'absolute',
    right: 16,
    top: 80,
    width: 100,
    height: 140,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  localVideo: {
    flex: 1,
    width: '100%',
  },
  avatarCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  avatarImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  avatarText: {
    fontSize: 48,
    color: Colors.primary.white,
    fontWeight: 'bold',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 28,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    paddingVertical: 18,
    zIndex: 2,
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteOff: { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
  muteOn: { backgroundColor: '#FFFFFF', borderColor: 'rgba(255, 255, 255, 0.55)' },
  videoOn: { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
  videoOff: { backgroundColor: '#FFFFFF', borderColor: 'rgba(255, 255, 255, 0.55)' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabAnswer: { backgroundColor: '#22C55E' },
  fabReject: { backgroundColor: '#EF4444' },
  fabEnd: { backgroundColor: '#EF4444', transform: [{ rotate: '135deg' }] },
  fabCallBlue: { backgroundColor: '#3B82F6' },
  outgoingContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 36,
  },
  partyBlock: { alignItems: 'center' },
  outgoingAvatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  outgoingAvatarImage: {
    width: '100%',
    height: '100%',
  },
  outgoingName: {
    marginTop: 10,
    fontSize: 28,
    color: Colors.primary.white,
  },
  outgoingStatus: {
    marginTop: 6,
    color: '#22C55E',
    fontSize: 20,
  },
  swipeCenter: {
    alignItems: 'center',
    gap: 10,
  },
  chevrons: {
    alignItems: 'center',
    marginBottom: 2,
  },
  swipeHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
});
