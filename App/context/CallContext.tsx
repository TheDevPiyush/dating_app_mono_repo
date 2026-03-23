import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { VoiceCallUI } from '@/components/VoiceCallUI';
import { VideoCallUI } from '@/components/VideoCallUI';
import { useWebRTCVoice } from '@/hooks/useWebRTCVoice';
import { useWebRTCVideo } from '@/hooks/useWebRTCVideo';
import { useExploreWebRTC } from '@/hooks/useExploreWebRTC';
import { useMessagingStore } from '@/store/messagingStore';
import { useWalletStore } from '@/store/walletStore';
import CustomDialog, { DialogType } from '@/components/CustomDialog';
import { Asset } from 'expo-asset';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer, AudioStatus } from 'expo-audio';

type CallContextValue = {
  makeCall: (matchId: string, receiverId: string, receiverIdentity: string) => Promise<void>;
  makeVideoCall: (matchId: string, receiverId: string, receiverIdentity: string) => Promise<void>;
  makeExploreCall: (employeeUserId: string, employeeName: string) => Promise<void>;
  makeExploreVideoCall: (employeeUserId: string, employeeName: string) => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  isMuted: boolean;
  onAudioDevicePress: () => void;
  selectedAudioDeviceName?: string;
  isSpeakerOn: boolean;
  callStatus: any;
  incomingCall: any;
};

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { inbox } = useMessagingStore();
  const { decrementBalance } = useWalletStore();
  const {
    callStatus,
    incomingCall,
    makeCall,
    answerCall,
    rejectCall,
    endCall,
    isMuted,
    toggleMute,
    clearError: clearVoiceError,
  } = useWebRTCVoice();

  const {
    status: videoStatus,
    error: videoError,
    isMuted: videoIsMuted,
    isVideoEnabled,
    videoTracks,
    incomingVideoCall,
    makeVideoCall,
    answerVideoCall,
    rejectVideoCall,
    endVideoCall,
    toggleMute: toggleVideoMute,
    toggleVideo,
    flipCamera,
    localStream,
    remoteStream,
    clearError: clearVideoError,
  } = useWebRTCVideo();

  // Explore calls
  const {
    status: exploreStatus,
    error: exploreError,
    isMuted: exploreIsMuted,
    isVideoEnabled: exploreVideoEnabled,
    localStream: exploreLocalStream,
    remoteStream: exploreRemoteStream,
    incomingCall: incomingExploreCall,
    remainingBalance: exploreRemainingBalance,
    minutesElapsed: exploreMinutesElapsed,
    initiateCall: initiateExploreCall,
    answerCall: answerExploreCall,
    rejectCall: rejectExploreCall,
    endCall: endExploreCall,
    toggleMute: toggleExploreMute,
    toggleVideo: toggleExploreVideo,
    flipCamera: flipExploreCamera,
    clearError: clearExploreError,
  } = useExploreWebRTC();

  const [exploreCallName, setExploreCallName] = useState<string>('');
  const [exploreCallAvatar, setExploreCallAvatar] = useState<string | undefined>(undefined);
  const [exploreCallType, setExploreCallType] = useState<'voice' | 'video'>('voice');
  const [voicePeerName, setVoicePeerName] = useState<string>('User');
  const [voicePeerAvatar, setVoicePeerAvatar] = useState<string | undefined>(undefined);
  const [videoPeerName, setVideoPeerName] = useState<string>('User');
  const [videoPeerAvatar, setVideoPeerAvatar] = useState<string | undefined>(undefined);

  const resolvePeerFromInbox = useCallback(
    (matchId?: string, peerId?: string, fallback?: string) => {
      const matched = inbox.find(
        (item) =>
          (!matchId || item.matchId === matchId) &&
          (!peerId || item.userId === peerId),
      );
      return {
        name: matched?.name || fallback || 'User',
        avatar: matched?.avatar || undefined,
      };
    },
    [inbox],
  );

  // When an incoming explore call arrives, set the caller's name for the UI
  useEffect(() => {
    if (incomingExploreCall) {
      setExploreCallName(incomingExploreCall.callerName || 'User');
      setExploreCallAvatar(incomingExploreCall.callerAvatar || undefined);
      setExploreCallType(incomingExploreCall.callType);
    }
  }, [incomingExploreCall]);

  useEffect(() => {
    if (!incomingCall) return;
    const peer = resolvePeerFromInbox(
      incomingCall.matchId,
      incomingCall.callerId,
      incomingCall.callerIdentity,
    );
    setVoicePeerName(peer.name);
    setVoicePeerAvatar(peer.avatar);
  }, [incomingCall, resolvePeerFromInbox]);

  useEffect(() => {
    if (!incomingVideoCall) return;
    const peer = resolvePeerFromInbox(
      incomingVideoCall.matchId,
      incomingVideoCall.callerId,
      incomingVideoCall.callerIdentity,
    );
    setVideoPeerName(peer.name);
    setVideoPeerAvatar(peer.avatar);
  }, [incomingVideoCall, resolvePeerFromInbox]);

  // Update wallet balance when explore tick comes in
  useEffect(() => {
    if (exploreRemainingBalance != null) {
      useWalletStore.getState().setBalance(exploreRemainingBalance);
    }
  }, [exploreRemainingBalance]);

  // -----------------------------
  // Audio routing logic
  // -----------------------------
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  const setupCallAudio = useCallback(async (speaker: boolean) => {
    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        shouldRouteThroughEarpiece: !speaker,
      });
    } catch (e) {
      console.log('Audio setup error', e);
    }
  }, []);

  const resetCallAudio = useCallback(async () => {
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: false,
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
      });
    } catch (e) {
      console.log('Audio reset error', e);
    }
  }, []);

  const onAudioDevicePress = useCallback(async () => {
    const next = !isSpeakerOn;
    setIsSpeakerOn(next);
    await setupCallAudio(next);
  }, [isSpeakerOn, setupCallAudio]);

  // Voice call → default earpiece
  useEffect(() => {
    if (callStatus.isConnected) {
      setIsSpeakerOn(false);
      setupCallAudio(false);
    }
  }, [callStatus.isConnected, setupCallAudio]);

  // Video call → default speaker
  useEffect(() => {
    if (videoStatus === 'connected') {
      setIsSpeakerOn(true);
      setupCallAudio(true);
    }
  }, [videoStatus, setupCallAudio]);

  // Explore voice call → earpiece, explore video call → speaker
  useEffect(() => {
    if (exploreStatus === 'connected') {
      const useSpeaker = exploreCallType === 'video';
      setIsSpeakerOn(useSpeaker);
      setupCallAudio(useSpeaker);
    }
  }, [exploreStatus, exploreCallType, setupCallAudio]);

  // Reset audio when everything ends
  useEffect(() => {
    if (callStatus.isEnded && videoStatus === 'idle' && exploreStatus === 'idle') {
      resetCallAudio();
      setIsSpeakerOn(false);
    }
  }, [callStatus.isEnded, videoStatus, exploreStatus, resetCallAudio]);

  const makeExploreCallFn = useCallback(async (employeeUserId: string, employeeName: string) => {
    setExploreCallName(employeeName);
    setExploreCallAvatar(undefined);
    setExploreCallType('voice');
    try {
      await initiateExploreCall({ employeeUserId, callType: 'voice' });
    } catch {}
  }, [initiateExploreCall]);

  const makeExploreVideoCallFn = useCallback(async (employeeUserId: string, employeeName: string) => {
    setExploreCallName(employeeName);
    setExploreCallAvatar(undefined);
    setExploreCallType('video');
    try {
      await initiateExploreCall({ employeeUserId, callType: 'video' });
    } catch {}
  }, [initiateExploreCall]);

  const makeCallFn = useCallback(
    async (matchId: string, receiverId: string, receiverIdentity: string) => {
      const peer = resolvePeerFromInbox(matchId, receiverId, receiverIdentity);
      setVoicePeerName(peer.name);
      setVoicePeerAvatar(peer.avatar);
      await makeCall(matchId, receiverId, receiverIdentity);
    },
    [makeCall, resolvePeerFromInbox],
  );

  const makeVideoCallFn = useCallback(
    async (matchId: string, receiverId: string, receiverIdentity: string) => {
      const peer = resolvePeerFromInbox(matchId, receiverId, receiverIdentity);
      setVideoPeerName(peer.name);
      setVideoPeerAvatar(peer.avatar);
      await makeVideoCall(matchId, receiverId, receiverIdentity);
    },
    [makeVideoCall, resolvePeerFromInbox],
  );

  // -----------------------------
  // Ringtone logic
  // -----------------------------
  const ringPlayerRef = useRef<AudioPlayer | null>(null);
  const ringSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const ringAsset = useMemo(
    () => Asset.fromModule(require('@/assets/sounds/call-ring.mp3')),
    []
  );

  const stopRingtone = useCallback(() => {
    if (ringSubscriptionRef.current) {
      ringSubscriptionRef.current.remove();
      ringSubscriptionRef.current = null;
    }
    if (ringPlayerRef.current) {
      ringPlayerRef.current.pause();
      ringPlayerRef.current.remove();
      ringPlayerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (callStatus.isConnected || videoStatus === 'connected' || exploreStatus === 'connected') {
      stopRingtone();
    }
  }, [callStatus.isConnected, videoStatus, exploreStatus, stopRingtone]);

  useEffect(() => {
    const shouldRing =
      (!!incomingCall && callStatus.isRinging && !callStatus.isConnected) ||
      (!!incomingVideoCall && videoStatus === 'ringing') ||
      (!!incomingExploreCall && exploreStatus === 'ringing');

    if (!shouldRing) {
      stopRingtone();
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: false,
          shouldPlayInBackground: false,
        });

        await ringAsset.downloadAsync();
        const uri = ringAsset.localUri ?? ringAsset.uri;
        const player = createAudioPlayer({ uri }, { updateInterval: 500 });

        if (cancelled) {
          player.remove();
          return;
        }

        player.loop = true;
        ringPlayerRef.current = player;

        const subscription = player.addListener(
          'playbackStatusUpdate',
          (status: AudioStatus) => {
            if (!status.isLoaded) return;
            if (status.didJustFinish) {
              player.seekTo(0);
              player.play();
            }
          }
        );
        ringSubscriptionRef.current = subscription;
        player.play();
      } catch (error) {
        console.error('Error playing ringtone:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    incomingCall,
    incomingVideoCall,
    incomingExploreCall,
    callStatus.isRinging,
    callStatus.isConnected,
    videoStatus,
    exploreStatus,
    ringAsset,
    stopRingtone,
  ]);

  // -----------------------------
  // Context value
  // -----------------------------
  const ctx = useMemo<CallContextValue>(
    () => ({
      makeCall: makeCallFn,
      makeVideoCall: makeVideoCallFn,
      makeExploreCall: makeExploreCallFn,
      makeExploreVideoCall: makeExploreVideoCallFn,
      answerCall,
      rejectCall,
      endCall,
      toggleMute,
      isMuted,
      onAudioDevicePress,
      selectedAudioDeviceName: isSpeakerOn ? 'Speaker' : 'Earpiece',
      isSpeakerOn,
      callStatus,
      incomingCall,
    }),
    [
      makeCallFn,
      makeVideoCallFn,
      makeExploreCallFn,
      makeExploreVideoCallFn,
      answerCall,
      rejectCall,
      endCall,
      toggleMute,
      isMuted,
      onAudioDevicePress,
      isSpeakerOn,
      callStatus,
      incomingCall,
    ]
  );

  return (
    <CallContext.Provider value={ctx}>
      {children}

      <VoiceCallUI
        visible={!callStatus.isEnded}
        isIncoming={!!incomingCall}
        isConnected={callStatus.isConnected}
        isRinging={callStatus.isRinging}
        isConnecting={callStatus.isConnecting}
        userName={voicePeerName}
        userAvatar={voicePeerAvatar}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        isSpeakerOn={isSpeakerOn}
        onAudioDevicePress={onAudioDevicePress}
        onAnswer={answerCall}
        onReject={rejectCall}
        onEnd={endCall}
      />

      <VideoCallUI
        visible={videoStatus !== 'idle'}
        isIncoming={!!incomingVideoCall}
        isConnected={videoStatus === 'connected'}
        isRinging={videoStatus === 'ringing'}
        isConnecting={videoStatus === 'connecting'}
        userName={videoPeerName}
        userAvatar={videoPeerAvatar}
        isMuted={videoIsMuted}
        isVideoEnabled={isVideoEnabled}
        onToggleMute={toggleVideoMute}
        onToggleVideo={toggleVideo}
        onFlipCamera={flipCamera}
        onAnswer={answerVideoCall}
        onReject={rejectVideoCall}
        onEnd={endVideoCall}
        localStream={localStream}
        remoteStream={remoteStream}
        videoTracks={videoTracks}
      />

      {/* Explore voice call UI */}
      {exploreCallType === 'voice' && (
        <VoiceCallUI
          visible={exploreStatus !== 'idle'}
          isIncoming={!!incomingExploreCall}
          isConnected={exploreStatus === 'connected'}
          isRinging={exploreStatus === 'ringing'}
          isConnecting={exploreStatus === 'connecting'}
          userName={exploreCallName || 'Employee'}
          userAvatar={exploreCallAvatar}
          isMuted={exploreIsMuted}
          isSpeakerOn={isSpeakerOn}
          onToggleMute={toggleExploreMute}
          onAudioDevicePress={onAudioDevicePress}
          onAnswer={answerExploreCall}
          onReject={rejectExploreCall}
          onEnd={endExploreCall}
          isExploreCall
          remainingBalance={exploreRemainingBalance}
        />
      )}

      {/* Explore video call UI */}
      {exploreCallType === 'video' && (
        <VideoCallUI
          visible={exploreStatus !== 'idle'}
          isIncoming={!!incomingExploreCall}
          isConnected={exploreStatus === 'connected'}
          isRinging={exploreStatus === 'ringing'}
          isConnecting={exploreStatus === 'connecting'}
          userName={exploreCallName || 'Employee'}
          userAvatar={exploreCallAvatar}
          isMuted={exploreIsMuted}
          isVideoEnabled={exploreVideoEnabled}
          onToggleMute={toggleExploreMute}
          onToggleVideo={toggleExploreVideo}
          onFlipCamera={flipExploreCamera}
          onAnswer={answerExploreCall}
          onReject={rejectExploreCall}
          onEnd={endExploreCall}
          localStream={exploreLocalStream}
          remoteStream={exploreRemoteStream}
          isExploreCall
          remainingBalance={exploreRemainingBalance}
        />
      )}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within a CallProvider');
  return ctx;
}
