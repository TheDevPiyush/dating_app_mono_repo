import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
  mediaDevices,
} from 'react-native-webrtc';
import { useSocket } from './useSocket';
import { Camera } from 'expo-camera';
import { requestRecordingPermissionsAsync } from 'expo-audio';

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected';

export interface WebRTCCallConfig {
  matchId: string;
  receiverId: string;
  callType: 'voice' | 'video';
}

export interface IncomingCall {
  matchId: string;
  callerId: string;
  callerIdentity: string;
  callType: 'voice' | 'video';
  offer?: RTCSessionDescriptionInit;
}

// STUN/TURN servers for WebRTC (using free public STUN servers)
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Add TURN servers here if needed for NAT traversal
  // { urls: 'turn:your-turn-server.com:3478', username: 'user', credential: 'pass' }
];

export function useWebRTC() {
  const { socket, isConnected, waitForConnection } = useSocket();

  const [status, setStatus] = useState<CallStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const matchIdRef = useRef<string | null>(null);
  const receiverIdRef = useRef<string | null>(null);
  const isCallerRef = useRef<boolean>(false);
  const callTypeRef = useRef<'voice' | 'video'>('voice');
  const facingModeRef = useRef<'user' | 'environment'>('user');
  const statusRef = useRef<CallStatus>('idle');
  const incomingCallRef = useRef<IncomingCall | null>(null);
  // Track last ended call to avoid handling stale late-arriving incoming events
  const lastEndedMatchRef = useRef<{ matchId: string | null; endedAt: number | null }>({
    matchId: null,
    endedAt: null,
  });
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSetRef = useRef<boolean>(false);

  // Ensure permissions
  const ensurePermissions = useCallback(async (needsVideo: boolean) => {
    const micPerm = await requestRecordingPermissionsAsync();
    if (!micPerm.granted) {
      throw new Error('Microphone permission is required for calls.');
    }

    if (needsVideo) {
      const camPerm = await Camera.requestCameraPermissionsAsync();
      if (camPerm.status !== 'granted') {
        throw new Error('Camera permission is required for video calls.');
      }
    }
  }, []);

  // Cleanup function (defined early to avoid circular dependency)
  const cleanup = useCallback(() => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    // Stop remote stream
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop());
      remoteStreamRef.current = null;
      setRemoteStream(null);
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Remember which call just ended (before clearing IDs) to ignore any
    // late-arriving signaling for the same match.
    if (matchIdRef.current) {
      lastEndedMatchRef.current = {
        matchId: matchIdRef.current,
        endedAt: Date.now(),
      };
    }

    setStatus('idle');
    setIsMuted(false);
    setIsVideoEnabled(true);
    setIncomingCall(null);
    matchIdRef.current = null;
    receiverIdRef.current = null;
    isCallerRef.current = false;
    pendingCandidatesRef.current = [];
    remoteDescSetRef.current = false;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const flushPendingCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    const candidates = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding buffered ICE candidate:', e);
      }
    }
  }, []);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    const pc: any = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Handle remote track (replaces deprecated onaddstream)
    pc.ontrack = (event: any) => {
      if (event.streams && event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
        setRemoteStream(event.streams[0]);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event: any) => {
      if (event.candidate && socket?.connected) {
        // In react-native-webrtc, candidates are plain JS objects already suitable
        // for JSON transport; no .toJSON() call is needed (and may be undefined).
        socket.emit('webrtc_ice_candidate', {
          matchId: matchIdRef.current,
          receiverId: receiverIdRef.current,
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setStatus('connected');
        setIncomingCall(null);
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        cleanup();
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        setStatus('connected');
        setIncomingCall(null);
      } else if (state === 'failed') {
        cleanup();
      }
    };

    peerConnectionRef.current = pc;
    return pc as RTCPeerConnection;
  }, [socket, cleanup]);

  // Get user media (audio/video)
  const getUserMedia = useCallback(async (video: boolean): Promise<MediaStream> => {
    const constraints: any = {
      audio: true,
      video: video ? {
        facingMode: facingModeRef.current,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      } : false,
    };

    const stream = await mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  // Flip camera
  const flipCamera = useCallback(async () => {
    if (!localStreamRef.current || callTypeRef.current !== 'video') return;

    // Stop current video tracks
    localStreamRef.current.getVideoTracks().forEach(track => track.stop());

    // Switch facing mode
    facingModeRef.current = facingModeRef.current === 'user' ? 'environment' : 'user';

    // Get new stream with flipped camera
    const newStream = await getUserMedia(true);

    // Replace tracks in peer connection if it exists
    if (peerConnectionRef.current) {
      const oldTracks = peerConnectionRef.current.getSenders();
      const newVideoTrack = newStream.getVideoTracks()[0];

      const videoSender = oldTracks.find(sender =>
        sender.track && sender.track.kind === 'video'
      );

      if (videoSender && newVideoTrack) {
        await videoSender.replaceTrack(newVideoTrack as any);
      }
    }
  }, [getUserMedia]);


  // Initialize call (caller side)
  const initiateCall = useCallback(async (config: WebRTCCallConfig) => {
    try {
      setError(null);
      const s = socket?.connected ? socket : await waitForConnection(2500);
      if (!s?.connected) throw new Error('Socket not connected');

      await ensurePermissions(config.callType === 'video');

      matchIdRef.current = config.matchId;
      receiverIdRef.current = config.receiverId;
      callTypeRef.current = config.callType;
      isCallerRef.current = true;
      setStatus('calling');

      // Get user media
      const stream = await getUserMedia(config.callType === 'video');

      // Create peer connection
      const pc = createPeerConnection();

      // Add local stream tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track as any, stream);
      });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer via socket. `offer` is already a serializable
      // RTCSessionDescriptionInit-like object.
      s.emit('call_initiate', {
        matchId: config.matchId,
        receiverId: config.receiverId,
        callType: config.callType,
        offer,
      });

      // Wait for answer
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          cleanupListeners();
          if (matchIdRef.current && receiverIdRef.current) {
            s.emit('call_end', {
              matchId: matchIdRef.current,
              otherUserId: receiverIdRef.current,
            });
          }
          setError("Recipient didn't pick up the call.");
          reject(new Error('Call timeout'));
        }, 30000);

        const onUnavailable = () => {
          clearTimeout(timer);
          cleanupListeners();
          reject(new Error('User unavailable'));
        };

        const onEnded = () => {
          clearTimeout(timer);
          cleanupListeners();
          setError('Call ended.');
          reject(new Error('Call ended'));
        };

        const onRejected = () => {
          clearTimeout(timer);
          cleanupListeners();
          setError('Call rejected.');
          reject(new Error('Call rejected'));
        };

        const onAnswer = async (data: { answer: any }) => {
          clearTimeout(timer);
          cleanupListeners();
          try {
            if (peerConnectionRef.current !== pc || pc.connectionState === 'closed') {
              reject(new Error('Call no longer active'));
              return;
            }
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer as any));
            remoteDescSetRef.current = true;
            await flushPendingCandidates();
            setStatus('connecting');
            resolve();
          } catch (err) {
            reject(err);
          }
        };

        const cleanupListeners = () => {
          s.off('call_unavailable', onUnavailable);
          s.off('call_answer', onAnswer);
          s.off('call_ended', onEnded);
          s.off('call_rejected', onRejected);
        };

        s.on('call_unavailable', onUnavailable);
        s.on('call_answer', onAnswer);
        s.on('call_ended', onEnded);
        s.on('call_rejected', onRejected);
      });
    } catch (e: any) {
      console.error('Error initiating call:', e);
      cleanup();
      throw e;
    }
  }, [socket, waitForConnection, ensurePermissions, getUserMedia, createPeerConnection, cleanup]);

  // Answer call (receiver side)
  const answerCall = useCallback(async () => {
    try {
      if (!incomingCall || !socket || !isConnected) return;
      setError(null);

      await ensurePermissions(incomingCall.callType === 'video');

      const latestIncoming = incomingCallRef.current;
      if (!latestIncoming || latestIncoming.matchId !== incomingCall.matchId || statusRef.current !== 'ringing') {
        return;
      }

      matchIdRef.current = incomingCall.matchId;
      receiverIdRef.current = incomingCall.callerId;
      callTypeRef.current = incomingCall.callType;
      isCallerRef.current = false;
      setStatus('connecting');

      // Get user media
      const stream = await getUserMedia(incomingCall.callType === 'video');

      // Create peer connection
      const pc = createPeerConnection();

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track as any, stream);
      });

      // Set remote description from offer (stored in incomingCall state)
      if (!incomingCall.offer) {
        throw new Error('No offer found in incoming call');
      }

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer as any));
      remoteDescSetRef.current = true;
      await flushPendingCandidates();

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer via socket. `answer` is already serializable.
      socket.emit('call_answer', {
        matchId: incomingCall.matchId,
        callerId: incomingCall.callerId,
        answer,
      });

      // Don't clear incomingCall immediately - keep it until call is connected
      // This prevents the UI from flickering/hiding during the connecting phase
      // It will be cleared when status becomes 'connected' or on cleanup
    } catch (e: any) {
      console.error('Error answering call:', e);
      cleanup();
    }
  }, [incomingCall, socket, isConnected, ensurePermissions, getUserMedia, createPeerConnection, cleanup]);

  // Reject call
  const rejectCall = useCallback(() => {
    if (!incomingCall || !socket) return;
    socket.emit('call_reject', {
      matchId: incomingCall.matchId,
      callerId: incomingCall.callerId,
    });
    setIncomingCall(null);
    setStatus('idle');
  }, [incomingCall, socket]);

  // End call
  const endCall = useCallback(() => {
    if (socket && matchIdRef.current && receiverIdRef.current) {
      socket.emit('call_end', {
        matchId: matchIdRef.current,
        otherUserId: receiverIdRef.current,
      });
    }
    cleanup();
  }, [socket, cleanup]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  }, [isVideoEnabled]);

  // Socket listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    const onIncoming = async (data: IncomingCall & { offer?: RTCSessionDescriptionInit }) => {
      // Don't handle incoming calls if we're already in a call (status !== 'idle')
      // This prevents ghost call screens after a call ends
      if (status !== 'idle') {
        return;
      }

      // If this incoming event refers to a match that just ended very recently,
      // ignore it as a stale/late-arriving signal to avoid showing a dummy screen.
      const { matchId, endedAt } = lastEndedMatchRef.current;
      if (matchId && endedAt && matchId === data.matchId) {
        const elapsed = Date.now() - endedAt;
        if (elapsed < 3000) {
          return;
        }
      }

      // Only handle if it matches our call type filter (handled by useWebRTCVoice/useWebRTCVideo)
      setIncomingCall({
        matchId: data.matchId,
        callerId: data.callerId,
        callerIdentity: data.callerIdentity,
        callType: data.callType,
        offer: data.offer,
      });
      setStatus('ringing');
    };

    const onRejected = () => {
      // Only cleanup if we're not already idle (avoid double cleanup)
      if (status !== 'idle') {
        cleanup();
      }
    };

    const onEnded = () => {
      // Only cleanup if we're not already idle (avoid double cleanup)
      if (status !== 'idle') {
        cleanup();
      }
    };

    const onIceCandidate = async (data: { candidate: RTCIceCandidateInit }) => {
      if (!data.candidate) return;

      if (!remoteDescSetRef.current || !peerConnectionRef.current) {
        pendingCandidatesRef.current.push(data.candidate);
        return;
      }

      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.error('Error adding ICE candidate:', e);
      }
    };

    socket.on('call_incoming', onIncoming);
    socket.on('call_rejected', onRejected);
    socket.on('call_ended', onEnded);
    socket.on('webrtc_ice_candidate', onIceCandidate);

    return () => {
      socket.off('call_incoming', onIncoming);
      socket.off('call_rejected', onRejected);
      socket.off('call_ended', onEnded);
      socket.off('webrtc_ice_candidate', onIceCandidate);
    };
  }, [socket, isConnected, cleanup, status]);

  return {
    status,
    error,
    isMuted,
    isVideoEnabled,
    localStream,
    remoteStream,
    incomingCall,
    initiateCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    flipCamera,
    cleanup,
    clearError,
  };
}
