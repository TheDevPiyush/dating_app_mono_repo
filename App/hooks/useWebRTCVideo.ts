import { useCallback, useMemo } from 'react';
import { useWebRTC } from './useWebRTC';

export type VideoCallStatus = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected';

export function useWebRTCVideo() {
  const {
    status,
    error,
    isMuted,
    isVideoEnabled,
    localStream,
    remoteStream,
    incomingCall: incomingVideoCall,
    initiateCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    flipCamera,
    clearError,
  } = useWebRTC('video');

  const makeVideoCall = useCallback(
    async (matchId: string, receiverId: string, _receiverIdentity: string) => {
      try {
        await initiateCall({
          matchId,
          receiverId,
          callType: 'video',
        });
      } catch (e) {
        // Errors are handled via hook error state for UI
      }
    },
    [initiateCall]
  );

  const answerVideoCall = useCallback(async () => {
    await answerCall();
  }, [answerCall]);

  const rejectVideoCall = useCallback(() => {
    rejectCall();
  }, [rejectCall]);

  const endVideoCall = useCallback(() => {
    endCall();
  }, [endCall]);

  // For compatibility with existing VideoCallUI component
  // We'll return video tracks in a Map format similar to Twilio
  const videoTracks = useMemo(() => {
    const tracks = new Map();
    if (remoteStream) {
      const videoTracks = remoteStream.getVideoTracks();
      videoTracks.forEach((track, index) => {
        tracks.set(track.id, { trackId: track.id, streamId: remoteStream.id });
      });
    }
    return tracks;
  }, [remoteStream]);

  return {
    status,
    error,
    isMuted,
    isVideoEnabled,
    localStream,
    remoteStream,
    videoTracks,
    incomingVideoCall,
    makeVideoCall,
    answerVideoCall,
    rejectVideoCall,
    endVideoCall,
    toggleMute,
    toggleVideo,
    flipCamera,
    clearError,
  };
}
