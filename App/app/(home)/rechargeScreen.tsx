import {
    useState,
    useEffect,
    useCallback
} from 'react';
import {
    View,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RazorpayCheckout from 'react-native-razorpay';
import { useAuth } from '@/hooks/useAuth';
import { useWalletStore } from '@/store/walletStore';
import { walletAPI, MinutePack } from '@/APIs/walletAPIs';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import CustomBackButton from '@/components/CustomBackButton';
import CustomDialog, { DialogType } from '@/components/CustomDialog';

export default function RechargeScreen() {
    const { token } = useAuth();
    const { fetchBalance, balance } = useWalletStore();

    const [packs, setPacks] = useState<MinutePack[]>([]);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState<string | null>(null);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [dialogType, setDialogType] = useState<DialogType>('info');
    const [dialogTitle, setDialogTitle] = useState('');
    const [dialogMessage, setDialogMessage] = useState('');
    const [dialogPrimaryButton, setDialogPrimaryButton] = useState<{
        text: string;
        onPress: () => void;
    }>({ text: 'OK', onPress: () => setDialogVisible(false) });

    const showDialog = (
        type: DialogType,
        message: string,
        title?: string,
        primaryButton?: { text: string; onPress: () => void },
    ) => {
        setDialogType(type);
        setDialogTitle(title ?? '');
        setDialogMessage(message);
        setDialogPrimaryButton(primaryButton ?? { text: 'OK', onPress: () => setDialogVisible(false) });
        setDialogVisible(true);
    };

    const loadPacks = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await walletAPI.getPacks(token);
            setPacks(data);
        } catch {
            showDialog('error', 'Could not load minute packs.', 'Error');
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
            showDialog('success', `${pack.minutes} minutes added to your wallet!`, 'Success');
        } catch (err: any) {
            if (err?.code !== 2) {
                showDialog(
                    'error',
                    err?.description ?? err?.message ?? 'Something went wrong.',
                    'Payment Failed',
                );
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
                        <ThemedText type="defaultSemiBold" style={styles.packTitle}>
                            {item.title}
                        </ThemedText>
                        <ThemedText style={styles.packMinutes}>{item.minutes} minutes</ThemedText>
                    </View>
                </View>
                <View style={styles.packRight}>
                    {isBuying ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <ThemedText type="defaultSemiBold" style={styles.packPrice}>
                            ₹{(item.amountInPaise / 100).toFixed(0)}
                        </ThemedText>
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
        <>
            <CustomDialog
                visible={dialogVisible}
                type={dialogType}
                title={dialogTitle}
                message={dialogMessage}
                onDismiss={() => setDialogVisible(false)}
                primaryButton={dialogPrimaryButton}
            />
            <SafeAreaView style={styles.container} edges={['bottom', 'top']}>
                <CustomBackButton />
                <View style={styles.header}>
                    <View style={styles.headerTextWrap}>
                        <ThemedText type="title" style={styles.headerTitle}>Buy Talk Minutes</ThemedText>
                        <ThemedText style={styles.headerSubtitle}>
                            Recharge your wallet to start calling.
                        </ThemedText>
                    </View>
                    <View style={styles.balanceBadge}>
                        <Ionicons name="wallet-outline" size={16} color={Colors.primaryBackgroundColor} />
                        <ThemedText type="defaultSemiBold" style={styles.balanceText}>{balance} min</ThemedText>
                    </View>
                </View>

                <FlatList
                    data={packs}
                    keyExtractor={(item) => item.packId}
                    renderItem={renderPack}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <ThemedText style={styles.emptyText}>No packs available right now.</ThemedText>
                    }
                />
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    headerTextWrap: { flex: 1, paddingRight: 12 },
    headerTitle: {
        fontSize: 24,
        color: Colors.titleColor,
    },
    headerSubtitle: {
        marginTop: 2,
        color: Colors.text.secondary,
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
        color: '#fff',
    },
    emptyText: {
        textAlign: 'center',
        color: Colors.text.secondary,
        marginTop: 40,
        fontSize: 15,
    },
});
