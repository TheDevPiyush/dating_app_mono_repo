import { Request, Response } from "express";
import { User, Referral } from "../models";
import { Interaction } from "../models/Interactions";
import { Matches } from "../models/Matches";
import { parseForMonggoSetUpdates } from "../utils/parseReqBody";
import { isValidLocation } from "../utils/validateCoordinates";
import type { IUser } from "../models/User";

const REFERRAL_CODE_LENGTH = 6;
const REFERRAL_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const generateReferralCode = (): string => {
    let code = "";
    for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
        const index = Math.floor(Math.random() * REFERRAL_CHARSET.length);
        code += REFERRAL_CHARSET.charAt(index);
    }
    return code;
};

const generateUniqueReferralCode = async (): Promise<string> => {
    for (let attempt = 0; attempt < 8; attempt++) {
        const code = generateReferralCode();
        const exists = await User.exists({ referralCode: code });
        if (!exists) {
            return code;
        }
    }
    throw new Error("Unable to generate unique referral code");
};

export const getMe = async (req: Request, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ success: true, data: user });
    }
    catch (error) {
        res.status(400).json({ message: "Get user failed" });
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        // Get user data from verified token (middleware sets this)
        const tokenUser = req.user as any;
        const { displayName, photoURL, provider = "google" } = req.body;

        const user_id = tokenUser.user_id;
        const email = tokenUser.email;
        const phoneNumber = tokenUser.phoneNumber;

        if (!user_id) {
            return res.status(400).json({ success: false, message: "Supabase ID is required" });
        }

        if (!email && !phoneNumber) {
            return res.status(400).json({ success: false, message: "Email or Phone is required" });
        }

        // First check if user already exists with this user_id
        const existingUser = await User.findOne({ user_id });
        if (existingUser) {
            res.json({ success: true, message: "User already exists", data: existingUser });
            return;
        }

        // Check if a user already registered with this email
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            res.status(400).json({ success: false, message: "Email already registered" });
            return;
        }

        // Check if a user already registered with this phone number
        if (phoneNumber) {
            const existingPhone = await User.findOne({ phoneNumber });
            if (existingPhone) {
                res.status(400).json({ success: false, message: "Phone number already registered" });
                return;
            }
        }

        // Create new user with data from Supabase
        const userData: any = {
            user_id,
            email,
            provider,
            displayName: displayName || email.split('@')[0],
            photoURL,
            isEmailVerified: provider === "google" || provider === "email",
            isPhoneVerified: !!phoneNumber,
        };

        if (phoneNumber) {
            userData.phoneNumber = phoneNumber;
        }

        // Create new user in database
        const response = await User.create(userData);
        res.json({ success: true, data: response });
    }
    catch (error: any) {
        res.status(400).json({ success: false, message: "Create user failed", error: error.message });
    }
};

// Get referral code
export const getReferralCode = async (req: Request, res: Response) => {
    try {
        const user = req.user as IUser | undefined;

        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (user.referralCode) {
            return res.json({
                success: true,
                data: { referralCode: user.referralCode },
            });
        }

        const referralCode = await generateUniqueReferralCode();
        const updatedUser = await User.findOneAndUpdate(
            { user_id: user.user_id },
            { $set: { referralCode } },
            { new: true }
        ).select("referralCode");

        res.json({
            success: true,
            data: { referralCode: updatedUser?.referralCode || referralCode },
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error?.message || "Could not fetch referral code",
        });
    }
};

// Update user
export const updateUser = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(400).json({ message: "User not found" });
            return;
        }
        if (req.body.user_id || req.body.email || req.body.phoneNumber) {
            res.status(400).json({ message: "User ID, email, and phone number cannot be updated" });
            return;
        }

        const updates = parseForMonggoSetUpdates(req.body);
        const incomingGender = updates["profile.gender"];
        const hasShowMe = Object.prototype.hasOwnProperty.call(updates, "preferences.showMe");

        if (!hasShowMe && (incomingGender === "male" || incomingGender === "female")) {
            updates["preferences.showMe"] = [incomingGender === "male" ? "female" : "male"];
        }

        const updatedUser = await User.findOneAndUpdate(
            { user_id: (user as any)?.user_id },
            { $set: updates as any },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            res.status(400).json({ message: "User not found" });
            return;
        }
        res.json({ success: true, data: updatedUser });
    }
    catch (error) {
        res.status(400).json({ message: "Update user failed" });
    }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const currentUserId = (req.user as any)?.user_id;

        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        const user = await User.findOne({ user_id: userId }).select('-__v');

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, data: user });
    } catch (error) {
        res.status(400).json({ success: false, message: "Get user failed" });
    }
};

