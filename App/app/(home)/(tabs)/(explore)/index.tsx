import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import CustomDialog from '@/components/CustomDialog';
import { useAuth } from '@/hooks/useAuth';
import { useWalletStore } from '@/store/walletStore';
import { exploreAPI, ExploreEmployee } from '@/APIs/exploreAPIs';
import { Phone, Video, Plus, Wallet } from 'lucide-react-native';
import { useCall } from '@/context/CallContext';

export default function ExploreScreen() {
    const router = useRouter();
    const { token, dbUser } = useAuth();
    const { balance, fetchBalance } = useWalletStore();
    const { makeExploreCall, makeExploreVideoCall } = useCall();

    const [employees, setEmployees] = useState<ExploreEmployee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [noBalanceDialogVisible, setNoBalanceDialogVisible] = useState(false);

    const loadEmployees = useCallback(async () => {
        try {
            if (!token) return;
            const data = await exploreAPI.getEmployees(token);
            setEmployees(data);
        } catch (error) {
            console.error('Error loading employees:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => {
        if (token) {
            loadEmployees();
            fetchBalance(token);
        }
    }, [token]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadEmployees();
        if (token) fetchBalance(token);
    }, [loadEmployees, token]);

    const handleVoiceCall = useCallback((employee: ExploreEmployee) => {
        if (balance < 1) {
            setNoBalanceDialogVisible(true);
            return;
        }
        makeExploreCall(employee.user_id, employee.profile?.firstName || employee.displayName || 'Employee');
    }, [balance, makeExploreCall]);

    const handleVideoCall = useCallback((employee: ExploreEmployee) => {
        const plan = dbUser?.subscription?.plan;
        const subStatus = dbUser?.subscription?.status;
        if (!plan || plan === 'free' || subStatus !== 'active') {
            router.push('/(home)/subscriptionScreenHome' as any);
            return;
        }
        if (balance < 1) {
            setNoBalanceDialogVisible(true);
            return;
        }
        makeExploreVideoCall(employee.user_id, employee.profile?.firstName || employee.displayName || 'Employee');
    }, [balance, dbUser, makeExploreVideoCall, router]);

    const getEmployeePhoto = (employee: ExploreEmployee) => {
        const primary = employee.profile?.photos?.find(p => p.isPrimary);
        return primary?.url || employee.profile?.photos?.[0]?.url || employee.photoURL || '';
    };

    const getEmployeeLocation = (employee: ExploreEmployee) => {
        return employee.girlEmployDetails?.employeLocation?.trim() || '';
    };

    const renderEmployee = ({ item }: { item: ExploreEmployee }) => {
        const callAvailability = item.girlEmployDetails;
        const showCallButtons = !!callAvailability?.isAvailableForCall;
        const audioEnabled = !!callAvailability?.isAudioCallAllowed && !!item.isOnline;
        const videoEnabled = !!callAvailability?.isVideoCallAllowed && !!item.isOnline;

        return (
            <TouchableOpacity
                style={styles.row}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/(home)/employeeProfile' as any, params: { employeeId: item.user_id } })}
            >
                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: getEmployeePhoto(item) }}
                        style={styles.avatar}
                    />
                    <View style={[styles.statusDot, item.isOnline ? styles.online : styles.offline]} />
                </View>

                <View style={styles.info}>
                    <ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={1}>
                        {item.profile?.firstName || item.displayName || 'Employee'}
                    </ThemedText>

                    <ThemedText style={styles.statusLabel}>
                        {item.isOnline ? 'Online' : 'Offline'} {getEmployeeLocation(item) && ` • ${getEmployeeLocation(item)}`}
                    </ThemedText>

                </View>

                {showCallButtons && (
                    <View style={styles.callButtons}>
                        <TouchableOpacity
                            style={[styles.callBtn, !audioEnabled && styles.callBtnDisabled]}
                            onPress={() => handleVoiceCall(item)}
                            disabled={!audioEnabled}
                            activeOpacity={0.7}
                        >
                            <Phone size={18} color={audioEnabled ? Colors.primaryBackgroundColor : Colors.text.tertiary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.callBtn, !videoEnabled && styles.callBtnDisabled]}
                            onPress={() => handleVideoCall(item)}
                            disabled={!videoEnabled}
                            activeOpacity={0.7}
                        >
                            <Video size={18} color={videoEnabled ? Colors.primaryBackgroundColor : Colors.text.tertiary} />
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <ThemedText type="title" style={styles.headerTitle}>Explore</ThemedText>
                <TouchableOpacity
                    style={styles.balanceChip}
                    onPress={() => router.push('/(home)/rechargeScreen' as any)}
                >
                    <Wallet size={16} color={Colors.primaryBackgroundColor} />
                    <ThemedText type="defaultSemiBold" style={styles.balanceText}>{balance} Mins</ThemedText>
                    <View style={styles.addBtn}>
                        <Plus size={14} color="#fff" />
                    </View>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.primaryBackgroundColor} />
                </View>
            ) : (
                <FlatList
                    data={employees}
                    renderItem={renderEmployee}
                    keyExtractor={(item) => item.user_id}
                    contentContainerStyle={[
                        styles.listContent,
                        employees.length === 0 && styles.emptyListContent,
                    ]}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={Colors.primaryBackgroundColor}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <ThemedText type="default" style={styles.emptyText}>No one available right now :(</ThemedText>
                            <ThemedText style={styles.emptySubtext}>Pull down to refresh</ThemedText>
                        </View>
                    }
                />
            )}

            <CustomDialog
                visible={noBalanceDialogVisible}
                type="warning"
                title="No Minutes Left"
                message="You don't have any minutes remaining in your wallet. Purchase a minute pack to start calling."
                onDismiss={() => setNoBalanceDialogVisible(false)}
                primaryButton={{
                    text: 'Buy Minutes',
                    onPress: () => {
                        setNoBalanceDialogVisible(false);
                        router.push('/(home)/rechargeScreen' as any);
                    },
                }}
                secondaryButton={{
                    text: 'Later',
                    onPress: () => setNoBalanceDialogVisible(false),
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.parentBackgroundColor,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: {
        color: Colors.primaryBackgroundColor,
    },
    balanceChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF0F3',
        paddingLeft: 10,
        paddingRight: 4,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    balanceText: {
        fontSize: 14,
        color: Colors.primaryBackgroundColor,
    },
    addBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.primaryBackgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyListContent: {
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: Colors.text.primary,
    },
    emptySubtext: {
        fontSize: 14,
        color: Colors.text.tertiary,
        marginTop: 4,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 20,
    },
    separator: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginLeft: 68,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#f0f0f0',
    },
    statusDot: {
        width: 13,
        height: 13,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: Colors.parentBackgroundColor,
        position: 'absolute',
        bottom: 0,
        right: 0,
    },
    online: {
        backgroundColor: '#34C759',
    },
    offline: {
        backgroundColor: '#ccc',
    },
    info: {
        flex: 1,
        marginLeft: 14,
        justifyContent: 'center',
    },
    name: {
        fontSize: 18,
        color: Colors.text.primary,
    },
    statusLabel: {
        fontSize: 12,
        color: Colors.text.tertiary,
        marginTop: 2,
    },
    locationLabel: {
        fontSize: 12,
        color: Colors.text.secondary,
        marginTop: 2,
    },
    callButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginLeft: 8,
    },
    callBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: Colors.primary.red,
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    callBtnDisabled: {
        borderColor: Colors.text.tertiary,
        opacity: 0.5,
    },
});
