import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
    View,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Animated,
    Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import PagerView from 'react-native-pager-view'
import { Colors } from '@/constants/Colors'
import { ThemedText } from '@/components/ThemedText'
import CustomDialog from '@/components/CustomDialog'
import { useAuth } from '@/hooks/useAuth'
import { useWalletStore } from '@/store/walletStore'
import { exploreAPI, ExploreEmployee } from '@/APIs/exploreAPIs'
import { Phone, Video, Plus, Wallet } from 'lucide-react-native'
import { useCall } from '@/context/CallContext'

const { width } = Dimensions.get('window')

export default function ExploreScreen() {
    const router = useRouter()
    const { token, dbUser } = useAuth()
    const { balance, fetchBalance } = useWalletStore()
    const { makeExploreCall, makeExploreVideoCall } = useCall()

    const pagerRef = useRef<PagerView>(null)
    const [activeTabIndex, setActiveTabIndex] = useState(0)
    const indicatorPosition = useRef(new Animated.Value(0)).current

    const [employees, setEmployees] = useState<ExploreEmployee[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [noBalanceDialogVisible, setNoBalanceDialogVisible] = useState(false)

    const loadEmployees = useCallback(async () => {
        try {
            if (!token) return
            const data = await exploreAPI.getEmployees(token)
            setEmployees(data)
        } catch (error) {
            console.error('Error loading employees:', error)
        } finally {
            setIsLoading(false)
            setRefreshing(false)
        }
    }, [token])

    useEffect(() => {
        if (token) {
            loadEmployees()
            fetchBalance(token)
        }
    }, [token])

    useEffect(() => {
        Animated.spring(indicatorPosition, {
            toValue: activeTabIndex,
            useNativeDriver: false,
            tension: 100,
            friction: 8,
        }).start()
    }, [activeTabIndex])

    const onRefresh = useCallback(() => {
        setRefreshing(true)
        loadEmployees()
        if (token) fetchBalance(token)
    }, [loadEmployees, token])

    const handleTabPress = (index: number) => {
        setActiveTabIndex(index)
        pagerRef.current?.setPage(index)
    }

    const handlePageChange = (e: any) => {
        setActiveTabIndex(e.nativeEvent.position)
    }

    const handleVoiceCall = useCallback((employee: ExploreEmployee) => {
        if (balance < 1) {
            setNoBalanceDialogVisible(true)
            return
        }
        makeExploreCall(employee.user_id, employee.profile?.firstName || employee.displayName || 'Employee')
    }, [balance, makeExploreCall])

    const handleVideoCall = useCallback((employee: ExploreEmployee) => {
        const plan = dbUser?.subscription?.plan
        const subStatus = dbUser?.subscription?.status
        if (!plan || plan === 'free' || subStatus !== 'active') {
            router.push('/(home)/subscriptionScreenHome' as any)
            return
        }
        if (balance < 1) {
            setNoBalanceDialogVisible(true)
            return
        }
        makeExploreVideoCall(employee.user_id, employee.profile?.firstName || employee.displayName || 'Employee')
    }, [balance, dbUser, makeExploreVideoCall, router])

    const getEmployeePhoto = (employee: ExploreEmployee) => {
        const primary = employee.profile?.photos?.find(p => p.isPrimary)
        return primary?.url || employee.profile?.photos?.[0]?.url || employee.photoURL || ''
    }

    const getEmployeeLocation = (employee: ExploreEmployee) => {
        return employee.girlEmployDetails?.employeLocation?.trim() || ''
    }

    const getEmployeeLanuage = (employee: ExploreEmployee) => {
        return employee.girlEmployDetails?.language?.trim() || ''
    }


    // Filter employees by call type
    const audioEmployees = employees.filter(
        e => !!e.girlEmployDetails?.isAvailableForCall && !!e.girlEmployDetails?.isAudioCallAllowed
    )
    const videoEmployees = employees.filter(
        e => !!e.girlEmployDetails?.isAvailableForCall && !!e.girlEmployDetails?.isVideoCallAllowed
    )

    const renderEmployeeRow = (item: ExploreEmployee, callType: 'audio' | 'video') => {
        const isOnline = !!item.isOnline
        const callEnabled = isOnline

        return (
            <TouchableOpacity
                key={item.user_id}
                style={styles.row}
                activeOpacity={0.8}
            >
                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: getEmployeePhoto(item) }}
                        style={styles.avatar}
                    />
                    <View style={[styles.statusDot, isOnline ? styles.online : styles.offline]} />
                </View>

                <View style={styles.info}>
                    <ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={1}>
                        {item.profile?.firstName || item.displayName || 'Employee'}
                    </ThemedText>
                    <View style={styles.statusRow}>
                        <ThemedText style={[styles.statusLabel, isOnline ? styles.onlineText : styles.offlineText]}>
                            {isOnline ? 'Online' : 'Offline'}
                        </ThemedText>
                        {getEmployeeLocation(item) ? (
                            <>
                                <ThemedText style={styles.statusLabel}> • </ThemedText>
                                <ThemedText style={[styles.statusLabel, styles.locationText]}>
                                    {getEmployeeLocation(item)}
                                </ThemedText>
                                <ThemedText style={styles.statusLabel}> • </ThemedText>
                                <ThemedText style={[styles.statusLabel, styles.languageText]}>
                                    {getEmployeeLanuage(item)}
                                </ThemedText>
                            </>
                        ) : null}
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.callBtn, !callEnabled && styles.callBtnDisabled]}
                    onPress={() => callType === 'audio' ? handleVoiceCall(item) : handleVideoCall(item)}
                    disabled={!callEnabled}
                    activeOpacity={0.7}
                >
                    {callType === 'audio'
                        ? <Phone size={18} color={callEnabled ? Colors.primaryBackgroundColor : Colors.text.tertiary} />
                        : <Video size={18} color={callEnabled ? Colors.primaryBackgroundColor : Colors.text.tertiary} />
                    }
                </TouchableOpacity>
            </TouchableOpacity>
        )
    }

    const renderTabContent = (data: ExploreEmployee[], callType: 'audio' | 'video') => (
        <View style={styles.tabContent}>
            <FlatList
                data={data}
                keyExtractor={(item) => item.user_id}
                renderItem={({ item }) => renderEmployeeRow(item, callType)}
                contentContainerStyle={[
                    styles.listContent,
                    data.length === 0 && styles.emptyListContent,
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
                        <ThemedText type="default" style={styles.emptyText}>
                            No one available right now :(
                        </ThemedText>
                        <ThemedText style={styles.emptySubtext}>Pull down to refresh</ThemedText>
                    </View>
                }
            />
        </View>
    )

    const tabWidth = (width - 40) / 2
    const indicatorWidth = 100
    const indicatorTranslateX = indicatorPosition.interpolate({
        inputRange: [0, 1],
        outputRange: [
            tabWidth / 2 - indicatorWidth / 2,
            tabWidth + tabWidth / 2 - indicatorWidth / 2,
        ],
    })

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <ThemedText type="title" style={styles.headerTitle}>Pookiey Connect</ThemedText>
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

            {/* Tab Bar */}
            <View style={styles.tabContainer}>
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={styles.tab}
                        onPress={() => handleTabPress(0)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.tabInner}>
                            <Phone size={14} color={activeTabIndex === 0 ? Colors.primaryBackgroundColor : Colors.text.secondary} />
                            <ThemedText style={[styles.tabText, activeTabIndex === 0 && styles.tabTextActive]}>
                                Audio Call
                            </ThemedText>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.tab}
                        onPress={() => handleTabPress(1)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.tabInner}>
                            <Video size={14} color={activeTabIndex === 1 ? Colors.primaryBackgroundColor : Colors.text.secondary} />
                            <ThemedText style={[styles.tabText, activeTabIndex === 1 && styles.tabTextActive]}>
                                Video Call
                            </ThemedText>
                        </View>
                    </TouchableOpacity>

                    {/* Animated underline indicator */}
                    <Animated.View
                        style={[
                            styles.indicator,
                            {
                                width: indicatorWidth,
                                transform: [{ translateX: indicatorTranslateX }],
                            },
                        ]}
                    />
                </View>
            </View>

            {/* Content */}
            {isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.primaryBackgroundColor} />
                </View>
            ) : (
                <PagerView
                    ref={pagerRef}
                    style={styles.pagerView}
                    initialPage={0}
                    onPageSelected={handlePageChange}
                >
                    {renderTabContent(audioEmployees, 'audio')}
                    {renderTabContent(videoEmployees, 'video')}
                </PagerView>
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
                        setNoBalanceDialogVisible(false)
                        router.push('/(home)/rechargeScreen' as any)
                    },
                }}
                secondaryButton={{
                    text: 'Later',
                    onPress: () => setNoBalanceDialogVisible(false),
                }}
            />
        </SafeAreaView>
    )
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
    // Tab Bar
    tabContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: Colors.parentBackgroundColor,
        marginBottom: 8,
    },
    tabBar: {
        flexDirection: 'row',
        position: 'relative',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tabText: {
        fontSize: 15,
        color: Colors.text.secondary,
    },
    tabTextActive: {
        color: Colors.primaryBackgroundColor,
        fontFamily: 'HellixBold',
    },
    badge: {
        backgroundColor: Colors.text.light,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        paddingHorizontal: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        fontSize: 11,
        color: Colors.text.secondary,
    },
    indicator: {
        position: 'absolute',
        bottom: 0,
        height: 3,
        backgroundColor: Colors.primaryBackgroundColor,
        borderRadius: 2,
    },
    // Pager
    pagerView: {
        flex: 1,
    },
    tabContent: {
        flex: 1,
    },
    // List
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 20,
    },
    emptyListContent: {
        flex: 1,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
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
    separator: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginLeft: 68,
    },
    // Row
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
    callBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: Colors.primary.red,
        borderWidth: 1,
        backgroundColor: 'transparent',
        marginLeft: 8,
    },
    callBtnDisabled: {
        borderColor: Colors.text.tertiary,
        opacity: 0.5,
    },

    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginTop: 2,
    },
    onlineText: {
        color: '#34C759',
    },
    offlineText: {
        color: '#aaa',
    },
    locationText: {
        color: '#F59E0B',
    },
    languageText: {
        color: '#6495ED',
    },
})