// Get users
export const getUsers = async (req: Request, res: Response) => {
    try {

        const authUser = req.user as IUser | undefined;
        const currentUserId = authUser?.user_id;

        if (!authUser || !currentUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const coordinates = authUser.profile?.location?.coordinates;
        const longitude = typeof coordinates?.[0] === "number" ? coordinates[0] : undefined;
        const latitude = typeof coordinates?.[1] === "number" ? coordinates[1] : undefined;

        if (longitude === undefined || latitude === undefined) {
            return res.status(400).json({
                success: false,
                message: "Valid latitude and longitude are required in your profile",
            });
        }

        if (!isValidLocation(longitude, latitude)) {
            return res.status(400).json({ success: false, message: "Incorrect longitude or latitude values" });
        }

        const userLocation: [number, number] = [longitude, latitude];
        const radiusKm = authUser.preferences?.distanceMaxKm ?? 50;
        const [minAge, maxAge] = authUser.preferences?.ageRange ?? [18, 99];
        const showMe = authUser.preferences?.showMe;
        const interests = Array.isArray(authUser.profile?.interests)
            ? authUser.profile.interests.filter(Boolean)
            : [];

        /** ---------------------- AGGREGATE PIPELINE ---------------------- **/
        const pipeline: any[] = [
            {
                $geoNear: {
                    near: { type: "Point", coordinates: userLocation },
                    distanceField: "distanceInMeters",
                    spherical: true,
                    maxDistance: radiusKm * 1000,
                },
            },
            // Exclude self
            { $match: { user_id: { $ne: currentUserId } } },
            // Compute age on the fly
            {
                $addFields: {
                    age: {
                        $dateDiff: {
                            startDate: "$profile.dateOfBirth",
                            endDate: "$$NOW",
                            unit: "year",
                        },
                    },
                },
            },
            { $match: { age: { $gte: minAge, $lte: maxAge } } },
        ];

        if (showMe?.length) {
            pipeline.push({ $match: { "profile.gender": { $in: showMe } } });
        }

        if (interests.length) {
            pipeline.push({ $match: { "profile.interests": { $in: interests } } });
        }

        pipeline.push(
            {
                $lookup: {
                    from: "interactions",
                    let: { targetId: "$user_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$fromUser", currentUserId] },
                                        { $eq: ["$toUser", "$$targetId"] },
                                    ],
                                },
                            },
                        },
                    ],
                    as: "alreadyInteracted",
                },
            },
            { $match: { $expr: { $eq: [{ $size: "$alreadyInteracted" }, 0] } } },
        );

        if (interests.length) {
            pipeline.push(
                {
                    $addFields: {
                        sharedInterests: {
                            $size: { $setIntersection: ["$profile.interests", interests] },
                        },
                    },
                },
                { $match: { sharedInterests: { $gte: 2 } } },
                { $sort: { sharedInterests: -1 as const, distanceInMeters: 1 as const } },
            );
        } else {
            pipeline.push({ $sort: { distanceInMeters: 1 as const } });
        }

        pipeline.push(
            { $limit: 100 },
            {
                $project: {
                    user_id: 1,
                    displayName: 1,
                    profile: 1,
                    interests: 1,
                    distanceInMeters: 1,
                    age: 1,
                    sharedInterests: 1,
                    subscription: 1,
                },
            },
        );

        const users = await User.aggregate(pipeline);
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(400).json({ success: false, message: "Get users failed" });
    }
};

// Delete account
export const deleteAccount = async (req: Request, res: Response) => {
    try {
        const user = req.user as IUser | undefined;

        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // Update user status to "deleted" instead of actually deleting
        const updatedUser = await User.findOneAndUpdate(
            { user_id: user.user_id },
            { $set: { status: "deleted" } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, message: "Account deleted successfully", data: updatedUser });
    } catch (error) {
        res.status(400).json({ success: false, message: "Delete account failed" });
    }
};

// Validate and process referral code
export const validateAndProcessReferral = async (req: Request, res: Response) => {
    try {
        const user = req.user as IUser | undefined;
        const { referralCode } = req.body;

        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!referralCode || typeof referralCode !== 'string' || referralCode.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Referral code is required" });
        }

        const code = referralCode.trim().toUpperCase();

        // Find the user who owns this referral code
        const referrerUser = await User.findOne({ referralCode: code });

        if (!referrerUser) {
            return res.status(404).json({ success: false, message: "Invalid referral code" });
        }

        // Check if user is trying to use their own referral code
        if (referrerUser.user_id === user.user_id) {
            return res.status(400).json({ success: false, message: "You cannot use your own referral code" });
        }

        // Check if user has already used a referral code
        const existingReferral = await Referral.findOne({ referredUserId: user.user_id });
        if (existingReferral) {
            return res.status(400).json({ success: false, message: "You have already used a referral code" });
        }

        // Check if referrer has already referred this user (shouldn't happen but safety check)
        const duplicateReferral = await Referral.findOne({
            referrerUserId: referrerUser.user_id,
            referredUserId: user.user_id
        });
        if (duplicateReferral) {
            return res.status(400).json({ success: false, message: "Referral already processed" });
        }

        // Create the referral record
        const referral = await Referral.create({
            referrerUserId: referrerUser.user_id,
            referredUserId: user.user_id,
            referralCode: code,
        });

        res.json({
            success: true,
            message: "Referral code applied successfully",
            data: referral,
        });
    } catch (error: any) {

        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Referral already processed",
            });
        }

        res.status(400).json({
            success: false,
            message: error?.message || "Failed to process referral code",
        });
    }
};

