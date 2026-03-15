import CustomBackButton from '@/components/CustomBackButton';
import CustomDialog from '@/components/CustomDialog';
import MainButton from '@/components/MainButton';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useLocation } from '@/hooks/useLocation';
import { useUser } from '@/hooks/useUser';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    InteractionManager,
    StyleSheet,
    View
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deepLinkState } from '@/utils/deepLinkState';
import { useTranslation } from 'react-i18next';


export default function LocationScreen() {
    const { t } = useTranslation();
    const params = useLocalSearchParams();
    const fromHome = params.fromHome === 'true';
    const {
        isLoading,
        hasPermission,
        location,
        address,
        error,
        requestLocationPermission,
        clearError
    } = useLocation();

    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const { idToken, getNotificationTokens, setDBUser } = useAuthStore();
    const { updateUser, getUser } = useUser();
    const { clearOnboarding } = useOnboardingStore();
    const [updatingUser, setUpdatingUser] = useState(false);

    const handleContinue = async () => {
        try {
            setUpdatingUser(true);

            if (!idToken) {
                throw new Error('Authentication token not found. Please log in again.');
            }

            const notificationTokens = getNotificationTokens();

            // IMPORTANT:
            // When this screen is opened from Home (fromHome=true), the onboarding store may be empty.
            // Sending the full onboarding payload would overwrite existing profile fields with empty values.
            // In that case we only update the fields relevant to this flow (location + notificationTokens).
            if (fromHome) {
                const partialUpdate: any = {};

                if (location) {
                    partialUpdate.profile = {
                        location: {
                            type: "Point" as const,
                            coordinates: [location.coords.longitude, location.coords.latitude],
                            city: address,
                        },
                    };
                }

                if (notificationTokens.length > 0) {
                    partialUpdate.notificationTokens = notificationTokens;
                }

                await updateUser(idToken as string, partialUpdate);
            } else {
                const store = useOnboardingStore.getState();

                const nameParts = store.fullName?.split(' ') || [];
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';

                const profileData = {
                    profile: {
                        firstName,
                        lastName,
                        dateOfBirth: store.birthday ? new Date(store.birthday) : undefined,
                        gender: store.gender === 'Man' ? 'male' : 'female',
                        preferences: {
                            showMe: [store.gender === 'Man' ? 'female' : 'male'],
                        },
                        bio: store.bio,
                        location: {
                            type: "Point" as const,
                            coordinates: location ? [location.coords.longitude, location.coords.latitude] : undefined,
                            city: address,
                        },
                        photos: store.photos ? store.photos.map((photoUrl, index) => ({
                            url: photoUrl,
                            isPrimary: index === 0,
                            uploadedAt: new Date()
                        })) : [],
                        interests: store.interests || [],
                        occupation: store.occupation,
                        isOnboarded: true
                    },
                    ...(notificationTokens.length > 0 && { notificationTokens })
                };

                await updateUser(idToken as string, profileData);
            }

            // Fetch the updated user data and store it locally
            try {
                const updatedUserResponse = await getUser(idToken as string);
                const updatedDBUser = updatedUserResponse?.data?.user || updatedUserResponse?.data;
                if (updatedDBUser) {
                    setDBUser(updatedDBUser);
                } else {
                }
            } catch (fetchError) {
                console.error('Error fetching updated user data:', fetchError);
                // Don't block navigation if fetch fails, but log the error
            }

            // Only clear onboarding state when we are actually in onboarding.
            if (!fromHome) {
                clearOnboarding();
            }

            // If accessed from home, go back to home. Otherwise, continue with onboarding completion
            if (fromHome) {
                router.replace('/(home)/(tabs)');
            } else {
                const pendingDeeplink = deepLinkState.getPendingDeeplink();
                if (pendingDeeplink) {
                    deepLinkState.clearPendingDeeplink();
                    let initialRoute = '/(home)/(tabs)';
                    if (typeof pendingDeeplink === 'object' && pendingDeeplink.pathname) {
                        const parent = pendingDeeplink.pathname.substring(
                            0, pendingDeeplink.pathname.lastIndexOf('/'),
                        );
                        if (parent) initialRoute = parent;
                    }
                    router.replace(initialRoute);
                    InteractionManager.runAfterInteractions(() => {
                        setTimeout(() => {
                            router.push(pendingDeeplink as any);
                        }, 800);
                    });
                } else {
                    router.replace('/(home)/(tabs)');
                }
            }
        } catch (error) {
            console.error('Error saving user data:', error);
        } finally {
            setUpdatingUser(false);
        }
    };

    const handleAccessLocation = async () => {
        clearError();
        const success = await requestLocationPermission();
        if (!success) {
            setShowErrorDialog(true);
        }
    };

    useEffect(() => {
        if (error && !showErrorDialog) {
            setShowErrorDialog(true);
        }
    }, [error, showErrorDialog]);

    if (hasPermission && location) {
        const mapRegion = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };

        return (
            <SafeAreaView style={styles.container}>
                {!fromHome && <CustomBackButton />}
                <View style={styles.content}>

                    <View style={styles.locationHeader}>
                        <ThemedText type="subtitle">
                            {address || t('location.currentLocation')}
                        </ThemedText>
                    </View>

                    {/* Map View */}
                    <View style={styles.mapContainer}>
                        <MapView
                            style={styles.map}
                            provider={PROVIDER_GOOGLE}
                            region={mapRegion}
                            showsUserLocation={true}
                            showsMyLocationButton={false}
                            showsCompass={false}
                            scrollEnabled={true}
                            zoomEnabled={true}
                            pitchEnabled={false}
                            rotateEnabled={false}
                        >
                            <Marker
                                coordinate={{
                                    latitude: location.coords.latitude,
                                    longitude: location.coords.longitude,
                                }}
                                title={t('location.yourLocation')}
                                description={address || t('location.currentLocation')}
                            >
                            </Marker>
                        </MapView>
                    </View>
                    <MainButton
                        title={t('location.continue')}
                        onPress={handleContinue}
                        disabled={updatingUser}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {!fromHome && <CustomBackButton />}
            <View style={styles.content}>

                <View style={styles.illustrationContainer}>
                    <View style={styles.illustration}>
                        <View style={[styles.circle, styles.circle1]} />
                        <View style={[styles.circle, styles.circle2]} />
                        <View style={[styles.circle, styles.circle3]} />
                        <View style={styles.locationPinContainer}>
                            <Ionicons name="location" size={60} color={"white"} />
                        </View>
                    </View>
                </View>

                <View style={styles.textContainer}>
                    <ThemedText type="title" style={styles.title}>
                        {t('location.title')}
                    </ThemedText>
                    <ThemedText style={styles.subtitle}>
                        {t('location.subtitle')}
                    </ThemedText>
                </View>

                <View style={styles.spacer} />

                <MainButton
                    title={isLoading ? t('location.gettingLocation') : t('location.allowLocation')}
                    onPress={handleAccessLocation}
                    disabled={isLoading}
                />
            </View>

            <CustomDialog
                visible={showErrorDialog}
                type="error"
                message={t('location.unableToAccess')}
                onDismiss={() => {
                    setShowErrorDialog(false);
                    clearError();
                }}
                primaryButton={{
                    text: t('location.tryAgain'),
                    onPress: () => {
                        setShowErrorDialog(false);
                        clearError();
                        handleAccessLocation();
                    }
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    illustrationContainer: {
        flex: 1,
        alignItems: 'center',
    },
    illustration: {
        width: 200,
        height: 200,
        position: 'relative',
        alignItems: 'center',
    },
    circle: {
        position: 'absolute',
        borderRadius: 50,
    },
    circle1: {
        width: 120,
        height: 120,
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        top: 20,
        left: 40,
    },
    circle2: {
        width: 100,
        height: 100,
        backgroundColor: 'rgba(168, 85, 247, 0.6)',
        top: 10,
        right: 30,
    },
    circle3: {
        width: 80,
        height: 80,
        backgroundColor: 'rgba(168, 85, 247, 0.4)',
        bottom: 30,
        left: 60,
    },
    locationPinContainer: {
        zIndex: 10,
        backgroundColor: 'transparent',
        borderRadius: 40,
        padding: 20,
        shadowColor: Colors.secondaryForegroundColor,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 150,
    },
    title: {
        textAlign: 'center',
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.secondaryForegroundColor,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    spacer: {
        flex: 0.5,
    },
    locationHeader: {
        marginBottom: 10,
        alignItems: 'flex-start',
    },
    premiumBadge: {
        fontSize: 14,
        color: Colors.secondaryForegroundColor,
        fontWeight: '600',
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: Colors.secondaryForegroundColor,
        borderRadius: 12,
        textAlign: 'center',
    },
    mapContainer: {
        flex: 1,
        marginBottom: 10,
        // borderRadius: 16,
        overflow: 'hidden',
        shadowColor: Colors.secondaryForegroundColor,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    customMarker: {
        backgroundColor: Colors.primaryBackgroundColor,
        borderRadius: 20,
        padding: 8,
        shadowColor: Colors.primaryBackgroundColor,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    locationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: Colors.primaryBackgroundColor,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.secondaryForegroundColor,
        shadowColor: Colors.primaryBackgroundColor,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    locationIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: Colors.primaryBackgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        shadowColor: Colors.primaryBackgroundColor,
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    locationDetails: {
        flex: 1,
    },
    coordinatesText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.secondaryForegroundColor,
        marginBottom: 4,
    },
    addressText: {
        fontSize: 14,
        color: Colors.secondaryForegroundColor,
        lineHeight: 20,
    },
});
