import { Request, Response } from "express";
import { Story, IStory } from "../models/Story";
import { User } from "../models/User";
import { Matches } from "../models/Matches";
import { sendStoryLikeNotification } from "../services/notificationService";

// Helper function to format story user data
const formatStoryUser = async (userId: string, currentUserId: string, userStories: IStory[]) => {
    const user = await User.findOne({ user_id: userId }).select("user_id displayName photoURL profile");
    if (!user) return null;

    const isMe = userId === currentUserId;
    const latestStoryDate = userStories[0]?.createdAt || new Date(0);

    return {
        id: user.user_id,
        username: user.displayName || `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || "User",
        avatar: user.profile?.photos?.[0]?.url || user.photoURL || "",
        stories: userStories.map((story: IStory) => ({
            id: (story._id as any)?.toString() || "",
            type: story.type,
            url: story.mediaUrl,
            duration: story.type === "video" ? 15 : 5, // 15s for video, 5s for image
            isSeen: story.views.includes(currentUserId),
            isLiked: story.likes?.includes(currentUserId) || false,
            likesCount: (story.likes?.length + 1) || 0,
            viewsCount: (story.views?.length + 1) || 0,
            createdAt: story.createdAt
        })),
        isMe: isMe,
        latestStoryDate: latestStoryDate
    };
};

// Get stories organized by friends (matched users) and discover
export const getStories = async (req: Request, res: Response) => {
    try {
        const currentUserId = (req.user as any)?.user_id;

        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        // Pagination parameters
        const friendsPage = parseInt(req.query.friendsPage as string) || 1;
        const friendsLimit = parseInt(req.query.friendsLimit as string) || 10;
        const discoverPage = parseInt(req.query.discoverPage as string) || 1;
        const discoverLimit = parseInt(req.query.discoverLimit as string) || 10;

        // Get current user's preferences
        const currentUser = await User.findOne({ user_id: currentUserId }).select("preferences profile");
        if (!currentUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const coordinates = currentUser.profile?.location?.coordinates;
        const longitude = typeof coordinates?.[0] === "number" ? coordinates[0] : undefined;
        const latitude = typeof coordinates?.[1] === "number" ? coordinates[1] : undefined;
        const radiusKm = currentUser.preferences?.distanceMaxKm ?? 50;
        const [minAge, maxAge] = currentUser.preferences?.ageRange ?? [18, 99];
        const showMe = currentUser.preferences?.showMe || [];

        // Get all matched users
        const matches = await Matches.find({
            $or: [
                { user1Id: currentUserId, status: "matched" },
                { user2Id: currentUserId, status: "matched" }
            ]
        });

        const matchedUserIds = matches.map(match =>
            match.user1Id === currentUserId ? match.user2Id : match.user1Id
        );

        // Get all users who have stories (not expired)
        const usersWithStories = await Story.distinct("userId", {
            expiresAt: { $gt: new Date() }
        });

        // Separate into matched and discover
        const matchedUserIdsWithStories: string[] = [];
        const discoverUserIds: string[] = [];

        usersWithStories.forEach(userId => {
            if (userId === currentUserId) {
                // Skip own stories for now (will add separately)
                return;
            }
            if (matchedUserIds.includes(userId)) {
                matchedUserIdsWithStories.push(userId);
            } else {
                discoverUserIds.push(userId);
            }
        });

        // Get matched users' stories
        const matchedStoriesPromises = matchedUserIdsWithStories.map(async (userId) => {
            const userStories = await Story.find({
                userId,
                expiresAt: { $gt: new Date() }
            }).sort({ createdAt: -1 });

            if (userStories.length === 0) return null;
            return formatStoryUser(userId, currentUserId, userStories);
        });

        // Get discover stories based on preferences
        let discoverStoriesPromises: Promise<any>[] = [];

        if (discoverUserIds.length > 0 && (longitude !== undefined && latitude !== undefined)) {
            // Filter discover users by preferences using aggregation
            const userLocation: [number, number] = [longitude, latitude];

            const pipeline: any[] = [
                {
                    $geoNear: {
                        near: { type: "Point", coordinates: userLocation },
                        distanceField: "distanceInMeters",
                        spherical: true,
                        maxDistance: radiusKm * 1000,
                    },
                },
                {
                    $match: {
                        user_id: { $in: discoverUserIds },
                    },
                },
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
                {
                    $match: {
                        age: { $gte: minAge, $lte: maxAge },
                    },
                },
            ];

            if (showMe.length > 0) {
                pipeline.push({
                    $match: { "profile.gender": { $in: showMe } }
                });
            }

            const discoverUsers = await User.aggregate(pipeline);
            const filteredDiscoverUserIds = discoverUsers.map((u: any) => u.user_id);

            discoverStoriesPromises = filteredDiscoverUserIds.map(async (userId: string) => {
                const userStories = await Story.find({
                    userId,
                    expiresAt: { $gt: new Date() }
                }).sort({ createdAt: -1 });

                if (userStories.length === 0) return null;
                return formatStoryUser(userId, currentUserId, userStories);
            });
        } else {
            // If no location, just get all discover users without location filter
            discoverStoriesPromises = discoverUserIds.map(async (userId) => {
                const user = await User.findOne({ user_id: userId }).select("profile");
                if (!user) return null;

                // Check age filter
                if (user.profile?.dateOfBirth) {
                    const age = Math.floor((Date.now() - new Date(user.profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                    if (age < minAge || age > maxAge) return null;
                }

                // Check gender filter
                if (showMe.length > 0 && user.profile?.gender && !showMe.includes(user.profile.gender as "male" | "female")) {
                    return null;
                }

                const userStories = await Story.find({
                    userId,
                    expiresAt: { $gt: new Date() }
                }).sort({ createdAt: -1 });

                if (userStories.length === 0) return null;
                return formatStoryUser(userId, currentUserId, userStories);
            });
        }

        // Get own story
        const ownStories = await Story.find({
            userId: currentUserId,
            expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 });

        const [matchedStoriesResults, discoverStoriesResults] = await Promise.all([
            Promise.all(matchedStoriesPromises),
            Promise.all(discoverStoriesPromises)
        ]);

        // Process matched stories
        const allMatchedStories = matchedStoriesResults
            .filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => {
                const dateA = a?.latestStoryDate ? new Date(a.latestStoryDate).getTime() : 0;
                const dateB = b?.latestStoryDate ? new Date(b.latestStoryDate).getTime() : 0;
                return dateB - dateA;
            })
            .map(({ latestStoryDate, ...rest }) => rest);

        // Apply pagination for matched stories
        const matchedStoriesStart = (friendsPage - 1) * friendsLimit;
        const matchedStoriesEnd = matchedStoriesStart + friendsLimit;
        const matchedStories = allMatchedStories.slice(matchedStoriesStart, matchedStoriesEnd);
        const hasMoreFriends = matchedStoriesEnd < allMatchedStories.length;

        // Process discover stories
        const allDiscoverStories = discoverStoriesResults
            .filter(item => item !== null)
            .sort((a, b) => {
                const dateA = a?.latestStoryDate ? new Date(a.latestStoryDate).getTime() : 0;
                const dateB = b?.latestStoryDate ? new Date(b.latestStoryDate).getTime() : 0;
                return dateB - dateA;
            })
            .map(({ latestStoryDate, ...rest }) => rest);

        // Apply pagination for discover stories
        const discoverStoriesStart = (discoverPage - 1) * discoverLimit;
        const discoverStoriesEnd = discoverStoriesStart + discoverLimit;
        const discoverStories = allDiscoverStories.slice(discoverStoriesStart, discoverStoriesEnd);
        const hasMoreDiscover = discoverStoriesEnd < allDiscoverStories.length;

        // Format own story
        let myStory = null;
        if (ownStories.length > 0 || true) { // Always include "Your Story" even if empty
            const currentUserData = await User.findOne({ user_id: currentUserId }).select("user_id displayName photoURL profile");
            if (currentUserData) {
                myStory = {
                    id: currentUserData.user_id,
                    username: currentUserData.displayName || `${currentUserData.profile?.firstName || ''} ${currentUserData.profile?.lastName || ''}`.trim() || "You",
                    avatar: currentUserData.profile?.photos?.[0]?.url || currentUserData.photoURL || "",
                    stories: ownStories.map((story: IStory) => ({
                        id: (story._id as any)?.toString() || "",
                        type: story.type,
                        url: story.mediaUrl,
                        duration: story.type === "video" ? 15 : 5,
                        isSeen: true, // Own stories are always seen
                        viewsCount: story.views?.length || 0,
                        likesCount: story.likes?.length || 0,
                        createdAt: story.createdAt
                    })),
                    isMe: true
                };
            }
        }

        res.json({
            success: true,
            data: {
                myStory: myStory,
                friends: matchedStories,
                discover: discoverStories,
                pagination: {
                    friends: {
                        page: friendsPage,
                        limit: friendsLimit,
                        hasMore: hasMoreFriends,
                        total: allMatchedStories.length
                    },
                    discover: {
                        page: discoverPage,
                        limit: discoverLimit,
                        hasMore: hasMoreDiscover,
                        total: allDiscoverStories.length
                    }
                }
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: "Get stories failed" });
    }
};

// Create a new story
export const createStory = async (req: Request, res: Response) => {
    try {
        const currentUserId = (req.user as any)?.user_id;

        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const { type, mediaUrl } = req.body;

        if (!type || !["image", "video"].includes(type)) {
            return res.status(400).json({
                success: false,
                message: "Invalid story type. Must be 'image' or 'video'"
            });
        }

        if (!mediaUrl) {
            return res.status(400).json({
                success: false,
                message: "Media URL is required"
            });
        }

        // Create story with 24 hour expiration
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const storyData = {
            userId: currentUserId,
            type,
            mediaUrl,
            views: [],
            expiresAt
        };

        const newStory = await Story.create(storyData);

        res.json({
            success: true,
            data: newStory
        });
    } catch (error) {
        res.status(400).json({ success: false, message: "Create story failed" });
    }
};

// Mark story as viewed
export const viewStory = async (req: Request, res: Response) => {
    try {
        const currentUserId = (req.user as any)?.user_id;
        const { storyId } = req.params;

        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const story = await Story.findById(storyId);

        if (!story) {
            return res.status(404).json({ success: false, message: "Story not found" });
        }

        // Don't count self-views
        if (story.userId === currentUserId) {
            return res.json({ success: true, data: story });
        }

        // Add view if not already viewed
        if (!story.views.includes(currentUserId)) {
            story.views.push(currentUserId);
            await story.save();
        }

        res.json({ success: true, data: story });
    } catch (error) {
        res.status(400).json({ success: false, message: "View story failed" });
    }
};

// Like/Unlike a story
export const likeStory = async (req: Request, res: Response) => {
    try {
        const currentUserId = (req.user as any)?.user_id;
        const { storyId } = req.params;

        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const story = await Story.findById(storyId);

        if (!story) {
            return res.status(404).json({ success: false, message: "Story not found" });
        }

        // Toggle like
        const isLiked = story.likes?.includes(currentUserId) || false;
        if (isLiked) {
            // Unlike: remove from likes array
            story.likes = story.likes.filter((userId: string) => userId !== currentUserId);
        } else {
            // Like: add to likes array if not already there

            //notification send

            if (!story.likes) {
                story.likes = [];
            }
            if (!story.likes.includes(currentUserId)) {
                story.likes.push(currentUserId);
            }
        }

        await story.save();

        if (!isLiked && story.userId !== currentUserId) {
            try {
                const [liker, storyOwner] = await Promise.all([
                    User.findOne({ user_id: currentUserId }).select("displayName profile"),
                    User.findOne({ user_id: story.userId }).select("notificationTokens"),
                ]);

                const likerName =
                    liker?.displayName ||
                    `${liker?.profile?.firstName || ""} ${liker?.profile?.lastName || ""}`.trim() ||
                    "Someone";

                const tokens = storyOwner?.notificationTokens?.filter(Boolean) || [];

                if (tokens.length) {
                    await sendStoryLikeNotification({
                        likerName,
                        storyOwnerId: story.userId,
                        expo_tokens: tokens,
                    });
                }
            } catch (notifErr) {
                console.warn("Story like notification failed:", notifErr);
            }
        }

        res.json({
            success: true,
            data: {
                storyId: story._id,
                isLiked: !isLiked,
                likesCount: story.likes?.length || 0
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: "Like story failed" });
    }
};

// Get viewers of a story (only for own stories)
export const getStoryViewers = async (req: Request, res: Response) => {
    try {
        const currentUserId = (req.user as any)?.user_id;
        const { storyId } = req.params;

        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const story = await Story.findById(storyId);

        if (!story) {
            return res.status(404).json({ success: false, message: "Story not found" });
        }

        // Only allow viewing viewers for own stories
        if (story.userId !== currentUserId) {
            return res.status(403).json({ success: false, message: "You can only view viewers of your own stories" });
        }

        // Get user details for viewers
        const viewerIds = story.views || [];
        const likes = story.likes || [];
        const viewers = await User.find({ user_id: { $in: viewerIds } })
            .select("user_id displayName photoURL profile")
            .limit(100); // Limit to 100 viewers for performance

        const viewersData = viewers.map(user => ({
            id: user.user_id,
            username: user.displayName || `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || "User",
            avatar: user.profile?.photos?.[0]?.url || user.photoURL || "",
            hasLiked: likes.includes(user.user_id), // Check if this viewer has liked the story
        }));

        res.json({
            success: true,
            data: {
                storyId: story._id,
                viewers: viewersData,
                totalViewers: viewerIds.length
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: "Get story viewers failed" });
    }
};

// Delete a story
export const deleteStory = async (req: Request, res: Response) => {
    try {
        const currentUserId = (req.user as any)?.user_id;
        const { storyId } = req.params;

        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const story = await Story.findById(storyId);

        if (!story) {
            return res.status(404).json({ success: false, message: "Story not found" });
        }

        // Only allow users to delete their own stories
        if (story.userId !== currentUserId) {
            return res.status(403).json({ success: false, message: "Unauthorized to delete this story" });
        }

        await Story.findByIdAndDelete(storyId);

        res.json({ success: true, message: "Story deleted successfully" });
    } catch (error) {
        res.status(400).json({ success: false, message: "Delete story failed" });
    }
};

