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

export type ExploreCallStatus = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected';

export interface IncomingExploreCall {
    callId: string;
    callerId: string;
    callerIdentity: string;
    callerName: string;
    callerAvatar?: string;
    callType: 'voice' | 'video';
    offer?: RTCSessionDescriptionInit;
}

const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

export function useExploreWebRTC() {
    const { socket, isConnected, waitForConnection } = useSocket();

    const [status, setStatus] = useState<ExploreCallStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [incomingCall, setIncomingCall] = useState<IncomingExploreCall | null>(null);
    const [remainingBalance, setRemainingBalance] = useState<number | null>(null);
    const [minutesElapsed, setMinutesElapsed] = useState(0);

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const callIdRef = useRef<string | null>(null);
    const otherUserIdRef = useRef<string | null>(null);
    const callTypeRef = useRef<'voice' | 'video'>('voice');
    const facingModeRef = useRef<'user' | 'environment'>('user');
    const statusRef = useRef<ExploreCallStatus>('idle');
    const incomingCallRef = useRef<IncomingExploreCall | null>(null);
    const lastEndedCallRef = useRef<{ callId: string | null; endedAt: number | null }>({
        callId: null,
        endedAt: null,
    });
    const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
    const remoteDescSetRef = useRef<boolean>(false);

    const ensurePermissions = useCallback(async (needsVideo: boolean) => {
        const micPerm = await requestRecordingPermissionsAsync();
        if (!micPerm.granted) throw new Error('Microphone permission is required for calls.');
        if (needsVideo) {
            const camPerm = await Camera.requestCameraPermissionsAsync();
            if (camPerm.status !== 'granted') throw new Error('Camera permission is required for video calls.');
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
        if (callIdRef.current) {
            lastEndedCallRef.current = { callId: callIdRef.current, endedAt: Date.now() };
        }

        setStatus('idle');
        setIsMuted(false);
        setIsVideoEnabled(true);
        setIncomingCall(null);
        setRemainingBalance(null);
        setMinutesElapsed(0);
        callIdRef.current = null;
        otherUserIdRef.current = null;
        pendingCandidatesRef.current = [];
        remoteDescSetRef.current = false;
    }, []);

    const clearError = useCallback(() => setError(null), []);

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

    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);

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
                socket.emit('explore_webrtc_ice_candidate', {
                    callId: callIdRef.current,
                    receiverId: otherUserIdRef.current,
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
            video: video ? { facingMode: facingModeRef.current, width: { ideal: 1280 }, height: { ideal: 720 } } : false,
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
            const senders = peerConnectionRef.current.getSenders();
            const videoSender = senders.find(s => s.track?.kind === 'video');
            const newVideoTrack = newStream.getVideoTracks()[0];
            if (videoSender && newVideoTrack) await videoSender.replaceTrack(newVideoTrack as any);
        }
    }, [getUserMedia]);

    // Initiate explore call (caller side)
    const initiateCall = useCallback(async (config: {
        employeeUserId: string;
        callType: 'voice' | 'video';
    }) => {
        try {
            setError(null);
            const s = socket?.connected ? socket : await waitForConnection(2500);
            if (!s?.connected) throw new Error('Socket not connected');

            await ensurePermissions(config.callType === 'video');

            otherUserIdRef.current = config.employeeUserId;
            callTypeRef.current = config.callType;
            setStatus('calling');

            const stream = await getUserMedia(config.callType === 'video');
            const pc = createPeerConnection();
            stream.getTracks().forEach(track => pc.addTrack(track as any, stream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            s.emit('explore_call_initiate', {
                employeeUserId: config.employeeUserId,
                callType: config.callType,
                offer,
            });

            await new Promise<void>((resolve, reject) => {
                const timer = setTimeout(() => {
                    cleanupListeners();
                    if (callIdRef.current && otherUserIdRef.current) {
                        s.emit('explore_call_end', {
                            callId: callIdRef.current,
                            otherUserId: otherUserIdRef.current,
                        });
                    }
                    setError("Recipient didn't pick up the call.");
                    reject(new Error('Call timeout'));
                }, 30000);

                const onInitiated = (data: { callId: string; balance: number }) => {
                    callIdRef.current = data.callId;
                    setRemainingBalance(data.balance);
                };

                const onUnavailable = () => {
                    clearTimeout(timer);
                    cleanupListeners();
                    reject(new Error('User unavailable'));
                };

                const onError = (data: { reason: string }) => {
                    clearTimeout(timer);
                    cleanupListeners();
                    setError(data.reason === 'insufficient_balance'
                        ? 'Insufficient balance. Please recharge.'
                        : data.reason === 'subscription_required_for_video'
                            ? 'Paid subscription required for video calls.'
                            : 'Call failed.');
                    reject(new Error(data.reason));
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
                    s.off('explore_call_initiated', onInitiated);
                    s.off('explore_call_unavailable', onUnavailable);
                    s.off('explore_call_error', onError);
                    s.off('explore_call_answer', onAnswer);
                    s.off('explore_call_ended', onEnded);
                    s.off('explore_call_rejected', onRejected);
                };

                s.on('explore_call_initiated', onInitiated);
                s.on('explore_call_unavailable', onUnavailable);
                s.on('explore_call_error', onError);
                s.on('explore_call_answer', onAnswer);
                s.on('explore_call_ended', onEnded);
                s.on('explore_call_rejected', onRejected);
            });
        } catch (e: any) {
            cleanup();
            throw e;
        }
    }, [socket, waitForConnection, ensurePermissions, getUserMedia, createPeerConnection, cleanup]);

    // Answer explore call (employee side)
    const answerCall = useCallback(async () => {
        try {
            if (!incomingCall || !socket || !isConnected) return;
            setError(null);

            const latestIncoming = incomingCallRef.current;
            if (!latestIncoming || latestIncoming.callId !== incomingCall.callId || statusRef.current !== 'ringing') return;

            await ensurePermissions(incomingCall.callType === 'video');

            callIdRef.current = incomingCall.callId;
            otherUserIdRef.current = incomingCall.callerId;
            callTypeRef.current = incomingCall.callType;
            setStatus('connecting');

            const stream = await getUserMedia(incomingCall.callType === 'video');
            const pc = createPeerConnection();
            stream.getTracks().forEach(track => pc.addTrack(track as any, stream));

            if (!incomingCall.offer) throw new Error('No offer found');

            await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer as any));
            remoteDescSetRef.current = true;
            await flushPendingCandidates();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('explore_call_answer', {
                callId: incomingCall.callId,
                callerId: incomingCall.callerId,
                answer,
            });
        } catch (e) {
            console.error('Error answering explore call:', e);
            cleanup();
        }
    }, [incomingCall, socket, isConnected, ensurePermissions, getUserMedia, createPeerConnection, cleanup]);

    const rejectCall = useCallback(() => {
        if (!incomingCall || !socket) return;
        socket.emit('explore_call_reject', {
            callId: incomingCall.callId,
            callerId: incomingCall.callerId,
        });
        setIncomingCall(null);
        setStatus('idle');
    }, [incomingCall, socket]);

    const endCall = useCallback(() => {
        if (socket && callIdRef.current && otherUserIdRef.current) {
            socket.emit('explore_call_end', {
                callId: callIdRef.current,
                otherUserId: otherUserIdRef.current,
            });
        }
        cleanup();
    }, [socket, cleanup]);

    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = isMuted; });
            setIsMuted(!isMuted);
        }
    }, [isMuted]);

    const toggleVideo = useCallback(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(track => { track.enabled = !isVideoEnabled; });
            setIsVideoEnabled(!isVideoEnabled);
        }
    }, [isVideoEnabled]);

    // Socket listeners — use statusRef so we never re-register on status changes
    useEffect(() => {
        if (!socket || !isConnected) return;

        const onIncoming = (data: IncomingExploreCall & { offer?: RTCSessionDescriptionInit }) => {
            if (statusRef.current !== 'idle') return;

            const { callId, endedAt } = lastEndedCallRef.current;
            if (callId && endedAt && callId === data.callId && Date.now() - endedAt < 3000) return;

            setIncomingCall({
                callId: data.callId,
                callerId: data.callerId,
                callerIdentity: data.callerIdentity,
                callerName: data.callerName || 'User',
                callerAvatar: data.callerAvatar,
                callType: data.callType,
                offer: data.offer,
            });
            setStatus('ringing');
        };

        const onRejected = () => { if (statusRef.current !== 'idle') cleanup(); };
        const onEnded = () => { if (statusRef.current !== 'idle') cleanup(); };

        const onBalanceExhausted = () => {
            setError('Your balance has been exhausted.');
            cleanup();
        };

        const onTick = (data: { remainingBalance: number; minutesElapsed: number }) => {
            setRemainingBalance(data.remainingBalance);
            setMinutesElapsed(data.minutesElapsed);
        };

        const onIceCandidate = async (data: { candidate: RTCIceCandidateInit }) => {
            if (!data.candidate) return;
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

        socket.on('explore_call_incoming', onIncoming);
        socket.on('explore_call_rejected', onRejected);
        socket.on('explore_call_ended', onEnded);
        socket.on('explore_call_balance_exhausted', onBalanceExhausted);
        socket.on('explore_call_tick', onTick);
        socket.on('explore_webrtc_ice_candidate', onIceCandidate);

        return () => {
            socket.off('explore_call_incoming', onIncoming);
            socket.off('explore_call_rejected', onRejected);
            socket.off('explore_call_ended', onEnded);
            socket.off('explore_call_balance_exhausted', onBalanceExhausted);
            socket.off('explore_call_tick', onTick);
            socket.off('explore_webrtc_ice_candidate', onIceCandidate);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, isConnected, cleanup]);

    return {
        status,
        error,
        isMuted,
        isVideoEnabled,
        localStream,
        remoteStream,
        incomingCall,
        remainingBalance,
        minutesElapsed,
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