// Get user matches
export const getUserMatches = async (req: Request, res: Response) => {
    try {
        const user = req.user as IUser | undefined;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const currentUserId = user.user_id;
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(10, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        // Find all matches where current user is either user1Id or user2Id and status is matched
        const matches = await Matches.find({
            $or: [
                { user1Id: currentUserId },
                { user2Id: currentUserId }
            ],
            status: "matched"
        }).sort({ updatedAt: -1 });

        const total = matches.length;
        const paginatedMatches = matches.slice(skip, skip + limit);

        // Get the other user's ID for each match and fetch their details
        const matchUsers = await Promise.all(
            paginatedMatches.map(async (match) => {
                const otherUserId = match.user1Id === currentUserId ? match.user2Id : match.user1Id;
                const otherUser = await User.findOne({ user_id: otherUserId })
                    .select('user_id displayName photoURL profile createdAt')
                    .lean();

                if (!otherUser) return null;

                return {
                    ...otherUser,
                    matchId: match._id,
                    matchedAt: match.createdAt,
                    lastInteractionAt: match.lastInteractionAt
                };
            })
        );

        const validMatches = matchUsers.filter(Boolean);
        res.json({ 
            success: true, 
            data: validMatches,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: skip + limit < total
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: "Get user matches failed" });
    }
};

// Get users who liked the current user (but current user hasn't liked them back)
export const getUsersWhoLikedMe = async (req: Request, res: Response) => {
    try {
        const user = req.user as IUser | undefined;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const currentUserId = user.user_id;
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(10, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        // Find all interactions where current user is the target (toUser) and type is like or superlike
        const likes = await Interaction.find({
            toUser: currentUserId,
            type: { $in: ["like", "superlike"] }
        }).sort({ createdAt: -1 });

        // Get unique user IDs who liked the current user
        const likedByUserIds = [...new Set(likes.map(like => like.fromUser))];

        // Check which of these users the current user has NOT liked back
        const currentUserLikes = await Interaction.find({
            fromUser: currentUserId,
            toUser: { $in: likedByUserIds },
            type: { $in: ["like", "superlike"] }
        });

        const likedBackUserIds = new Set(currentUserLikes.map(like => like.toUser));

        // Filter out users who current user has already liked back (these would be matches)
        const unlikedUserIds = likedByUserIds.filter(userId => !likedBackUserIds.has(userId));

        // Also exclude users who are already matched
        const existingMatches = await Matches.find({
            $or: [
                { user1Id: currentUserId, user2Id: { $in: unlikedUserIds } },
                { user2Id: currentUserId, user1Id: { $in: unlikedUserIds } }
            ],
            status: "matched"
        });

        const matchedUserIds = new Set(
            existingMatches.flatMap(match => 
                match.user1Id === currentUserId ? [match.user2Id] : [match.user1Id]
            )
        );

        const finalUserIds = unlikedUserIds.filter(userId => !matchedUserIds.has(userId));

        // Fetch user details with pagination
        const total = finalUserIds.length;
        const paginatedUserIds = finalUserIds.slice(skip, skip + limit);
        
        const users = await User.find({ user_id: { $in: paginatedUserIds } })
            .select('user_id displayName photoURL profile createdAt')
            .lean();

        // Add interaction details (like type and timestamp)
        const usersWithInteraction = users.map(user => {
            const interaction = likes.find(like => like.fromUser === user.user_id);
            return {
                ...user,
                interactionType: interaction?.type,
                likedAt: interaction?.createdAt
            };
        }).sort((a, b) => {
            // Sort by most recent likes first
            const dateA = a.likedAt ? new Date(a.likedAt).getTime() : 0;
            const dateB = b.likedAt ? new Date(b.likedAt).getTime() : 0;
            return dateB - dateA;
        });

        res.json({ 
            success: true, 
            data: usersWithInteraction,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: skip + limit < total
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: "Get users who liked me failed" });
    }
};