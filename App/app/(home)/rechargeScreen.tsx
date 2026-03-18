import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RazorpayCheckout from 'react-native-razorpay';
import { useAuth } from '@/hooks/useAuth';
import { useWalletStore } from '@/store/walletStore';
import { walletAPI, MinutePack } from '@/APIs/walletAPIs';
import { Colors } from '@/constants/Colors';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function RechargeScreen() {
    const { token } = useAuth();
    const { fetchBalance, balance } = useWalletStore();

    const [packs, setPacks] = useState<MinutePack[]>([]);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState<string | null>(null);

    const loadPacks = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await walletAPI.getPacks(token);
            setPacks(data);
        } catch {
            Alert.alert('Error', 'Could not load minute packs.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadPacks();
    }, [loadPacks]);

    const handleBuy = async (pack: MinutePack) => {
        if (!token) return;
        setBuying(pack.packId);

        try {
            const { order, razorpayKey } = await walletAPI.createOrder(token, pack.packId);

            const options = {
                key: razorpayKey,
                order_id: order.id,
                amount: order.amount,
                currency: order.currency,
                name: 'Pookiey',
                description: `${pack.minutes} Talk Minutes`,
                prefill: {},
                theme: { color: Colors.primaryBackgroundColor },
            };

            const response = await RazorpayCheckout.open(options);

            await walletAPI.verifyPayment(token, {
                razorpay_order_id: order.id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
            });

            await fetchBalance(token);
            Alert.alert('Success', `${pack.minutes} minutes added to your wallet!`);
        } catch (err: any) {
            if (err?.code !== 2) {
                Alert.alert('Payment Failed', err?.description ?? err?.message ?? 'Something went wrong.');
            }
        } finally {
            setBuying(null);
        }
    };

    const renderPack = ({ item }: { item: MinutePack }) => {
        const isBuying = buying === item.packId;
        return (
            <TouchableOpacity
                style={styles.packCard}
                onPress={() => handleBuy(item)}
                disabled={!!buying}
                activeOpacity={0.7}
            >
                <View style={styles.packLeft}>
                    <Ionicons name="time-outline" size={28} color={Colors.primaryBackgroundColor} />
                    <View style={styles.packInfo}>
                        <Text style={styles.packTitle}>{item.title}</Text>
                        <Text style={styles.packMinutes}>{item.minutes} minutes</Text>
                    </View>
                </View>
                <View style={styles.packRight}>
                    {isBuying ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.packPrice}>
                            ₹{(item.amountInPaise / 100).toFixed(0)}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={Colors.primaryBackgroundColor} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.titleColor} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Buy Talk Minutes</Text>
                <View style={styles.balanceBadge}>
                    <Ionicons name="wallet-outline" size={16} color={Colors.primaryBackgroundColor} />
                    <Text style={styles.balanceText}>{balance} min</Text>
                </View>
            </View>

            <FlatList
                data={packs}
                keyExtractor={(item) => item.packId}
                renderItem={renderPack}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No packs available right now.</Text>
                }
            />
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#fff',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#e0e0e0',
    },
    backButton: {
        marginRight: 12,
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: Colors.titleColor,
    },
    balanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff0f3',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
        gap: 4,
    },
    balanceText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.primaryBackgroundColor,
    },
    list: {
        padding: 16,
        gap: 12,
    },
    packCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    packLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    packInfo: {
        gap: 2,
    },
    packTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.titleColor,
    },
    packMinutes: {
        fontSize: 13,
        color: Colors.text.secondary,
    },
    packRight: {
        backgroundColor: Colors.primaryBackgroundColor,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 10,
        minWidth: 70,
        alignItems: 'center',
    },
    packPrice: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
    emptyText: {
        textAlign: 'center',
        color: Colors.text.secondary,
        marginTop: 40,
        fontSize: 15,
    },
});
