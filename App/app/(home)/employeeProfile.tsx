import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useWalletStore } from '@/store/walletStore';
import { exploreAPI, ExploreEmployee } from '@/APIs/exploreAPIs';
import { useCall } from '@/context/CallContext';
import { Phone, Video, ArrowLeft, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function EmployeeProfileScreen() {
    const router = useRouter();
    const { employeeId } = useLocalSearchParams<{ employeeId: string }>();
    const { token, dbUser } = useAuth();
    const { balance } = useWalletStore();
    const { makeExploreCall, makeExploreVideoCall } = useCall();

    const [employee, setEmployee] = useState<ExploreEmployee | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (token && employeeId) {
            exploreAPI.getEmployee(token, employeeId)
                .then(setEmployee)
                .catch(console.error)
                .finally(() => setIsLoading(false));
        }
    }, [token, employeeId]);

    const handleVoiceCall = useCallback(() => {
        if (!employee) return;
        if (balance < 1) {
            router.push('/(home)/rechargeScreen' as any);
            return;
        }
        makeExploreCall(employee.user_id, employee.profile?.firstName || employee.displayName || 'Employee');
    }, [employee, balance, makeExploreCall, router]);

    const handleVideoCall = useCallback(() => {
        if (!employee) return;
        const plan = dbUser?.subscription?.plan;
        const subStatus = dbUser?.subscription?.status;
        if (!plan || plan === 'free' || subStatus !== 'active') {
            router.push('/(home)/subscriptionScreenHome' as any);
            return;
        }
        if (balance < 1) {
            router.push('/(home)/rechargeScreen' as any);
            return;
        }
        makeExploreVideoCall(employee.user_id, employee.profile?.firstName || employee.displayName || 'Employee');
    }, [employee, balance, dbUser, makeExploreVideoCall, router]);

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={Colors.primaryBackgroundColor} />
            </SafeAreaView>
        );
    }

    if (!employee) {
        return (
            <SafeAreaView style={[styles.container, styles.centered]}>
                <Text style={styles.errorText}>Employee not found</Text>
            </SafeAreaView>
        );
    }

    const photos = employee.profile?.photos ?? [];
    const primaryPhoto = photos.find(p => p.isPrimary)?.url || photos[0]?.url || employee.photoURL || '';

    return (
        <View style={styles.container}>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                {/* Hero Image */}
                <View style={styles.heroContainer}>
                    <Image source={{ uri: primaryPhoto }} style={styles.heroImage} resizeMode="cover" />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.6)']}
                        style={StyleSheet.absoluteFill}
                    />
                    <SafeAreaView style={styles.heroOverlay}>
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <ArrowLeft size={22} color="#fff" />
                        </TouchableOpacity>
                    </SafeAreaView>
                    <View style={styles.heroBottom}>
                        <Text style={styles.heroName}>
                            {employee.profile?.firstName || employee.displayName}
                        </Text>
                        {employee.profile?.occupation && (
                            <Text style={styles.heroOccupation}>{employee.profile.occupation}</Text>
                        )}
                        <View style={styles.statusRow}>
                            <View style={[styles.statusDot, employee.isOnline ? styles.online : styles.offline]} />
                            <Text style={styles.heroStatus}>
                                {employee.isOnline ? 'Online now' : 'Offline'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Info Section */}
                <View style={styles.infoSection}>
                    {employee.profile?.bio && (
                        <View style={styles.infoBlock}>
                            <Text style={styles.infoLabel}>About</Text>
                            <Text style={styles.infoValue}>{employee.profile.bio}</Text>
                        </View>
                    )}

                    {(employee.profile?.interests?.length ?? 0) > 0 && (
                        <View style={styles.infoBlock}>
                            <Text style={styles.infoLabel}>Interests</Text>
                            <View style={styles.tagsRow}>
                                {employee.profile!.interests.map((interest, i) => (
                                    <View key={i} style={styles.tag}>
                                        <Text style={styles.tagText}>{interest}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    <View style={styles.infoBlock}>
                        <View style={styles.rateRow}>
                            <Clock size={16} color="#666" />
                            <Text style={styles.rateText}>1 Min per token</Text>
                        </View>
                    </View>

                    {/* Photo Gallery */}
                    {photos.length > 1 && (
                        <View style={styles.infoBlock}>
                            <Text style={styles.infoLabel}>Photos</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoGallery}>
                                {photos.map((photo, i) => (
                                    <Image
                                        key={i}
                                        source={{ uri: photo.url }}
                                        style={styles.galleryPhoto}
                                        resizeMode="cover"
                                    />
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Bottom Call Bar */}
            <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
                <TouchableOpacity
                    style={[styles.callButton, styles.voiceCallButton]}
                    onPress={handleVoiceCall}
                    disabled={!employee.isOnline}
                >
                    <Phone size={20} color="#fff" />
                    <Text style={styles.callButtonText}>Voice Call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.callButton, styles.videoCallButton]}
                    onPress={handleVideoCall}
                    disabled={!employee.isOnline}
                >
                    <Video size={20} color="#fff" />
                    <Text style={styles.callButtonText}>Video Call</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#999',
    },
    heroContainer: {
        width,
        height: width * 1.2,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 16,
        marginTop: 8,
    },
    heroBottom: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
    },
    heroName: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
    },
    heroOccupation: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 2,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    online: {
        backgroundColor: '#34C759',
    },
    offline: {
        backgroundColor: '#999',
    },
    heroStatus: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
    },
    infoSection: {
        padding: 16,
        gap: 20,
    },
    infoBlock: {
        gap: 8,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#999',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: 15,
        color: '#333',
        lineHeight: 22,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        backgroundColor: '#FFF0F3',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    tagText: {
        fontSize: 13,
        color: Colors.primaryBackgroundColor,
        fontWeight: '500',
    },
    rateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    rateText: {
        fontSize: 14,
        color: '#666',
    },
    photoGallery: {
        marginTop: 4,
    },
    galleryPhoto: {
        width: 120,
        height: 160,
        borderRadius: 12,
        marginRight: 10,
    },
    bottomBar: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    callButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
    },
    voiceCallButton: {
        backgroundColor: '#34C759',
    },
    videoCallButton: {
        backgroundColor: Colors.primaryBackgroundColor,
    },
    callButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
