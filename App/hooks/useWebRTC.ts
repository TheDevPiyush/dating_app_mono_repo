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

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function useWebRTC(callTypeFilter?: 'voice' | 'video') {
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
  const lastEndedMatchRef = useRef<{ matchId: string | null; endedAt: number | null }>({
    matchId: null,
    endedAt: null,
  });
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSetRef = useRef<boolean>(false);

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

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop());
      remoteStreamRef.current = null;
      setRemoteStream(null);
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

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

  const createPeerConnection = useCallback(() => {
    const pc: any = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.ontrack = (event: any) => {
      let stream: MediaStream | null = event.streams?.[0] ?? null;
      if (!stream && event.track) {
        try {
          stream = new MediaStream([event.track]);
        } catch {
          return;
        }
      }
      if (stream) {
        remoteStreamRef.current = stream;
        setRemoteStream(stream);
        setStatus('connected');
        setIncomingCall(null);
      }
    };

    pc.onicecandidate = (event: any) => {
      if (event.candidate && socket?.connected) {
        socket.emit('webrtc_ice_candidate', {
          matchId: matchIdRef.current,
          receiverId: receiverIdRef.current,
          candidate: event.candidate,
        });
      }
    };

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

  const flipCamera = useCallback(async () => {
    if (!localStreamRef.current || callTypeRef.current !== 'video') return;

    localStreamRef.current.getVideoTracks().forEach(track => track.stop());
    facingModeRef.current = facingModeRef.current === 'user' ? 'environment' : 'user';
    const newStream = await getUserMedia(true);

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

      const stream = await getUserMedia(config.callType === 'video');
      const pc = createPeerConnection();

      stream.getTracks().forEach(track => {
        pc.addTrack(track as any, stream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      s.emit('call_initiate', {
        matchId: config.matchId,
        receiverId: config.receiverId,
        callType: config.callType,
        offer,
      });

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
            // Set 'connecting' BEFORE setRemoteDescription so that ontrack
            // (which fires synchronously during setRemoteDescription) can
            // advance to 'connected' without being overwritten afterwards.
            setStatus('connecting');
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer as any));
            remoteDescSetRef.current = true;
            await flushPendingCandidates();
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
  }, [socket, waitForConnection, ensurePermissions, getUserMedia, createPeerConnection, cleanup, flushPendingCandidates]);

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

      const stream = await getUserMedia(incomingCall.callType === 'video');
      const pc = createPeerConnection();

      stream.getTracks().forEach(track => {
        pc.addTrack(track as any, stream);
      });

      if (!incomingCall.offer) {
        throw new Error('No offer found in incoming call');
      }

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer as any));
      remoteDescSetRef.current = true;
      await flushPendingCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('call_answer', {
        matchId: incomingCall.matchId,
        callerId: incomingCall.callerId,
        answer,
      });
    } catch (e: any) {
      console.error('Error answering call:', e);
      cleanup();
    }
  }, [incomingCall, socket, isConnected, ensurePermissions, getUserMedia, createPeerConnection, cleanup, flushPendingCandidates]);

  const rejectCall = useCallback(() => {
    if (!incomingCall || !socket) return;
    socket.emit('call_reject', {
      matchId: incomingCall.matchId,
      callerId: incomingCall.callerId,
    });
    setIncomingCall(null);
    setStatus('idle');
  }, [incomingCall, socket]);

  const endCall = useCallback(() => {
    if (socket && matchIdRef.current && receiverIdRef.current) {
      socket.emit('call_end', {
        matchId: matchIdRef.current,
        otherUserId: receiverIdRef.current,
      });
    }
    cleanup();
  }, [socket, cleanup]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  }, [isVideoEnabled]);

  // Socket listeners — use refs for status checks so we never need to
  // re-register listeners on status changes (avoids missed events).
  useEffect(() => {
    if (!socket || !isConnected) return;

    const onIncoming = async (data: IncomingCall & { offer?: RTCSessionDescriptionInit }) => {
      if (statusRef.current !== 'idle') return;

      // Only handle events that match our call-type filter
      if (callTypeFilter && data.callType !== callTypeFilter) return;

      const { matchId, endedAt } = lastEndedMatchRef.current;
      if (matchId && endedAt && matchId === data.matchId) {
        if (Date.now() - endedAt < 3000) return;
      }

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
      if (statusRef.current !== 'idle') {
        cleanup();
      }
    };

    const onEnded = () => {
      if (statusRef.current !== 'idle') {
        cleanup();
      }
    };

    const onIceCandidate = async (data: { candidate: RTCIceCandidateInit }) => {
      if (!data.candidate) return;
      // Skip ICE candidates when this instance isn't handling a call
      if (statusRef.current === 'idle') return;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, isConnected, cleanup, callTypeFilter]);

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
