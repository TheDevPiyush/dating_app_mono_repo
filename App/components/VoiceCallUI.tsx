import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Animated, PanResponder } from 'react-native';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { CallSwipeControl } from './CallSwipeControl';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '@/store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface VoiceCallUIProps {
  visible: boolean;
  isIncoming: boolean;
  isConnected: boolean;
  isRinging: boolean;
  isConnecting?: boolean;
  userName?: string;
  userAvatar?: string;
  isMuted?: boolean;
  onToggleMute?: () => void;
  isSpeakerOn?: boolean;
  onAudioDevicePress?: () => void;
  onAnswer?: () => void;
  onReject?: () => void;
  onEnd?: () => void;
  isExploreCall?: boolean;
  remainingBalance?: number | null;
}

export const VoiceCallUI: React.FC<VoiceCallUIProps> = ({
  visible,
  isIncoming,
  isConnected,
  isRinging,
  isConnecting = false,
  userName = 'User',
  userAvatar,
  isMuted = false,
  onToggleMute,
  isSpeakerOn = false,
  onAudioDevicePress,
  onAnswer,
  onReject,
  onEnd,
  isExploreCall = false,
  remainingBalance = null,
}) => {
  const insets = useSafeAreaInsets();
  const { dbUser } = useAuthStore();
  const [callSeconds, setCallSeconds] = useState(0);
  const callStartRef = useRef<number | null>(null);
  const swipeY = useRef(new Animated.Value(0)).current;
  const chevronPulse = useRef(new Animated.Value(0)).current;
  const isPreConnect = !isConnected;
  const isIncomingPreConnect = !isConnected && (isIncoming || (!!onAnswer && isRinging));
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
          ? 'Incoming call...'
          : 'Ringing...'
        : 'Calling...';

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
    if (!isPreConnect) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(chevronPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(chevronPulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [chevronPulse, isPreConnect]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => isPreConnect,
        onMoveShouldSetPanResponder: (_, g) => isPreConnect && Math.abs(g.dy) > 4,
        onPanResponderMove: (_, g) => {
          const clamped = isIncomingPreConnect
            ? Math.max(-130, Math.min(130, g.dy))
            : Math.max(0, g.dy);
          swipeY.setValue(clamped);
        },
        onPanResponderRelease: (_, g) => {
          if (isIncomingPreConnect && g.dy < -90) {
            onAnswer?.();
            swipeY.setValue(0);
            return;
          }
          if (g.dy > 90) {
            if (isIncomingPreConnect) {
              onReject?.();
            } else {
              onEnd?.();
            }
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
    [isIncomingPreConnect, isPreConnect, onAnswer, onEnd, onReject, swipeY],
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
        // Android back button: don't just hide the UI while keeping the call alive.
        if (isIncomingPreConnect) {
          onReject?.();
        } else {
          onEnd?.();
        }
      }}
    >
      <LinearGradient
        // More color stops to reduce visible banding on OLED/low-bit gradients
        colors={['#070B14', '#0B1220', '#17162A', '#2B1230', '#4A1737', '#7A1F3D']}
        locations={[0, 0.22, 0.42, 0.62, 0.82, 1]}
        style={styles.container}
      >
        <View style={styles.content}>
          {isPreConnect ? (
            <View
              style={[
                styles.outgoingContainer,
                { paddingTop: Math.max(insets.top + 96, 120) },
              ]}
            >
              <ThemedText type="title" style={[styles.appTitle, { top: Math.max(insets.top + 8, 18) }]}>
                Pookiey
              </ThemedText>
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
                {isIncomingPreConnect ? (
                  <>
                    {/* Up arrows — answer direction */}
                    <Animated.View
                      style={[
                        styles.chevrons,
                        {
                          opacity: chevronPulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
                          transform: [{ translateY: chevronPulse.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }],
                        },
                      ]}
                    >
                      <Ionicons name="chevron-up" size={22} color="rgba(34,197,94,0.35)" />
                      <Ionicons name="chevron-up" size={22} color="rgba(34,197,94,0.6)" />
                      <Ionicons name="chevron-up" size={22} color="rgba(34,197,94,0.85)" />
                    </Animated.View>

                    {/* Bobbing call icon */}
                    <Animated.View
                      {...panResponder.panHandlers}
                      style={[
                        styles.fab,
                        styles.fabCallBlue,
                        {
                          transform: [
                            {
                              translateY: Animated.add(
                                swipeY,
                                chevronPulse.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] }),
                              ),
                            },
                          ],
                        },
                      ]}
                    >
                      <Ionicons name="call" size={26} color={Colors.primary.white} />
                    </Animated.View>

                    {/* Down arrows — decline direction */}
                    <Animated.View
                      style={[
                        styles.chevrons,
                        {
                          opacity: chevronPulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
                          transform: [{ translateY: chevronPulse.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) }],
                        },
                      ]}
                    >
                      <Ionicons name="chevron-down" size={22} color="rgba(239,68,68,0.85)" />
                      <Ionicons name="chevron-down" size={22} color="rgba(239,68,68,0.6)" />
                      <Ionicons name="chevron-down" size={22} color="rgba(239,68,68,0.35)" />
                    </Animated.View>

                    <ThemedText style={styles.swipeHint}>
                      Swipe up to answer or down to decline
                    </ThemedText>
                  </>
                ) : (
                  <>
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
                      <Ionicons name="call" size={26} color={Colors.primary.white} />
                    </Animated.View>
                    <ThemedText style={styles.swipeHint}>Swipe down to cancel</ThemedText>
                  </>
                )}
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
          {/* Top: Name + status */}
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

          {/* Middle: Avatar */}
          <View style={styles.middleSection}>
            <View style={styles.avatarCircle}>
              {userAvatar ? (
                <Image source={{ uri: userAvatar }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <ThemedText style={styles.avatarText}>
                  {userName?.trim()?.charAt(0)?.toUpperCase() || 'U'}
                </ThemedText>
              )}
            </View>
          </View>

          {/* Bottom: Controls */}
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
              // Incoming: show swipeable control
              <CallSwipeControl
                onAnswer={onAnswer || (() => { })}
                onReject={onReject || (() => { })}
                iconName="call"
                showVideoIcons={false}
              />
            ) : isConnecting ? (
              // Connecting: show only end button
              <View style={styles.centerRow}>
                <TouchableOpacity style={[styles.fab, styles.fabEnd]} onPress={onEnd}>
                  <Ionicons name="call" size={26} color={Colors.primary.white} />
                </TouchableOpacity>
              </View>
            ) : (
              // Outgoing/connected: keep mic + hangup together in center
              <View style={styles.centerRow}>
                {isConnected ? (
                  <TouchableOpacity
                    style={[styles.controlButton, isMuted ? styles.muteOn : styles.muteOff]}
                    onPress={onToggleMute}
                  >
                    <Ionicons
                      name={'mic-off'}
                      size={22}
                      color={isMuted ? '#EF4444' : Colors.primary.white}
                    />
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity style={[styles.fab, styles.fabEnd]} onPress={onEnd}>
                  <Ionicons name="call" size={26} color={Colors.primary.white} />
                </TouchableOpacity>

                {isConnected ? (
                  <TouchableOpacity
                    style={[styles.controlButton, isSpeakerOn ? styles.speakerOn : styles.speakerOff]}
                    onPress={onAudioDevicePress}
                  >
                    <Ionicons
                      name={'volume-high'}
                      size={22}
                      color={isSpeakerOn ? '#EF4444' : Colors.primary.white}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  topOverlay: {
    marginTop: 22,
    alignSelf: 'center',
    width: '90%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  topBar: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  userName: {
    fontSize: 30,
    color: Colors.primary.white,
    marginBottom: 6,
  },
  statusText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.78)',
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
  timerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.92)',
    marginBottom: 4,
  },
  bottomOverlay: {
    alignItems: 'center',
    paddingVertical: 22,
    marginBottom: 26,
    alignSelf: 'center',
    width: '90%',
    borderRadius: 22,
    overflow: 'hidden',
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  controlButton: {
    width: 75,
    height: 75,
    borderRadius: 38,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.30,
    shadowRadius: 18,
    elevation: 10,
  },
  muteOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  muteOn: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(255, 255, 255, 0.55)',
  },
  speakerOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  speakerOn: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(255, 255, 255, 0.55)',
  },
  controlLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.90)',
  },
  fab: {
    width: 75,
    height: 75,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.30,
    shadowRadius: 18,
    elevation: 10,
  },
  fabAnswer: {
    backgroundColor: '#22C55E',
    transform: [{ rotate: '135deg' }],
  },
  fabReject: {
    backgroundColor: '#EF4444',
    transform: [{ rotate: '135deg' }],
  },
  fabEnd: {
    backgroundColor: '#EF4444',
    transform: [{ rotate: '135deg' }],
  },
  fabCallBlue: {
    backgroundColor: '#3B82F6',
  },
  outgoingContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 36,
  },
  appTitle: {
    position: 'absolute',
    alignSelf: 'center',
    color: Colors.primary.white,
    fontSize: 30,
  },
  partyBlock: {
    alignItems: 'center',
  },
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

