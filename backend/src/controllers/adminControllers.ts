import { Request, Response } from "express";
import mongoose from "mongoose";
import { User, IUser } from "../models/User";
import { Interaction } from "../models/Interactions";
import { Matches } from "../models/Matches";
import { Messages } from "../models/Messages";
import { Subscription } from "../models/subscription";
import { Report } from "../models/Report";
import { Story } from "../models/Story";
import { Support } from "../models/Support";

// Helper to get date range
const getDateRange = (filter: string) => {
    const now = new Date();
    let start: Date;

    switch (filter) {
        case "today":
            start = new Date(now.setHours(0, 0, 0, 0));
            break;
        case "7d":
            start = new Date(now.setDate(now.getDate() - 7));
            break;
        case "30d":
            start = new Date(now.setDate(now.getDate() - 30));
            break;
        default:
            start = new Date(0); // All time
    }

    return { start, end: new Date() };
};

// 1. User Analytics
export const getUserAnalytics = async (req: Request, res: Response) => {
    try {
        const { filter = "30d", startDate, endDate } = req.query;

        let dateRange: { start: Date; end: Date };
        if (startDate && endDate) {
            dateRange = {
                start: new Date(startDate as string),
                end: new Date(endDate as string),
            };
        } else {
            dateRange = getDateRange(filter as string);
        }

        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // New users
        const newUsers = await User.countDocuments({
            createdAt: { $gte: dateRange.start, $lte: dateRange.end },
        });

        // Active users (lastActiveAt <= 24h, using lastLoginAt as proxy)
        const activeUsers24h = await User.countDocuments({
            lastLoginAt: { $gte: oneDayAgo },
            status: "active",
        });

        const activeUsers7d = await User.countDocuments({
            lastLoginAt: { $gte: sevenDaysAgo },
            status: "active",
        });

        // Inactive users (lastActiveAt > 30d)
        const inactiveUsers = await User.countDocuments({
            $or: [
                { lastLoginAt: { $lt: thirtyDaysAgo } },
                { lastLoginAt: { $exists: false } },
            ],
            status: "active",
        });

        // Deleted/Banned users
        const deletedUsers = await User.countDocuments({
            status: "deleted",
            updatedAt: { $gte: dateRange.start, $lte: dateRange.end },
        });

        const bannedUsers = await User.countDocuments({
            status: "banned",
            updatedAt: { $gte: dateRange.start, $lte: dateRange.end },
        });

        res.json({
            success: true,
            data: {
                newUsers,
                activeUsers: {
                    last24h: activeUsers24h,
                    last7d: activeUsers7d,
                },
                inactiveUsers,
                deletedUsers,
                bannedUsers,
                dateRange: {
                    start: dateRange.start,
                    end: dateRange.end,
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch user analytics" });
    }
};

export const getUsersList = async (req: Request, res: Response) => {
    try {
        const { filter = "all", status, page = 1, limit = 50, search } = req.query;

        // Validate and sanitize pagination parameters
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(200, Math.max(10, Number(limit) || 50)); // Min 10, Max 200
        const skip = (pageNum - 1) * limitNum;

        let query: any = {};

        // Status filter
        if (status && status !== "all") {
            query.status = status;
        }

        // Search by email, displayName, or user_id
        if (search) {
            query.$or = [
                { email: { $regex: search as string, $options: "i" } },
                { displayName: { $regex: search as string, $options: "i" } },
                { user_id: { $regex: search as string, $options: "i" } },
            ];
        }

        // Time-based filters
        if (filter === "new") {
            const dateRange = getDateRange("30d");
            query.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
        } else if (filter === "active") {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            query.lastLoginAt = { $gte: sevenDaysAgo };
            query.status = "active";
        } else if (filter === "inactive") {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            query.$or = [
                { lastLoginAt: { $lt: thirtyDaysAgo } },
                { lastLoginAt: { $exists: false } },
            ];
            query.status = "active";
        } else if (filter === "premium") {
            query["subscription.status"] = "active";
        } else if ( filter === "womenEmployees") {
            query.email = { $regex: "@pookiey\\.com", $options: "i" };
            query["profile.gender"] = "female";
        }

        const users = await User.find(query)
            .select("user_id email displayName photoURL status createdAt lastLoginAt subscription profile.location")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum),
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch users" });
    }
};

// 2. Interaction Counts
export const getInteractionStats = async (req: Request, res: Response) => {
    try {
        const { filter = "today" } = req.query;
        const dateRange = getDateRange(filter as string);

        // Overall stats
        const likesSent = await Interaction.countDocuments({
            type: { $in: ["like", "superlike"] },
            createdAt: { $gte: dateRange.start, $lte: dateRange.end },
        });

        const matches = await Matches.countDocuments({
            status: "matched",
            createdAt: { $gte: dateRange.start, $lte: dateRange.end },
        });

        const messagesSent = await Messages.countDocuments({
            createdAt: { $gte: dateRange.start, $lte: dateRange.end },
        });

        // Get daily trends for last 30 days
        const trends = [];
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
            const dayStart = new Date(now);
            dayStart.setDate(dayStart.getDate() - i);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setHours(23, 59, 59, 999);

            const likes = await Interaction.countDocuments({
                type: { $in: ["like", "superlike"] },
                createdAt: { $gte: dayStart, $lte: dayEnd },
            });

            const matchesCount = await Matches.countDocuments({
                status: "matched",
                createdAt: { $gte: dayStart, $lte: dayEnd },
            });

            const messages = await Messages.countDocuments({
                createdAt: { $gte: dayStart, $lte: dayEnd },
            });

            trends.push({
                date: dayStart.toISOString().split("T")[0],
                likes,
                matches: matchesCount,
                messages,
            });
        }

        res.json({
            success: true,
            data: {
                overall: {
                    likesSent,
                    matches,
                    messagesSent,
                },
                trends,
                dateRange: {
                    start: dateRange.start,
                    end: dateRange.end,
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch interaction stats" });
    }
};

export const getUserDetails = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const decodedUserId = decodeURIComponent(userId);

        // Try to find user by email first, then by user_id
        let user = await User.findOne({ email: decodedUserId }).lean();

        if (!user) {
            // If not found by email, try by user_id
            user = await User.findOne({ user_id: decodedUserId }).lean();
        }

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const user_id = user.user_id;

        // Get interaction stats
        const likesSent = await Interaction.countDocuments({ fromUser: user_id });
        const likesReceived = await Interaction.countDocuments({ toUser: user_id });
        const matches = await Matches.countDocuments({
            $or: [{ user1Id: user_id }, { user2Id: user_id }],
            status: "matched",
        });
        const messagesSent = await Messages.countDocuments({ senderId: user_id });
        const reportsAgainst = await Report.countDocuments({ reportedUser: user_id });

        // Get subscription history
        const subscriptions = await Subscription.find({ user_id: user_id })
            .sort({ createdAt: -1 })
            .lean();

        // Get user stories (including expired ones for admin view)
        const stories = await Story.find({ userId: user_id })
            .sort({ createdAt: -1 })
            .lean();

        // Calculate age from dateOfBirth
        let age: number | null = null;
        if (user.profile?.dateOfBirth) {
            const today = new Date();
            const birthDate = new Date(user.profile.dateOfBirth);
            age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
        }

        res.json({
            success: true,
            data: {
                // Basic Info
                user: {
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    phoneNumber: user.phoneNumber,
                    provider: user.provider,
                    isEmailVerified: user.isEmailVerified,
                    isPhoneVerified: user.isPhoneVerified,
                    status: user.status,
                    referralCode: user.referralCode,
                },
                // Profile
                profile: user.profile ? {
                    firstName: user.profile.firstName,
                    lastName: user.profile.lastName,
                    dateOfBirth: user.profile.dateOfBirth,
                    age,
                    gender: user.profile.gender,
                    bio: user.profile.bio,
                    location: user.profile.location,
                    photos: user.profile.photos,
                    interests: user.profile.interests,
                    height: user.profile.height,
                    education: user.profile.education,
                    occupation: user.profile.occupation,
                    company: user.profile.company,
                    school: user.profile.school,
                    isOnboarded: user.profile.isOnboarded,
                } : null,
                // Preferences
                preferences: user.preferences,
                // Subscription
                subscription: user.subscription,
                subscriptions: subscriptions,
                // Account Info
                account: {
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                    lastLoginAt: user.lastLoginAt,
                    dailyInteractionCount: user.dailyInteractionCount,
                    lastInteractionResetAt: user.lastInteractionResetAt,
                },
                // Interactions
                interactions: {
                    likesSent,
                    likesReceived,
                    matches,
                    messagesSent,
                    reportsAgainst,
                },
                // Stories
                stories: stories.map((story: any) => ({
                    id: story._id.toString(),
                    type: story.type,
                    mediaUrl: story.mediaUrl,
                    views: story.views.length,
                    createdAt: story.createdAt,
                    expiresAt: story.expiresAt,
                    isExpired: new Date(story.expiresAt) < new Date(),
                })),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch user details" });
    }
};

export const getUserInteractions = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params; // This is actually email now

        // Find user by email to get user_id
        const user = await User.findOne({ email: decodeURIComponent(userId) });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const user_id = user.user_id;

        const likesSent = await Interaction.countDocuments({ fromUser: user_id });
        const likesReceived = await Interaction.countDocuments({ toUser: user_id });
        const matches = await Matches.countDocuments({
            $or: [{ user1Id: user_id }, { user2Id: user_id }],
            status: "matched",
        });
        const messagesSent = await Messages.countDocuments({ senderId: user_id });
        const reportsAgainst = await Report.countDocuments({ reportedUser: user_id });

        res.json({
            success: true,
            data: {
                likesSent,
                likesReceived,
                matches,
                messagesSent,
                reportsAgainst,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch user interactions" });
    }
};

// 3. Users by Location
export const getUsersByLocation = async (req: Request, res: Response) => {
    try {
        const { country, state, city } = req.query;

        let query: any = {
            "profile.location": { $exists: true },
            status: "active",
        };

        if (country) {
            query["profile.location.country"] = country;
        }
        if (state) {
            query["profile.location.state"] = state;
        }
        if (city) {
            query["profile.location.city"] = city;
        }

        const users = await User.find(query)
            .select("user_id email displayName photoURL profile.location createdAt lastLoginAt")
            .lean();

        // Aggregate by location
        const locationStats: Record<string, any> = {};
        users.forEach((user) => {
            const loc = user.profile?.location;
            if (loc) {
                const key = `${loc.country || "Unknown"}-${loc.city || "Unknown"}`;
                if (!locationStats[key]) {
                    locationStats[key] = {
                        country: loc.country || "Unknown",
                        city: loc.city || "Unknown",
                        count: 0,
                        coordinates: loc.coordinates,
                    };
                }
                locationStats[key].count++;
            }
        });

        res.json({
            success: true,
            data: {
                users,
                locationStats: Object.values(locationStats),
                total: users.length,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch users by location" });
    }
};

// 4. Premium Users & Revenue
export const getPremiumStats = async (req: Request, res: Response) => {
    try {
        const { filter = "all" } = req.query;

        let dateQuery: any = {};
        if (filter === "today") {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            dateQuery.createdAt = { $gte: today };
        } else if (filter === "30d") {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            dateQuery.createdAt = { $gte: thirtyDaysAgo };
        }

        const activeSubscriptions = await Subscription.countDocuments({
            status: "active",
            ...dateQuery,
        });

        const expiredSubscriptions = await Subscription.countDocuments({
            status: "expired",
            ...dateQuery,
        });

        // Calculate revenue (you'll need to add amount field to Subscription or join with payment model)
        const subscriptions = await Subscription.find({
            status: "active",
            ...dateQuery,
        }).lean();

        // Get premium users list
        const premiumUsers = await User.find({
            "subscription.status": "active",
        })
            .select("user_id email displayName photoURL subscription createdAt")
            .sort({ "subscription.endDate": -1 })
            .lean();

        res.json({
            success: true,
            data: {
                totalPremiumUsers: premiumUsers.length,
                activeSubscriptions,
                expiredSubscriptions,
                premiumUsers,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch premium stats" });
    }
};

// 5. Reports & Moderation
export const getReports = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const reports = await Report.find()
            .populate("reportedBy", "user_id email displayName")
            .populate("reportedUser", "user_id email displayName photoURL")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        // Get report counts per user
        const reportCounts = await Report.aggregate([
            {
                $group: {
                    _id: "$reportedUser",
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
        ]);

        const total = await Report.countDocuments();

        res.json({
            success: true,
            data: {
                reports,
                reportCounts,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit)),
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch reports" });
    }
};

export const updateUserStatus = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params; // This is actually email now
        const { status } = req.body; // status: "active" | "banned" | "deleted" | "suspended"

        const decodedUserId = decodeURIComponent(userId);

        // Try to find user by email first, then by user_id
        let user = await User.findOne({ email: decodedUserId });

        if (!user) {
            user = await User.findOne({ user_id: decodedUserId });
        }

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Validate status
        const validStatuses = ["active", "banned", "deleted", "suspended"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        user.status = status as "active" | "banned" | "deleted" | "suspended";
        await user.save();

        res.json({
            success: true,
            data: {
                email: user.email,
                status: user.status,
            },
            message: `User status updated to ${status} successfully`,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update user status" });
    }
};

export const moderateUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params; // This is actually email now
        const { action, reason } = req.body; // action: "warn" | "shadowBan" | "ban"

        const decodedUserId = decodeURIComponent(userId);

        // Try to find user by email first, then by user_id
        let user = await User.findOne({ email: decodedUserId });

        if (!user) {
            user = await User.findOne({ user_id: decodedUserId });
        }

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (action === "ban") {
            user.status = "banned";
            await user.save();
        } else if (action === "warn") {
            // You might want to add a warnings array to User model
            // For now, just log it
        } else if (action === "shadowBan") {
            // Shadow ban - user appears active but their content is hidden
            // You might want to add a shadowBanned field
            (user as any).shadowBanned = true;
            await user.save();
        }

        res.json({
            success: true,
            data: user,
            message: `User ${action}ed successfully`,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to moderate user" });
    }
};

// 6. Dashboard Overview
export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const today = new Date(now.setHours(0, 0, 0, 0));
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Quick stats
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({
            lastLoginAt: { $gte: sevenDaysAgo },
            status: "active",
        });
        const premiumUsers = await User.countDocuments({
            "subscription.status": "active",
        });
        const newUsersToday = await User.countDocuments({
            createdAt: { $gte: today },
        });

        const likesToday = await Interaction.countDocuments({
            type: { $in: ["like", "superlike"] },
            createdAt: { $gte: today },
        });

        const matchesToday = await Matches.countDocuments({
            status: "matched",
            createdAt: { $gte: today },
        });

        const messagesToday = await Messages.countDocuments({
            createdAt: { $gte: today },
        });

        const activeReports = await Report.countDocuments();

        res.json({
            success: true,
            data: {
                users: {
                    total: totalUsers,
                    active: activeUsers,
                    premium: premiumUsers,
                    newToday: newUsersToday,
                },
                interactions: {
                    likesToday,
                    matchesToday,
                    messagesToday,
                },
                moderation: {
                    activeReports,
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch dashboard stats" });
    }
};

// Support Messages
export const getSupportMessages = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 50, status } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const query: any = {};
        if (status) {
            query.status = status;
        }

        const supportMessages = await Support.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        // Get user info for each support message
        const supportMessagesWithUser = await Promise.all(
            supportMessages.map(async (msg) => {
                const user = await User.findOne({ user_id: msg.userId as string });
                return {
                    ...msg,
                    user: user
                        ? {
                            user_id: user.user_id,
                            email: user.email,
                            displayName: user.displayName,
                            photoURL: user.photoURL,
                        }
                        : null,
                };
            })
        );

        const total = await Support.countDocuments(query);

        // Get status counts
        const statusCounts = await Support.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]);

        res.json({
            success: true,
            data: {
                supportMessages: supportMessagesWithUser,
                statusCounts,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit)),
                },
            },
        });
    } catch (error) {
    }
};

export const updateSupportStatus = async (req: Request, res: Response) => {
    try {
        const { supportId } = req.params;
        const { status, response, priority } = req.body;
        const admin = req.user as any as IUser;


        if (!supportId) {
            return res.status(400).json({
                success: false,
                message: "Support ID is required",
            });
        }

        // Validate MongoDB ObjectId format
        if (!mongoose.Types.ObjectId.isValid(supportId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid support ID format",
            });
        }

        const validStatuses = ["pending", "in_progress", "resolved", "closed"];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status. Must be one of: pending, in_progress, resolved, closed",
            });
        }

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status is required",
            });
        }

        // Build update object
        const updateData: any = {};

        if (status) {
            updateData.status = status as "pending" | "in_progress" | "resolved" | "closed";
        }

        if (priority && ["low", "medium", "high", "urgent"].includes(priority)) {
            updateData.priority = priority as "low" | "medium" | "high" | "urgent";
        }

        if (response && response.trim()) {
            updateData.response = response.trim();
            updateData.respondedAt = new Date();
            updateData.respondedBy = admin.user_id;
        }

        // Use findByIdAndUpdate to avoid full document validation
        const supportMessage = await Support.findByIdAndUpdate(
            supportId,
            { $set: updateData },
            { new: true, runValidators: false }
        );

        if (!supportMessage) {
            return res.status(404).json({ success: false, message: "Support message not found" });
        }

        res.json({
            success: true,
            data: supportMessage,
            message: `Support message updated successfully`,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({
            success: false,
            message: `Failed to update support message status: ${errorMessage}`
        });
    }
};
