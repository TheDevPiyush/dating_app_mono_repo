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
import { Call } from "../models/call";

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

// Women employees: list users with email @pookiey.com and profile.gender === female
export const getWomenEmployees = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(200, Math.max(10, Number(limit) || 50));
        const skip = (pageNum - 1) * limitNum;

        const query = {
            email: { $regex: "@pookiey\\.com", $options: "i" },
            "profile.gender": "female",
        };

        const users = await User.find(query)
            .select("user_id email displayName photoURL status createdAt lastLoginAt profile")
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
        res.status(500).json({ success: false, message: "Failed to fetch women employees" });
    }
};

// Women employee analytics (call-based metrics for receiverId = employee)
// Query: range = "today" | "weekly" | "monthly" | "all" — filters metrics and timeSeries to that window
export const getWomenEmployeeAnalytics = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const range = (req.query.range as string) || "all";
        const validRange = ["today", "weekly", "monthly", "all"].includes(range) ? range : "all";
        const decodedUserId = decodeURIComponent(userId);

        const user = await User.findOne({
            $and: [
                { $or: [{ email: decodedUserId }, { user_id: decodedUserId }] },
                { email: { $regex: "@pookiey\\.com", $options: "i" } },
                { "profile.gender": "female" },
            ],
        }).lean();

        if (!user) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        const employeeId = user.user_id;
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 7);
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOf30Days = new Date(now);
        startOf30Days.setDate(now.getDate() - 30);
        startOf30Days.setHours(0, 0, 0, 0);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        const newCallerThreshold = new Date(now);
        newCallerThreshold.setDate(now.getDate() - 30);
        newCallerThreshold.setHours(0, 0, 0, 0);

        const baseMatch = { receiverId: employeeId };
        const dateFilter =
            validRange === "today"
                ? { createdAt: { $gte: startOfToday } }
                : validRange === "weekly"
                    ? { createdAt: { $gte: startOfWeek } }
                    : validRange === "monthly"
                        ? { createdAt: { $gte: startOf30Days } }
                        : {};
        const rangeMatch = { ...baseMatch, ...(Object.keys(dateFilter).length ? dateFilter : {}) };

        const [
            allCalls,
            endedCalls,
            rangeCalls,
            rangeEndedCalls,
            weeklyAgg,
            monthlyAgg,
            statusBreakdown,
            typeBreakdown,
            byHour,
            byDay,
            callerCounts,
            thisMonthCalls,
            lastMonthCalls,
            timeSeriesWeekly,
            timeSeriesMonthly,
            timeSeriesTodayByHour,
            callersAgg,
        ] = await Promise.all([
            Call.find(baseMatch).lean(),
            Call.find({ ...baseMatch, status: "ended" }).lean(),
            Call.find(rangeMatch).lean(),
            Call.find({ ...rangeMatch, status: "ended" }).lean(),
            Call.aggregate([
                { $match: { ...baseMatch, status: "ended", createdAt: { $gte: startOfWeek } } },
                { $group: { _id: null, total: { $sum: "$durationSeconds" } } },
            ]),
            Call.aggregate([
                { $match: { ...baseMatch, status: "ended", createdAt: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: "$durationSeconds" } } },
            ]),
            Call.aggregate([
                { $match: rangeMatch },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
            Call.aggregate([
                { $match: rangeMatch },
                { $group: { _id: "$callType", count: { $sum: 1 } } },
            ]),
            Call.aggregate([
                { $match: rangeMatch },
                { $project: { hour: { $hour: "$createdAt" } } },
                { $group: { _id: "$hour", count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            Call.aggregate([
                { $match: rangeMatch },
                { $project: { day: { $dayOfWeek: "$createdAt" } } },
                { $group: { _id: "$day", count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            Call.aggregate([
                { $match: baseMatch },
                { $group: { _id: "$callerId", count: { $sum: 1 } } },
            ]),
            Call.countDocuments({ ...baseMatch, status: "ended", createdAt: { $gte: startOfMonth } }),
            Call.countDocuments({ ...baseMatch, status: "ended", createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
            // Time series: last 7 days (for weekly view)
            Call.aggregate([
                { $match: { ...baseMatch, createdAt: { $gte: startOfWeek } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        calls: { $sum: 1 },
                        talkTimeSeconds: { $sum: { $cond: [{ $eq: ["$status", "ended"] }, "$durationSeconds", 0] } },
                        answered: { $sum: { $cond: [{ $eq: ["$status", "ended"] }, 1, 0] } },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
            // Time series: last 30 days by day (for monthly view)
            Call.aggregate([
                { $match: { ...baseMatch, createdAt: { $gte: startOf30Days } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        calls: { $sum: 1 },
                        talkTimeSeconds: { $sum: { $cond: [{ $eq: ["$status", "ended"] }, "$durationSeconds", 0] } },
                        answered: { $sum: { $cond: [{ $eq: ["$status", "ended"] }, 1, 0] } },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
            // Time series: today by hour (for today view)
            Call.aggregate([
                { $match: { ...baseMatch, createdAt: { $gte: startOfToday } } },
                {
                    $group: {
                        _id: { $hour: "$createdAt" },
                        calls: { $sum: 1 },
                        talkTimeSeconds: { $sum: { $cond: [{ $eq: ["$status", "ended"] }, "$durationSeconds", 0] } },
                        answered: { $sum: { $cond: [{ $eq: ["$status", "ended"] }, 1, 0] } },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
            // Callers: who called this employee, with totals (for “who talked longest” etc.)
            Call.aggregate([
                { $match: { ...baseMatch, status: "ended" } },
                {
                    $group: {
                        _id: "$callerId",
                        callCount: { $sum: 1 },
                        totalDurationSeconds: { $sum: "$durationSeconds" },
                        totalTokensSpent: { $sum: "$tokensSpent" },
                        firstCallAt: { $min: "$createdAt" },
                        lastCallAt: { $max: "$createdAt" },
                    },
                },
                { $sort: { totalDurationSeconds: -1 } },
                { $limit: 100 },
            ]),
        ]);

        const totalTalkTimeAll = endedCalls.reduce((s, c) => s + (c.durationSeconds || 0), 0);
        const totalTalkTimeWeekly = weeklyAgg[0]?.total ?? 0;
        const totalTalkTimeMonthly = monthlyAgg[0]?.total ?? 0;
        const totalCallsReceived = allCalls.length;
        const answered = endedCalls.length;

        const rangeTalkTime = rangeEndedCalls.reduce((s, c) => s + (c.durationSeconds || 0), 0);
        const rangeCallsCount = rangeCalls.length;
        const rangeAnswered = rangeEndedCalls.length;
        const rangeLongest =
            rangeEndedCalls.length > 0
                ? Math.max(...rangeEndedCalls.map((c) => c.durationSeconds || 0))
                : 0;
        const rangeAvgDuration =
            rangeEndedCalls.length > 0 ? rangeTalkTime / rangeEndedCalls.length : 0;
        const rangeTokens = rangeCalls.reduce((s, c) => s + (c.tokensSpent || 0), 0);
        const rangeCallerIdCounts = (rangeCalls as { callerId: string }[]).reduce(
            (acc: Record<string, number>, c) => {
                acc[c.callerId] = (acc[c.callerId] || 0) + 1;
                return acc;
            },
            {}
        );
        const rangeUniqueCallersCount = Object.keys(rangeCallerIdCounts).length;
        const rangeRepeatCallersCount = Object.values(rangeCallerIdCounts).filter((n) => n > 1).length;

        const statusMap: Record<string, number> = {};
        statusBreakdown.forEach((r: { _id: string; count: number }) => {
            statusMap[r._id] = r.count;
        });
        const missed = statusMap.missed ?? 0;
        const rejected = statusMap.rejected ?? 0;
        const typeMap: Record<string, number> = {};
        typeBreakdown.forEach((r: { _id: string; count: number }) => {
            typeMap[r._id] = r.count;
        });
        const voiceCalls = typeMap.voice ?? 0;
        const videoCalls = typeMap.video ?? 0;
        const totalTokensEarned = allCalls.reduce((s, c) => s + (c.tokensSpent || 0), 0);
        const uniqueCallers = callerCounts.length;
        const repeatCallers = callerCounts.filter((c: { count: number }) => c.count > 1).length;
        const longestCall = endedCalls.length
            ? Math.max(...endedCalls.map((c) => c.durationSeconds || 0))
            : 0;
        const avgDuration =
            endedCalls.length > 0 ? totalTalkTimeAll / endedCalls.length : 0;
        const answerRate = totalCallsReceived > 0 ? (answered / totalCallsReceived) * 100 : 0;
        const rangeAnswerRate = rangeCallsCount > 0 ? (rangeAnswered / rangeCallsCount) * 100 : 0;
        const lastMonthAnswered = lastMonthCalls;
        const momGrowth =
            lastMonthAnswered > 0
                ? ((thisMonthCalls - lastMonthAnswered) / lastMonthAnswered) * 100
                : (thisMonthCalls > 0 ? 100 : 0);

        const hourLabels = Array.from({ length: 24 }, (_, i) => i);
        const byHourMap: Record<number, number> = {};
        byHour.forEach((r: { _id: number; count: number }) => {
            byHourMap[r._id] = r.count;
        });
        const busiestHours = hourLabels.map((h) => ({ hour: h, count: byHourMap[h] ?? 0 }));

        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const byDayMap: Record<number, number> = {};
        byDay.forEach((r: { _id: number; count: number }) => {
            byDayMap[r._id] = r.count;
        });
        const busiestDays = [1, 2, 3, 4, 5, 6, 7].map((d) => ({
            day: dayNames[d - 1] ?? String(d),
            count: byDayMap[d] ?? 0,
        }));

        const peakHour =
            busiestHours.length > 0
                ? busiestHours.reduce((a, b) => (a.count >= b.count ? a : b), busiestHours[0])
                : { hour: 0, count: 0 };
        const peakDay =
            busiestDays.length > 0
                ? busiestDays.reduce((a, b) => (a.count >= b.count ? a : b), busiestDays[0])
                : { day: "—", count: 0 };

        // Fill gaps in time series for weekly (7 days) and monthly (30 days)
        const fillTimeSeries = (
            points: { _id: string; calls: number; talkTimeSeconds: number; answered?: number }[],
            days: number
        ) => {
            const map = new Map(points.map((p) => [p._id, { date: p._id, calls: p.calls, talkTimeSeconds: p.talkTimeSeconds, answered: p.answered ?? 0 }]));
            const result: { date: string; calls: number; talkTimeSeconds: number; answered: number }[] = [];
            for (let i = days - 1; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const key = d.toISOString().slice(0, 10);
                result.push({
                    date: key,
                    calls: map.get(key)?.calls ?? 0,
                    talkTimeSeconds: map.get(key)?.talkTimeSeconds ?? 0,
                    answered: map.get(key)?.answered ?? 0,
                });
            }
            return result;
        };
        const timeSeries7 = fillTimeSeries(timeSeriesWeekly, 7);
        const timeSeries30 = fillTimeSeries(timeSeriesMonthly, 30);
        const hourMapToday: Record<number, { calls: number; talkTimeSeconds: number; answered: number }> = {};
        (timeSeriesTodayByHour as { _id: number; calls: number; talkTimeSeconds: number; answered: number }[]).forEach((p) => {
            hourMapToday[p._id] = { calls: p.calls, talkTimeSeconds: p.talkTimeSeconds, answered: p.answered ?? 0 };
        });
        const timeSeriesToday = Array.from({ length: 24 }, (_, h) => ({
            date: `${h}:00`,
            label: `${h}:00`,
            calls: hourMapToday[h]?.calls ?? 0,
            talkTimeSeconds: hourMapToday[h]?.talkTimeSeconds ?? 0,
            answered: hourMapToday[h]?.answered ?? 0,
        }));

        const callerIds = callersAgg.map((c: { _id: string }) => c._id);
        const callerUsers = await User.find({ user_id: { $in: callerIds } })
            .select("user_id displayName photoURL email")
            .lean();
        const callerUserMap = new Map(callerUsers.map((u: { user_id: string }) => [u.user_id, u]));

        const callers = callersAgg.map(
            (c: {
                _id: string;
                callCount: number;
                totalDurationSeconds: number;
                totalTokensSpent: number;
                firstCallAt: Date;
                lastCallAt: Date;
            }) => {
                const first = new Date(c.firstCallAt);
                return {
                    callerId: c._id,
                    displayName: (callerUserMap.get(c._id) as { displayName?: string })?.displayName,
                    photoURL: (callerUserMap.get(c._id) as { photoURL?: string })?.photoURL,
                    email: (callerUserMap.get(c._id) as { email?: string })?.email,
                    callCount: c.callCount,
                    totalDurationSeconds: c.totalDurationSeconds,
                    totalTokensSpent: c.totalTokensSpent,
                    firstCallAt: c.firstCallAt,
                    lastCallAt: c.lastCallAt,
                    isNewCaller: first >= newCallerThreshold,
                };
            }
        );

        res.json({
            success: true,
            data: {
                range: validRange,
                employee: {
                    user_id: user.user_id,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    profile: user.profile,
                },
                callActivity: {
                    totalTalkTimeSeconds: totalTalkTimeAll,
                    totalTalkTimeWeeklySeconds: totalTalkTimeWeekly,
                    totalTalkTimeMonthlySeconds: totalTalkTimeMonthly,
                    longestCallSeconds: longestCall,
                    averageCallDurationSeconds: Math.round(avgDuration),
                    totalCallsReceived,
                    answered,
                    missed,
                    rejected,
                    voiceCalls,
                    videoCalls,
                    busiestHours,
                    busiestDays,
                    peakCallTimeWindow: {
                        hour: peakHour.hour,
                        hourLabel: `${peakHour.hour}:00`,
                        count: peakHour.count,
                    },
                    peakDay: peakDay.day,
                    peakDayCount: peakDay.count,
                    rangeTalkTimeSeconds: rangeTalkTime,
                    rangeCallsCount,
                    rangeAnswered,
                    rangeLongestCallSeconds: rangeLongest,
                    rangeAverageCallDurationSeconds: Math.round(rangeAvgDuration),
                    rangeAnswerRatePercent: Math.round(rangeAnswerRate * 10) / 10,
                    rangeTokensEarned: rangeTokens,
                },
                timeSeries: validRange === "today" ? timeSeriesToday : validRange === "weekly" ? timeSeries7 : validRange === "monthly" ? timeSeries30 : timeSeries30,
                earningsAndCallers: {
                    totalTokensEarned: totalTokensEarned,
                    totalRevenueGenerated: totalTokensEarned,
                    uniqueCallersCount: uniqueCallers,
                    repeatCallersCount: repeatCallers,
                    rangeTokensEarned: rangeTokens,
                    rangeUniqueCallersCount,
                    rangeRepeatCallersCount,
                },
                performanceInsights: {
                    callAnswerRatePercent: Math.round(answerRate * 10) / 10,
                    monthOverMonthGrowthPercent: Math.round(momGrowth * 10) / 10,
                    thisMonthAnsweredCalls: thisMonthCalls,
                    lastMonthAnsweredCalls: lastMonthAnswered,
                },
                callers,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch employee analytics" });
    }
};
