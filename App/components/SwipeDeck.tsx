import React from "react";
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Pressable,
    Dimensions,
} from "react-native";
import Swiper from "react-native-deck-swiper";
import { BlurView } from "expo-blur";
import { Heart, Star, Plus, X, MapPin } from "react-native-feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "./ThemedText";
import { Colors } from "../constants/Colors";
import { useUserInteraction } from "../hooks/userInteraction";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import CustomDialog, { DialogType } from "./CustomDialog";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export type CardItem = any;
export type SwipeAction = "left" | "right" | "up";

export interface SwipeDeckProps {
    data: CardItem[];
    onSwiped?: (item: CardItem, action: SwipeAction) => void;
    onMatch?: (match: any) => void;
    onCardPress?: (item: CardItem) => void;
}

export const SwipeDeck: React.FC<SwipeDeckProps> = ({
    data,
    onSwiped,
    onCardPress,
}) => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { likeUser, dislikeUser, superlikeUser } = useUserInteraction();
    const swiperRef = React.useRef<any>(null);
    const [cardIndex, setCardIndex] = React.useState(0);

    // Dialog states
    const [dialogVisible, setDialogVisible] = React.useState(false);
    const [dialogType, setDialogType] = React.useState<DialogType>('info');
    const [dialogTitle, setDialogTitle] = React.useState<string>('');
    const [dialogMessage, setDialogMessage] = React.useState<string>('');
    const [dialogPrimaryButton, setDialogPrimaryButton] = React.useState<{ text: string; onPress: () => void }>({ text: 'OK', onPress: () => setDialogVisible(false) });
    const [dialogSecondaryButton, setDialogSecondaryButton] = React.useState<{ text: string; onPress: () => void } | undefined>(undefined);

    // Show dialog helper function
    const showDialog = (
        type: DialogType,
        message: string,
        title?: string,
        primaryButton?: { text: string; onPress: () => void },
        secondaryButton?: { text: string; onPress: () => void }
    ) => {
        setDialogType(type);
        setDialogTitle(title || '');
        setDialogMessage(message);
        setDialogPrimaryButton(primaryButton || { text: 'OK', onPress: () => setDialogVisible(false) });
        setDialogSecondaryButton(secondaryButton);
        setDialogVisible(true);
    };

    const calculateAge = (dateOfBirth: Date) => {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        return today.getFullYear() - birthDate.getFullYear();
    };

    const handleInteraction = async (item: CardItem, action: SwipeAction) => {
        try {
            const userId = item?.user_id;
            if (!userId) return;

            let response: any;
            if (action === "right") response = await likeUser(userId);
            else if (action === "left") response = await dislikeUser(userId);
            else if (action === "up") response = await superlikeUser(userId);

            if (response?.success) {
                if (response.isMatch && response.match) {
                    router.replace({
                        pathname: "/matchingScreen",
                        params: {
                            match: JSON.stringify(response.match),
                            user1: JSON.stringify(response.user1 as any),
                            user2: JSON.stringify(response.user2 as any),
                            userName:
                                response.user2?.profile?.firstName ||
                                response.user2?.displayName,
                            userAvatar:
                                response.user2?.photoURL ||
                                response.user2?.profile?.photos?.[0]?.url,
                        },
                    });
                }
            }
            if (!response?.success) {
                if (response?.showPriceModal) {
                    router.push("/(home)/subscriptionScreenHome");
                    return;
                }
            }
        } catch (err) {
            showDialog("error", "Something went wrong", "Error");
            return;
        }
    };

    const renderCard = (item: CardItem, index: number) => {
        if (!item) return null;
        const age = calculateAge(item?.profile?.dateOfBirth);

        // Check if user is subscribed/premium
        const isSubscribedUser =
            !!item?.subscription &&
            (
                item.subscription.status === "active" ||
                item.subscription.plan === "premium" ||
                item.subscription.plan === "super"
            );

        return (
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onCardPress?.(item);
                }}
                style={styles.card}
            >
                <Image
                    source={
                        item?.profile?.photos?.[0]?.url
                            ? { uri: item.profile.photos[0].url }
                            : require("@/assets/images/loginPageImage.png")
                    }
                    style={styles.image}
                    resizeMode="cover"
                />

                {/* Blurred backdrop image for better blur effect */}
                <Image
                    source={
                        item?.profile?.photos?.[0]?.url
                            ? { uri: item.profile.photos[0].url }
                            : require("@/assets/images/loginPageImage.png")
                    }
                    style={styles.blurredBackdrop}
                    resizeMode="cover"
                    blurRadius={20}
                />

                <BlurView
                    intensity={100}
                    tint="dark"
                    style={styles.gradient}
                >
                    <LinearGradient
                        colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.25)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.blurOverlay}
                    />
                </BlurView>

                <View style={styles.footer}>
                    <View style={styles.nameRowInCard}>
                        {isSubscribedUser && (
                            <Ionicons
                                name="diamond"
                                size={22}
                                color="#FFD700"
                                style={styles.cardDiamondIcon}
                            />
                        )}
                        <ThemedText type="default" style={styles.name}>
                            {item?.profile?.firstName} {item?.profile?.lastName}, {age}
                        </ThemedText>
                    </View>

                    {item?.profile?.occupation && (
                        <ThemedText type="default" style={styles.job}>
                            {item.profile.occupation}
                        </ThemedText>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const hasCards = Array.isArray(data) && data.length > 0;

    if (!hasCards) {
        return (
            <>
                <CustomDialog
                    visible={dialogVisible}
                    type={dialogType}
                    title={dialogTitle}
                    message={dialogMessage}
                    onDismiss={() => setDialogVisible(false)}
                    primaryButton={dialogPrimaryButton}
                    secondaryButton={dialogSecondaryButton}
                />
                <View style={[styles.container, styles.emptyStateWrapper]}>
                    <View style={styles.emptyCard}>
                        {/* Decorative gradient circles */}
                        <View style={styles.decorativeCircle1} />
                        <View style={styles.decorativeCircle2} />

                        {/* Icon with gradient background */}
                        <LinearGradient
                            colors={[`${Colors.primaryBackgroundColor}20`, `${Colors.primaryBackgroundColor}08`]}
                            style={styles.emptyBadge}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.emptyBadgeInner}>
                                <Heart
                                    width={48}
                                    height={48}
                                    color={Colors.primaryBackgroundColor}
                                    fill={Colors.primaryBackgroundColor}
                                    strokeWidth={2}
                                />
                            </View>
                        </LinearGradient>

                        {/* Location icon */}
                        <View style={styles.locationIconContainer}>
                            <MapPin
                                width={20}
                                height={20}
                                color={Colors.primaryBackgroundColor}
                                strokeWidth={2.5}
                            />
                        </View>

                        <ThemedText type="title" style={styles.emptyTitle}>
                            No nearby profiles... yet
                        </ThemedText>
                        <ThemedText type="default" style={styles.emptySubtitle}>
                            We couldn't find anyone around you right now. Come back again in some time.
                        </ThemedText>

                    </View>
                </View>
            </>
        );
    }

    return (
        <>
            <CustomDialog
                visible={dialogVisible}
                type={dialogType}
                title={dialogTitle}
                message={dialogMessage}
                onDismiss={() => setDialogVisible(false)}
                primaryButton={dialogPrimaryButton}
                secondaryButton={dialogSecondaryButton}
            />
            <View style={styles.container}>
                <Swiper
                    ref={swiperRef}
                    cards={data}
                    renderCard={(item: CardItem, index: number) => renderCard(item, index)}
                    keyExtractor={(card: CardItem) =>
                        String(card?.user_id ?? card?.id ?? card?._id ?? '')
                    }
                    cardIndex={cardIndex}
                    onSwiped={(index) => {
                        setCardIndex(index + 1);
                    }}
                    onSwipedLeft={(index) => {
                        const card = data?.[index];
                        if (card) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            handleInteraction(card, 'left');
                            onSwiped?.(card, 'left');
                        }
                    }}
                    onSwipedRight={(index) => {
                        const card = data?.[index];
                        if (card) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            handleInteraction(card, 'right');
                            onSwiped?.(card, 'right');
                        }
                    }}
                    onSwipedTop={(index) => {
                        const card = data?.[index];
                        if (card) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                            handleInteraction(card, 'up');
                            onSwiped?.(card, 'up');
                        }
                    }}
                    stackSize={4}
                    useViewOverflow={true}
                    backgroundColor="transparent"
                    marginBottom={insets.bottom + 20}      
                    stackSeparation={-30}            
                    stackScale={4}   
                    overlayLabels={{
                        left: {
                            element: (
                                <View style={styles.overlayContainer}>
                                    {/* Orange gradient overlay for dislike */}
                                    <View style={styles.overlayGradientWrapper}>
                                        <LinearGradient
                                            colors={[
                                                'rgba(255, 165, 0, 0.5)',
                                                'rgba(255, 165, 0, 0.3)',
                                                'rgba(255, 165, 0, 0)'
                                            ]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.overlayGradientFull}
                                        />
                                    </View>
                                    <View style={styles.overlayIconContainer}>
                                        <Plus
                                            style={{ transform: [{ rotate: "45deg" }] }}
                                            strokeWidth={4}
                                            width={80}
                                            height={80}
                                            fill={Colors.text.light}
                                            color="orange"
                                        />
                                    </View>
                                </View>
                            ),
                            style: {
                                wrapper: styles.overlayWrapperFull,
                            },
                        },
                        right: {
                            element: (
                                <View style={styles.overlayContainer}>
                                    {/* Primary color gradient overlay for like */}
                                    <View style={styles.overlayGradientWrapper}>
                                        <LinearGradient
                                            colors={[
                                                'rgba(233, 64, 87, 0)',
                                                'rgba(233, 64, 87, 0.3)',
                                                'rgba(233, 64, 87, 0.5)'
                                            ]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.overlayGradientFull}
                                        />
                                    </View>
                                    <View style={styles.overlayIconContainer}>
                                        <Heart
                                            width={80}
                                            height={80}
                                            color={Colors.text.light}
                                            fill={Colors.primaryBackgroundColor}
                                            strokeWidth={3}
                                        />
                                    </View>
                                </View>
                            ),
                            style: {
                                wrapper: styles.overlayWrapperFull,
                            },
                        },
                        top: {
                            element: (
                                <View style={styles.overlayContainer}>
                                    {/* Primary color gradient overlay for superlike */}
                                    <View style={styles.overlayGradientWrapper}>
                                        <LinearGradient
                                            colors={[
                                                'rgba(233, 64, 87, 0)',
                                                'rgba(233, 64, 87, 0.3)',
                                                'rgba(233, 64, 87, 0.5)'
                                            ]}
                                            start={{ x: 0, y: 1 }}
                                            end={{ x: 0, y: 0 }}
                                            style={styles.overlayGradientFull}
                                        />
                                    </View>
                                    <View style={styles.overlayIconContainer}>
                                        <Star
                                            width={80}
                                            height={80}
                                            color={Colors.text.light}
                                            fill={Colors.primaryBackgroundColor}
                                            strokeWidth={3}
                                        />
                                    </View>
                                </View>
                            ),
                            style: {
                                wrapper: styles.overlayWrapperFull,
                            },
                        },
                    }}
                    animateOverlayLabelsOpacity
                />
                {/* Bottom buttons */}
                <View
                    style={[
                        styles.bottomSection,
                        { bottom: Math.max(insets.bottom + 8, 16) },
                    ]}
                >
                    <ActionRow
                        onLeft={() => swiperRef.current?.swipeLeft()}
                        onRight={() => swiperRef.current?.swipeRight()}
                        onUp={() => swiperRef.current?.swipeTop()}
                    />
                </View>
            </View>
        </>
    );
};

