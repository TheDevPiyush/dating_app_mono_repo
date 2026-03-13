import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { Messages, Matches, User, Call } from "../models";
import { sendMessageNotification } from "../services/notificationService";
import { deductToken, checkBalance } from "../services/walletService";
import mongoose from "mongoose";

interface AuthenticatedSocket extends Socket {
    userId?: string;
}

interface ActiveExploreCall {
    callId: mongoose.Types.ObjectId;
    callerId: string;
    receiverId: string;
    callType: "voice" | "video";
    intervalId: NodeJS.Timeout;
    startedAt: Date;
    tickCount: number;
}

const activeExploreCalls = new Map<string, ActiveExploreCall>();

function getExploreCallKey(callerId: string, receiverId: string) {
    return `explore:${callerId}:${receiverId}`;
}

export const initializeSocket = (httpServer: HTTPServer) => {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: "*", // Configure this properly in production
            methods: ["GET", "POST"]
        }
    });

    // Middleware to authenticate socket connections
    io.use(async (socket: AuthenticatedSocket, next) => {
        try {
            const userId = socket.handshake.auth.userId;

            if (!userId) {
                return next(new Error("Authentication error: userId is required"));
            }

            socket.userId = userId;
            next();
        } catch (error) {
            next(new Error("Authentication error"));
        }
    });

    io.on("connection", (socket: AuthenticatedSocket) => {
        const userId = socket.userId;

        // User joins their own room
        if (userId) {
            socket.join(`user:${userId}`);
        }

        // Join a match room
        socket.on("join_match", async (matchId: string) => {
            try {
                // Verify user is part of this match
                const match = await Matches.findById(matchId);
                if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
                    socket.emit("error", { message: "Access denied to this match" });
                    return;
                }

                socket.join(`match:${matchId}`);
            } catch (error) {
                socket.emit("error", { message: "Failed to join match" });
            }
        });

        // Leave a match room
        socket.on("leave_match", (matchId: string) => {
            socket.leave(`match:${matchId}`);
        });

        // Send a message
        socket.on("send_message", async (data: {
            matchId: string;
            text: string;
            type?: "text" | "image" | "gif" | "audio";
            mediaUrl?: string;
            audioDuration?: number;
        }) => {
            try {
                const { matchId, text, type = "text", mediaUrl, audioDuration } = data;

                if (!userId) {
                    socket.emit("error", { message: "Unauthorized" });
                    return;
                }

                // Verify the match exists and user is part of it
                const match = await Matches.findById(matchId);
                if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
                    socket.emit("error", { message: "Access denied" });
                    return;
                }

                const receiverId = match.user1Id === userId ? match.user2Id : match.user1Id;

                const message = new Messages({
                    matchId,
                    senderId: userId,
                    receiverId,
                    text,
                    type,
                    mediaUrl,
                    audioDuration,
                    isRead: false
                });

                await message.save();

                // Update match's lastInteractionAt
                await Matches.findByIdAndUpdate(matchId, {
                    lastInteractionAt: new Date()
                });

                // Emit to match room (both users)
                io.to(`match:${matchId}`).emit("new_message", message);

                // Also emit to receiver's user room for inbox updates
                io.to(`user:${receiverId}`).emit("inbox_update", {
                    matchId,
                    lastMessage: message
                });

                // Send push notification to receiver (if they have tokens)
                try {
                    const [senderUser, receiverUser] = await Promise.all([
                        User.findOne({ user_id: userId }).lean(),
                        User.findOne({ user_id: receiverId }).lean(),
                    ]);

                    const senderName = senderUser?.profile
                        ? `${senderUser.profile.firstName || ""} ${senderUser.profile.lastName || ""}`.trim() || senderUser.displayName || senderUser.email?.split("@")[0]
                        : senderUser?.displayName || senderUser?.email?.split("@")[0] || "";

                    const senderAvatar = senderUser?.photoURL
                        || senderUser?.profile?.photos?.find((p: any) => p.isPrimary)?.url
                        || senderUser?.profile?.photos?.[0]?.url
                        || "";

                    const receiverTokens = Array.isArray((receiverUser as any)?.notificationTokens)
                        ? (receiverUser as any).notificationTokens as string[]
                        : [];

                    if (receiverTokens.length > 0) {
                        await sendMessageNotification({
                            matchId: String(matchId),
                            userName: senderName || "New message",
                            userAvatar: senderAvatar,
                            otherUserId: receiverId,
                            expo_tokens: receiverTokens,
                            messageText: type === "audio" ? "Voice note" : text,
                            messageType: type,
                        });
                    }
                } catch (notifyError) {
                }

            } catch (error) {
                socket.emit("error", { message: "Failed to send message" });
            }
        });

        // Typing indicator
        socket.on("typing_start", (data: { matchId: string }) => {
            const { matchId } = data;
            socket.to(`match:${matchId}`).emit("user_typing", { userId });
        });

        socket.on("typing_stop", (data: { matchId: string }) => {
            const { matchId } = data;
            socket.to(`match:${matchId}`).emit("user_stopped_typing", { userId });
        });

        // Mark messages as read
        socket.on("mark_as_read", async (data: { matchId: string }) => {
            try {
                const { matchId } = data;

                if (!userId) {
                    socket.emit("error", { message: "Unauthorized" });
                    return;
                }

                // Verify the match exists and user is part of it
                const match = await Matches.findById(matchId);
                if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
                    socket.emit("error", { message: "Access denied" });
                    return;
                }

                const result = await Messages.updateMany(
                    {
                        matchId: new mongoose.Types.ObjectId(matchId),
                        receiverId: userId,
                        isRead: false
                    },
                    {
                        $set: {
                            isRead: true,
                            readAt: new Date()
                        }
                    }
                );

                // Notify the sender that their messages were read
                const senderId = match.user1Id === userId ? match.user2Id : match.user1Id;
                io.to(`user:${senderId}`).emit("messages_read", {
                    matchId,
                    count: result.modifiedCount
                });

                // Emit inbox_update to the user who read the messages to update their local inbox
                io.to(`user:${userId}`).emit("inbox_update", {
                    matchId
                });

            } catch (error) {
                socket.emit("error", { message: "Failed to mark messages as read" });
            }
        });

        // Voice call events
        // Presence check for enabling/disabling the call button client-side
        socket.on(
            "call_presence",
            async (
                data: { matchId: string; receiverId: string },
                ack?: (res: { receiverOnline: boolean }) => void
            ) => {
                try {
                    const { matchId, receiverId } = data;

                    if (!userId) {
                        ack?.({ receiverOnline: false });
                        return;
                    }

                    // Verify the match exists and user is part of it (same rules as call_initiate)
                    const match = await Matches.findById(matchId);
                    if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
                        ack?.({ receiverOnline: false });
                        return;
                    }

                    // Verify receiver is the other user in the match
                    const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
                    if (otherUserId !== receiverId) {
                        ack?.({ receiverOnline: false });
                        return;
                    }

                    const receiverRoom = `user:${receiverId}`;
                    const roomInfo = io.sockets.adapter.rooms.get(receiverRoom);
                    const receiverOnline = !!roomInfo && roomInfo.size > 0;

                    ack?.({ receiverOnline });
                } catch (error) {
                    ack?.({ receiverOnline: false });
                }
            }
        );

        socket.on("call_initiate", async (data: { matchId: string; receiverId: string; callType?: "voice" | "video"; offer?: any }) => {
            try {
                const { matchId, receiverId, callType = "voice", offer } = data;

                if (!userId) {
                    socket.emit("error", { message: "Unauthorized" });
                    return;
                }

                // Verify the match exists and user is part of it
                const match = await Matches.findById(matchId);
                if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
                    socket.emit("error", { message: "Access denied to this match" });
                    return;
                }

                // Verify receiver is the other user in the match
                const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
                if (otherUserId !== receiverId) {
                    socket.emit("error", { message: "Receiver is not part of this match" });
                    return;
                }

                // Online-only calling: if receiver is not currently connected, tell the caller immediately.
                const receiverRoom = `user:${receiverId}`;
                const roomInfo = io.sockets.adapter.rooms.get(receiverRoom);
                const receiverOnline = !!roomInfo && roomInfo.size > 0;

                if (!receiverOnline) {
                    socket.emit("call_unavailable", {
                        matchId,
                        receiverId,
                        reason: "offline",
                        callType,
                    });
                    return;
                }

                // Notify the receiver about incoming call with WebRTC offer
                io.to(`user:${receiverId}`).emit("call_incoming", {
                    matchId,
                    callerId: userId,
                    callerIdentity: userId,
                    callType,
                    offer, // Include WebRTC offer for WebRTC signaling
                });

                // Confirm to caller
                socket.emit("call_initiated", {
                    matchId,
                    receiverId,
                    callType,
                });

            } catch (error) {
                socket.emit("error", { message: "Failed to initiate call" });
            }
        });

        socket.on("call_answer", (data: { matchId: string; callerId: string; answer?: any }) => {
            const { matchId, callerId, answer } = data;
            // Notify caller that call was answered with WebRTC answer
            io.to(`user:${callerId}`).emit("call_answer", {
                matchId,
                receiverId: userId,
                receiverIdentity: userId,
                answer, // Include WebRTC answer for WebRTC signaling
            });
        });

        socket.on("call_reject", (data: { matchId: string; callerId: string }) => {
            const { matchId, callerId } = data;
            // Notify caller that call was rejected
            io.to(`user:${callerId}`).emit("call_rejected", {
                matchId,
                receiverId: userId,
            });
        });

        socket.on("call_end", (data: { matchId: string; otherUserId: string }) => {
            const { matchId, otherUserId } = data;
            // Notify the other user that call ended
            io.to(`user:${otherUserId}`).emit("call_ended", {
                matchId,
                endedBy: userId,
            });
        });

        // WebRTC ICE candidate forwarding
        socket.on("webrtc_ice_candidate", (data: { matchId: string; receiverId: string; candidate: any }) => {
            const { matchId, receiverId, candidate } = data;
            // Forward ICE candidate to the other peer
            io.to(`user:${receiverId}`).emit("webrtc_ice_candidate", {
                matchId,
                candidate,
            });
        });

        // ─── Explore Call Events ──────────────────────────────────────────

        socket.on("explore_call_initiate", async (data: {
            employeeUserId: string;
            callType?: "voice" | "video";
            offer?: any;
        }) => {
            try {
                const { employeeUserId, callType = "voice", offer } = data;

                if (!userId) {
                    socket.emit("error", { message: "Unauthorized" });
                    return;
                }

                // Verify the target is an employee
                const employee = await User.findOne({
                    user_id: employeeUserId,
                    "girlEmployDetails.isGirlEmployee": true,
                    status: "active",
                }).lean();

                if (!employee) {
                    socket.emit("explore_call_error", { reason: "employee_not_found" });
                    return;
                }

                // Video calls require a paid subscription
                if (callType === "video") {
                    const caller = await User.findOne({ user_id: userId }).select("subscription").lean();
                    const plan = caller?.subscription?.plan;
                    const status = caller?.subscription?.status;
                    if (!plan || plan === "free" || status !== "active") {
                        socket.emit("explore_call_error", { reason: "subscription_required_for_video" });
                        return;
                    }
                }

                // Check token balance
                const balance = await checkBalance(userId);
                if (balance < 1) {
                    socket.emit("explore_call_error", { reason: "insufficient_balance", balance: 0 });
                    return;
                }

                // Check if employee is online
                const receiverRoom = `user:${employeeUserId}`;
                const roomInfo = io.sockets.adapter.rooms.get(receiverRoom);
                const receiverOnline = !!roomInfo && roomInfo.size > 0;

                if (!receiverOnline) {
                    socket.emit("explore_call_unavailable", {
                        employeeUserId,
                        reason: "offline",
                    });
                    return;
                }

                // Create call record
                const call = await Call.create({
                    callerId: userId,
                    receiverId: employeeUserId,
                    callType,
                    callContext: "explore",
                    status: "initiated",
                });

                // Fetch caller's display name for the employee's incoming call screen
                const callerUser = await User.findOne({ user_id: userId })
                    .select("displayName profile.firstName profile.lastName photoURL profile.photos")
                    .lean();
                const callerName = callerUser?.profile?.firstName
                    ? `${callerUser.profile.firstName}${callerUser.profile.lastName ? ` ${callerUser.profile.lastName}` : ""}`
                    : callerUser?.displayName || "User";
                const callerAvatar = callerUser?.photoURL
                    || callerUser?.profile?.photos?.find((p: any) => p.isPrimary)?.url
                    || callerUser?.profile?.photos?.[0]?.url
                    || "";

                // Notify employee
                io.to(receiverRoom).emit("explore_call_incoming", {
                    callId: call._id.toString(),
                    callerId: userId,
                    callerIdentity: userId,
                    callerName,
                    callerAvatar,
                    callType,
                    offer,
                });

                // Confirm to caller
                socket.emit("explore_call_initiated", {
                    callId: call._id.toString(),
                    employeeUserId,
                    callType,
                    balance,
                });

            } catch (error) {
                console.error("Error initiating explore call:", error);
                socket.emit("error", { message: "Failed to initiate explore call" });
            }
        });

        socket.on("explore_call_answer", async (data: {
            callId: string;
            callerId: string;
            answer?: any;
        }) => {
            const { callId, callerId, answer } = data;

            if (!userId) return;

            // Update call status to connected
            const call = await Call.findByIdAndUpdate(callId, {
                status: "connected",
                startedAt: new Date(),
            }, { new: true });

            if (!call) return;

            // Notify caller
            io.to(`user:${callerId}`).emit("explore_call_answer", {
                callId,
                receiverId: userId,
                receiverIdentity: userId,
                answer,
            });

            // Deduct first token immediately on connect
            const firstDeduct = await deductToken(callerId, call._id as mongoose.Types.ObjectId);
            if (!firstDeduct.success) {
                io.to(`user:${callerId}`).emit("explore_call_balance_exhausted", { callId });
                io.to(`user:${userId}`).emit("explore_call_ended", { callId, endedBy: "system" });
                await Call.findByIdAndUpdate(callId, { status: "ended", endedAt: new Date(), tokensSpent: 0 });
                return;
            }

            // Emit initial balance to caller
            io.to(`user:${callerId}`).emit("explore_call_tick", {
                callId,
                remainingBalance: firstDeduct.newBalance,
                minutesElapsed: 1,
            });

            // Start per-minute deduction timer
            const callKey = getExploreCallKey(callerId, userId);
            const intervalId = setInterval(async () => {
                const activeCall = activeExploreCalls.get(callKey);
                if (!activeCall) {
                    clearInterval(intervalId);
                    return;
                }

                activeCall.tickCount += 1;

                const result = await deductToken(callerId, activeCall.callId);
                if (!result.success) {
                    // Balance exhausted — end call
                    io.to(`user:${callerId}`).emit("explore_call_balance_exhausted", { callId });
                    io.to(`user:${activeCall.receiverId}`).emit("explore_call_ended", {
                        callId,
                        endedBy: "system",
                    });

                    clearInterval(intervalId);
                    activeExploreCalls.delete(callKey);

                    const now = new Date();
                    const durationSeconds = Math.floor((now.getTime() - activeCall.startedAt.getTime()) / 1000);
                    await Call.findByIdAndUpdate(callId, {
                        status: "ended",
                        endedAt: now,
                        durationSeconds,
                        tokensSpent: activeCall.tickCount,
                    });
                    return;
                }

                io.to(`user:${callerId}`).emit("explore_call_tick", {
                    callId,
                    remainingBalance: result.newBalance,
                    minutesElapsed: activeCall.tickCount + 1,
                });
            }, 60_000);

            activeExploreCalls.set(callKey, {
                callId: call._id as mongoose.Types.ObjectId,
                callerId,
                receiverId: userId,
                callType: call.callType,
                intervalId,
                startedAt: new Date(),
                tickCount: 1,
            });
        });

        socket.on("explore_call_reject", async (data: { callId: string; callerId: string }) => {
            const { callId, callerId } = data;

            await Call.findByIdAndUpdate(callId, { status: "rejected" });

            io.to(`user:${callerId}`).emit("explore_call_rejected", {
                callId,
                receiverId: userId,
            });
        });

        socket.on("explore_call_end", async (data: { callId: string; otherUserId: string }) => {
            const { callId, otherUserId } = data;

            if (!userId) return;

            // Notify the other side
            io.to(`user:${otherUserId}`).emit("explore_call_ended", {
                callId,
                endedBy: userId,
            });

            // Clean up active call timer
            const callKey1 = getExploreCallKey(userId, otherUserId);
            const callKey2 = getExploreCallKey(otherUserId, userId);
            const activeCall = activeExploreCalls.get(callKey1) || activeExploreCalls.get(callKey2);

            if (activeCall) {
                clearInterval(activeCall.intervalId);
                activeExploreCalls.delete(callKey1);
                activeExploreCalls.delete(callKey2);

                const now = new Date();
                const durationSeconds = Math.floor((now.getTime() - activeCall.startedAt.getTime()) / 1000);
                await Call.findByIdAndUpdate(callId, {
                    status: "ended",
                    endedAt: now,
                    durationSeconds,
                    tokensSpent: activeCall.tickCount,
                });
            } else {
                // Call never connected or already cleaned up
                await Call.findByIdAndUpdate(callId, {
                    status: "ended",
                    endedAt: new Date(),
                });
            }
        });

        socket.on("explore_call_presence", async (
            data: { employeeUserId: string },
            ack?: (res: { receiverOnline: boolean }) => void
        ) => {
            try {
                const { employeeUserId } = data;
                const receiverRoom = `user:${employeeUserId}`;
                const roomInfo = io.sockets.adapter.rooms.get(receiverRoom);
                const receiverOnline = !!roomInfo && roomInfo.size > 0;
                ack?.({ receiverOnline });
            } catch {
                ack?.({ receiverOnline: false });
            }
        });

        socket.on("explore_webrtc_ice_candidate", (data: {
            callId: string;
            receiverId: string;
            candidate: any;
        }) => {
            const { callId, receiverId, candidate } = data;
            io.to(`user:${receiverId}`).emit("explore_webrtc_ice_candidate", {
                callId,
                candidate,
            });
        });

        // ─── Disconnect ──────────────────────────────────────────────────

        socket.on("disconnect", () => {
            if (!userId) return;

            // Clean up any active explore calls this user was in
            for (const [key, call] of activeExploreCalls.entries()) {
                if (call.callerId === userId || call.receiverId === userId) {
                    clearInterval(call.intervalId);

                    const otherUserId = call.callerId === userId ? call.receiverId : call.callerId;
                    io.to(`user:${otherUserId}`).emit("explore_call_ended", {
                        callId: call.callId.toString(),
                        endedBy: userId,
                    });

                    const now = new Date();
                    const durationSeconds = Math.floor((now.getTime() - call.startedAt.getTime()) / 1000);
                    Call.findByIdAndUpdate(call.callId, {
                        status: "ended",
                        endedAt: now,
                        durationSeconds,
                        tokensSpent: call.tickCount,
                    }).catch(() => {});

                    activeExploreCalls.delete(key);
                }
            }
        });
    });

    return io;
};

