import { useCallback, useMemo } from 'react';
import { useWebRTC } from './useWebRTC';

type VoiceCallStatus = {
  isCalling: boolean;
  isRinging: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  isEnded: boolean;
  error?: string;
};

export function useWebRTCVoice() {
  const {
    status,
    error,
    isMuted,
    localStream,
    remoteStream,
    incomingCall,
    initiateCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    clearError,
  } = useWebRTC('voice');

  const makeCall = useCallback(
    async (matchId: string, receiverId: string, _receiverIdentity: string) => {
      try {
        await initiateCall({
          matchId,
          receiverId,
          callType: 'voice',
        });
      } catch (e) {
        // Errors are handled via hook error state for UI
      }
    },
    [initiateCall]
  );

  const callStatus: VoiceCallStatus = useMemo(
    () => ({
      isCalling: status === 'calling',
      isRinging: status === 'ringing',
      isConnecting: status === 'connecting',
      isConnected: status === 'connected',
      isEnded: status === 'idle',
      error: error || undefined,
    }),
    [status, error]
  );

  return {
    status,
    callStatus,
    isMuted,
    incomingCall,
    makeCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    clearError,
    localStream,
    remoteStream,
  };
}