const ActionRow: React.FC<{
    onLeft: () => void;
    onRight: () => void;
    onUp: () => void;
}> = ({ onLeft, onRight, onUp }) => {
    const accent = Colors.primaryBackgroundColor || "#E53E3E";

    return (
        <View style={styles.actions}>
            <Pressable onPress={onLeft} style={[styles.actionBtn, styles.shadowSm]}>
                <Plus
                    style={{ transform: [{ rotate: "45deg" }] }}
                    strokeWidth={4}
                    width={25}
                    height={25}
                    color="orange"
                />
            </Pressable>

            <Pressable
                onPress={onRight}
                style={[styles.actionBtnLg, styles.shadowLg, { backgroundColor: accent }]}
            >
                <Heart fill={"white"} width={40} height={40} color="white" />
            </Pressable>

            <Pressable onPress={onUp} style={[styles.actionBtn, styles.shadowSm]}>
                <Star
                    fill={Colors.primaryBackgroundColor}
                    strokeWidth={4}
                    width={25}
                    height={25}
                    color={Colors.primaryBackgroundColor}
                />
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, position: "relative", backgroundColor: Colors.parentBackgroundColor },
    card: {
        width: SCREEN_WIDTH * 0.85,
        height: SCREEN_HEIGHT * 0.55,
        borderRadius: 18,
        overflow: "hidden",
        alignSelf: "center",
        backgroundColor: Colors.primary.white,
    },
    image: { width: "100%", height: "100%" },
    blurredBackdrop: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 85,
        width: "100%",
    },
    gradient: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 85,
        overflow: "hidden",
    },
    blurOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
    },
    footer: {
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 0,
        height: 85,
        justifyContent: "center",
    },
    name: {
        color: Colors.textColor,
        fontSize: 22,
        fontFamily: "HellixBold"
    },
    nameRowInCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    cardDiamondIcon: {
        marginRight: 2,
    },
    job: { color: Colors.textColor, marginTop: 4 },

    bottomSection: {
        position: "absolute",
        left: 0,
        right: 0,
        height: 120,
        alignItems: "center",
        justifyContent: "center",
    },
    overlayContainer: {
        width: '100%',
        height: '100%',
        position: 'relative',
        borderRadius: 18,
        overflow: 'hidden',
        // Ensure container matches card dimensions
        maxWidth: SCREEN_WIDTH * 0.85,
        maxHeight: SCREEN_HEIGHT * 0.55,
    },
    overlayGradientWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        borderRadius: 18,
        overflow: 'hidden',
        // Ensure it doesn't exceed card dimensions
        maxWidth: SCREEN_WIDTH * 0.85,
        maxHeight: SCREEN_HEIGHT * 0.55,
    },
    overlayGradientFull: {
        width: '100%',
        height: '100%',
    },
    overlayIconContainer: {
        alignItems: "center",
        justifyContent: "center",
        width: '100%',
        height: '100%',
        zIndex: 1,
    },
    overlayWrapperCenter: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    overlayWrapperFull: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: '100%',
        borderRadius: 18,
        overflow: 'hidden',
        // Ensure the wrapper matches card dimensions exactly
        maxWidth: SCREEN_WIDTH * 0.85,
        maxHeight: SCREEN_HEIGHT * 0.55,
    },
    actions: {
        width: "100%",
        maxWidth: 300,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    actionBtn: {
        width: 60,
        height: 60,
        borderRadius: 32,
        backgroundColor: "white",
        alignItems: "center",
        justifyContent: "center",
    },
    actionBtnLg: {
        width: 90,
        height: 90,
        borderRadius: 50,
        alignItems: "center",
        justifyContent: "center",
    },
    shadowSm: {
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 10,
    },
    shadowLg: {
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
    },
    endContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    endText: {
        color: Colors.titleColor,
        fontSize: 20,
        fontFamily: "HellixBold",
        textAlign: "center",
    },
    endSubText: {
        marginTop: 8,
        color: Colors.text.secondary,
        textAlign: "center",
        lineHeight: 20,
    },
    emptyStateWrapper: {
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
        position: "relative",
    },
    emptyCard: {
        width: SCREEN_WIDTH * 0.9,
        maxWidth: 400,
        paddingVertical: 48,
        paddingHorizontal: 32,
        borderRadius: 28,
        backgroundColor: Colors.primary.white,
        borderWidth: 1.5,
        borderColor: `${Colors.primaryBackgroundColor}15`,
        shadowColor: Colors.primaryBackgroundColor,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 8,
        alignItems: "center",
        gap: 20,
        position: "relative",
        overflow: "visible",
    },
    decorativeCircle1: {
        position: "absolute",
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: `${Colors.primaryBackgroundColor}08`,
        top: -40,
        right: -40,
    },
    decorativeCircle2: {
        position: "absolute",
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: `${Colors.primaryBackgroundColor}05`,
        bottom: -30,
        left: -30,
    },
    emptyBadge: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
        shadowColor: Colors.primaryBackgroundColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 6,
    },
    emptyBadgeInner: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: Colors.primary.white,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: `${Colors.primaryBackgroundColor}20`,
    },
    locationIconContainer: {
        position: "absolute",
        top: 20,
        right: 20,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: `${Colors.primaryBackgroundColor}10`,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyTitle: {
        color: Colors.titleColor,
        textAlign: "center",
        fontSize: 24,
        fontFamily: "HellixBold",
        marginTop: 8,
    },
    emptySubtitle: {
        color: Colors.text.secondary,
        textAlign: "center",
        lineHeight: 22,
        fontSize: 15,
        paddingHorizontal: 8,
    },
    decorativeDots: {
        flexDirection: "row",
        gap: 8,
        marginTop: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.text.light,
    },
    dotActive: {
        backgroundColor: Colors.primaryBackgroundColor,
        width: 24,
    },
});

export default SwipeDeck;