import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RazorpayCheckout from 'react-native-razorpay';
import { useAuth } from '@/hooks/useAuth';
import {
    subscriptionAPI,
    SubscriptionPlan,
    SubscriptionData,
} from '@/APIs/subscriptionAPIs';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

const PLAN_COLORS: Record<string, string> = {
    basic: '#6366F1',
    premium: '#F59E0B',
    super: '#EC4899',
};

export default function SubscriptionScreenSettings() {
    const { token } = useAuth();

    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [currentSub, setCurrentSub] = useState<SubscriptionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [subscribing, setSubscribing] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState(false);

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
            Alert.alert('Error', 'Could not load subscription info.');
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

            Alert.alert('Success', `You're now on the ${plan.title} plan!`);
            await load();
        } catch (err: any) {
            if (err?.code !== 2) {
                Alert.alert(
                    'Payment Failed',
                    err?.description ?? err?.message ?? 'Something went wrong.',
                );
            }
        } finally {
            setSubscribing(null);
        }
    };

    const handleCancel = () => {
        Alert.alert(
            'Cancel Subscription',
            'Your subscription will remain active until the current billing period ends. Continue?',
            [
                { text: 'Keep', style: 'cancel' },
                {
                    text: 'Cancel Subscription',
                    style: 'destructive',
                    onPress: async () => {
                        if (!token) return;
                        setCancelling(true);
                        try {
                            await subscriptionAPI.cancelSubscription(token);
                            Alert.alert('Cancelled', 'Auto-renewal has been turned off.');
                            await load();
                        } catch (err: any) {
                            Alert.alert('Error', err?.message ?? 'Could not cancel subscription.');
                        } finally {
                            setCancelling(false);
                        }
                    },
                },
            ],
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
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.screenTitle}>Manage Subscription</Text>

                {activePlan && (
                    <View style={styles.activeBanner}>
                        <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                        <Text style={styles.activeBannerText}>
                            Active:{' '}
                            <Text style={{ fontWeight: '700' }}>
                                {activePlan.charAt(0).toUpperCase() + activePlan.slice(1)}
                            </Text>
                            {currentSub?.autoRenew === false ? ' (expires at end of cycle)' : ''}
                        </Text>
                    </View>
                )}

                {plans.map((plan) => {
                    const isActive = activePlan === plan.id;
                    const color = PLAN_COLORS[plan.id] ?? Colors.primaryBackgroundColor;
                    const isProcessing = subscribing === plan.id;

                    return (
                        <View key={plan.id} style={[styles.planCard, isActive && { borderColor: color, borderWidth: 2 }]}>
                            <View style={[styles.planBadge, { backgroundColor: color }]}>
                                <Text style={styles.planBadgeText}>{plan.title}</Text>
                            </View>

                            <Text style={styles.planPrice}>
                                ₹{(plan.amountInPaise / 100).toFixed(0)}
                                <Text style={styles.planPeriod}> / {plan.durationDays} days</Text>
                            </Text>

                            <View style={styles.features}>
                                {plan.features.map((f, i) => (
                                    <View key={i} style={styles.featureRow}>
                                        <Ionicons name="checkmark-circle" size={16} color={color} />
                                        <Text style={styles.featureText}>{f}</Text>
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
                                        <Text style={styles.cancelButtonText}>
                                            {currentSub?.autoRenew === false ? 'Cancellation Pending' : 'Cancel Subscription'}
                                        </Text>
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
                                        <Text style={styles.subscribeButtonText}>Subscribe</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
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
        fontSize: 22,
        fontWeight: '800',
        color: Colors.titleColor,
        marginBottom: 4,
    },
    scroll: {
        padding: 16,
        paddingBottom: 40,
        gap: 16,
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
        fontWeight: '700',
        color: '#fff',
    },
    planPrice: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.titleColor,
        marginBottom: 14,
    },
    planPeriod: {
        fontSize: 14,
        fontWeight: '400',
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
        fontWeight: '700',
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
        fontWeight: '600',
        color: Colors.text.secondary,
    },
});
