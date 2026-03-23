import { useState, useEffect, useCallback } from 'react';
import {
    View,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RazorpayCheckout from 'react-native-razorpay';
import { useAuth } from '@/hooks/useAuth';
import { useUser } from '@/hooks/useUser';
import {
    subscriptionAPI,
    SubscriptionPlan,
    SubscriptionData,
} from '@/APIs/subscriptionAPIs';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import CustomDialog, { DialogType } from '@/components/CustomDialog';
import { ThemedText } from '@/components/ThemedText';
import CustomBackButton from '@/components/CustomBackButton';

const PLAN_COLORS: Record<string, string> = {
    basic: '#6366F1',
    premium: '#F59E0B',
    super: '#EC4899',
};

export default function SubscriptionScreenSettings() {
    const { token, setDBUser } = useAuth();
    const { getUser } = useUser();

    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [currentSub, setCurrentSub] = useState<SubscriptionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [subscribing, setSubscribing] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState(false);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [dialogType, setDialogType] = useState<DialogType>('info');
    const [dialogTitle, setDialogTitle] = useState('');
    const [dialogMessage, setDialogMessage] = useState('');
    const [dialogPrimaryButton, setDialogPrimaryButton] = useState<{
        text: string;
        onPress: () => void;
    }>({ text: 'OK', onPress: () => setDialogVisible(false) });
    const [dialogCancelButton, setDialogCancelButton] = useState<
        { text: string; onPress: () => void } | undefined
    >(undefined);

    const showDialog = (
        type: DialogType,
        message: string,
        title?: string,
        primaryButton?: { text: string; onPress: () => void },
        cancelButton?: { text: string; onPress: () => void },
    ) => {
        setDialogType(type);
        setDialogTitle(title ?? '');
        setDialogMessage(message);
        setDialogPrimaryButton(
            primaryButton ?? { text: 'OK', onPress: () => setDialogVisible(false) },
        );
        setDialogCancelButton(cancelButton);
        setDialogVisible(true);
    };

    const refetchProfile = useCallback(async () => {
        if (!token) return;
        try {
            const profile = await getUser(token);
            const nextDbUser = profile?.data?.user ?? profile?.data ?? profile?.user ?? profile;
            if (nextDbUser) {
                setDBUser(nextDbUser);
            }
        } catch (err) {
            console.error('Profile refetch failed after subscription change', err);
        }
    }, [getUser, setDBUser, token]);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [plansData, subData] = await Promise.all([
                subscriptionAPI.getPlans(token),
                subscriptionAPI.getCurrentSubscription(token),
            ]);
            setPlans(plansData.filter((p) => p.id !== 'free'));
            setCurrentSub(subData);
        } catch {
            showDialog('error', 'Could not load subscription info.', 'Error');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        load();
    }, [load]);

    const handleSubscribe = async (plan: SubscriptionPlan) => {
        if (!token) return;
        setSubscribing(plan.id);

        try {
            const { subscriptionId, razorpayKey } = await subscriptionAPI.createSubscription(
                token,
                plan.id,
            );

            const options = {
                key: razorpayKey,
                subscription_id: subscriptionId,
                name: 'Pookiey',
                description: `${plan.title} Plan — ${plan.durationDays} days`,
                prefill: {},
                theme: { color: Colors.primaryBackgroundColor },
                recurring: '1',
            };

            const response = await RazorpayCheckout.open(options);

            await subscriptionAPI.verifySubscription(token, {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: subscriptionId,
                razorpay_signature: response.razorpay_signature,
            });

            await refetchProfile();
            showDialog('success', `You're now on the ${plan.title} plan!`, 'Success');
            await load();
        } catch (err: any) {
            if (err?.code !== 2) {
                showDialog(
                    'error',
                    err?.description ?? err?.message ?? 'Something went wrong.',
                    'Payment Failed',
                );
            }
        } finally {
            setSubscribing(null);
        }
    };

    const handleCancel = () => {
        showDialog(
            'warning',
            'Your subscription will remain active until the current billing period ends. Continue?',
            'Cancel Subscription',
            {
                text: 'Cancel Subscription',
                onPress: async () => {
                    if (!token) return;
                    setDialogVisible(false);
                    setCancelling(true);
                    try {
                        await subscriptionAPI.cancelSubscription(token);
                        await refetchProfile();
                        showDialog('success', 'Auto-renewal has been turned off.', 'Cancelled');
                        await load();
                    } catch (err: any) {
                        showDialog('error', err?.message ?? 'Could not cancel subscription.', 'Error');
                    } finally {
                        setCancelling(false);
                    }
                },
            },
            { text: 'Keep', onPress: () => setDialogVisible(false) },
        );
    };

    const activePlan = currentSub?.status === 'active' ? currentSub.plan : null;

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={Colors.primaryBackgroundColor} />
            </SafeAreaView>
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
                cancelButton={dialogCancelButton}
            />
            <SafeAreaView style={styles.container} edges={['bottom', 'top']}>
                <CustomBackButton />
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <ThemedText type="title" style={styles.screenTitle}>
                        Manage Subscription
                    </ThemedText>
                    <ThemedText type="default" style={styles.screenSubtitle}>
                        Pick or update your plan anytime.
                    </ThemedText>
                </View>

                {activePlan && (
                    <View style={styles.activeBanner}>
                        <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                        <ThemedText style={styles.activeBannerText}>
                            Active:{' '}
                            <ThemedText type="defaultSemiBold" style={styles.activePlanLabel}>
                                {activePlan.charAt(0).toUpperCase() + activePlan.slice(1)}
                            </ThemedText>
                            {currentSub?.autoRenew === false ? ' (expires at end of cycle)' : ''}
                        </ThemedText>
                    </View>
                )}

                {plans.map((plan) => {
                    const isActive = activePlan === plan.id;
                    const color = PLAN_COLORS[plan.id] ?? Colors.primaryBackgroundColor;
                    const isProcessing = subscribing === plan.id;

                    return (
                        <View key={plan.id} style={[styles.planCard, isActive && { borderColor: color, borderWidth: 2 }]}>
                            <View style={[styles.planBadge, { backgroundColor: color }]}>
                                <ThemedText type="defaultSemiBold" style={styles.planBadgeText}>
                                    {plan.title}
                                </ThemedText>
                            </View>

                            <ThemedText type="title" style={styles.planPrice}>
                                ₹{(plan.amountInPaise / 100).toFixed(0)}
                                <ThemedText style={styles.planPeriod}> / {plan.durationDays} days</ThemedText>
                            </ThemedText>

                            <View style={styles.features}>
                                {plan.features.map((f, i) => (
                                    <View key={i} style={styles.featureRow}>
                                        <Ionicons name="checkmark-circle" size={16} color={color} />
                                        <ThemedText style={styles.featureText}>{f}</ThemedText>
                                    </View>
                                ))}
                            </View>

                            {isActive ? (
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={handleCancel}
                                    disabled={cancelling || currentSub?.autoRenew === false}
                                >
                                    {cancelling ? (
                                        <ActivityIndicator color={Colors.text.secondary} />
                                    ) : (
                                        <ThemedText type="defaultSemiBold" style={styles.cancelButtonText}>
                                            {currentSub?.autoRenew === false ? 'Cancellation Pending' : 'Cancel Subscription'}
                                        </ThemedText>
                                    )}
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.subscribeButton, { backgroundColor: color }]}
                                    onPress={() => handleSubscribe(plan)}
                                    disabled={!!subscribing}
                                    activeOpacity={0.7}
                                >
                                    {isProcessing ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <ThemedText type="defaultSemiBold" style={styles.subscribeButtonText}>
                                            Subscribe
                                        </ThemedText>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })}
            </ScrollView>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.parentBackgroundColor,
    },
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    screenTitle: {
        fontSize: 24,
        color: Colors.titleColor,
        marginBottom: 6,
    },
    screenSubtitle: {
        color: Colors.text.secondary,
    },
    scroll: {
        padding: 16,
        paddingBottom: 40,
        gap: 16,
    },
    header: {
        marginBottom: 4,
    },
    activeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        gap: 8,
    },
    activeBannerText: {
        fontSize: 14,
        color: '#15803d',
        flex: 1,
    },
    activePlanLabel: {
        color: '#15803d',
    },
    planCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    planBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 12,
    },
    planBadgeText: {
        fontSize: 13,
        color: '#fff',
    },
    planPrice: {
        fontSize: 28,
        color: Colors.titleColor,
        marginBottom: 14,
    },
    planPeriod: {
        fontSize: 14,
        color: Colors.text.secondary,
    },
    features: {
        gap: 8,
        marginBottom: 18,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    featureText: {
        fontSize: 14,
        color: Colors.text.primary,
    },
    subscribeButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    subscribeButtonText: {
        fontSize: 16,
        color: '#fff',
    },
    cancelButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    cancelButtonText: {
        fontSize: 14,
        color: Colors.text.secondary,
    },
});
