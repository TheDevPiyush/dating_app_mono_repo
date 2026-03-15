import CustomBackButton from '@/components/CustomBackButton';
import CustomDialog from '@/components/CustomDialog';
import MainButton from '@/components/MainButton';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    View,
    Platform
} from 'react-native';

import * as Device from 'expo-device';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export default function NotificationScreen() {
    const { t } = useTranslation();
    const params = useLocalSearchParams();
    const fromHome = params.fromHome === 'true';
    const [isLoading, setIsLoading] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const { addNotificationToken } = useAuthStore();

    const requestNotificationPermission = async () => {
        setIsLoading(true);
        try {
            const { status } = await Notifications.requestPermissionsAsync();

            if (status === 'granted') {
                setHasPermission(true);

                Notifications.setNotificationHandler({
                    handleNotification: async () => ({
                        shouldShowAlert: false,
                        shouldPlaySound: false,
                        shouldSetBadge: true,
                        shouldShowBanner: false,
                        shouldShowList: true,
                    }),
                });

                if (Platform.OS === 'android') {
                    Notifications.setNotificationChannelAsync('messages', {
                        name: 'messages',
                        importance: Notifications.AndroidImportance.HIGH,
                        vibrationPattern: [0, 250, 250, 250],
                        lightColor: '#FF231F7C',
                        sound: 'default',
                        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
                        showBadge: true,
        
                    });
                }

                if (Device.isDevice) {
                    const token = await Notifications.getExpoPushTokenAsync({
                        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
                    });

                    if (token?.data) {
                        addNotificationToken(token.data);
                    }
                } else {
                    console.warn('Must use physical device for Push Notifications');
                }
            } else {
                setShowErrorDialog(true);
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            setShowErrorDialog(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkip = () => {
        // If accessed from home, go back to home. Otherwise, continue onboarding to language
        if (fromHome) {
            router.replace('/(home)/(tabs)');
        } else {
            router.push('/(onboarding)/language');
        }
    };

    const handleContinue = () => {
        if (hasPermission) {
            // If accessed from home, go back to home. Otherwise, continue onboarding to language
            if (fromHome) {
                router.replace('/(home)/(tabs)');
            } else {
                router.push('/(onboarding)/language');
            }
        } else {
            requestNotificationPermission();
        }
    };

    if (hasPermission) {
        return (
            <SafeAreaView style={styles.container}>
                {!fromHome && <CustomBackButton />}
                <View style={styles.content}>
                    <View style={styles.illustrationContainer}>
                        <View style={styles.illustration}>
                            <View style={[styles.circle, styles.circle1]} />
                            <View style={[styles.circle, styles.circle2]} />
                            <View style={[styles.circle, styles.circle3]} />
                            <View style={styles.notificationContainer}>
                                <Ionicons name="checkmark-circle" size={80} color={"white"} />
                            </View>
                        </View>
                    </View>

                    <View style={styles.textContainer}>
                        <ThemedText type="title" style={styles.title}>
                            {t('notification.notificationsEnabled')}
                        </ThemedText>
                        <ThemedText type="subtitle" style={styles.subtitle}>
                            {t('notification.notificationsEnabledSubtitle')}
                        </ThemedText>
                    </View>

                    <View style={styles.spacer} />

                    <MainButton
                        title={t('notification.continue')}
                        onPress={handleContinue}
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
                        <View style={styles.notificationContainer}>
                            <View style={styles.bellContainer}>
                                <Ionicons name="notifications" size={60} color="white" />
                                <View style={styles.heartIcon}>
                                    <Ionicons name="heart" size={24} color={Colors.primaryBackgroundColor} />
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.textContainer}>
                    <ThemedText type="title" style={styles.title}>
                        {t('notification.title')}
                    </ThemedText>
                    <ThemedText style={styles.subtitle}>
                        {t('notification.subtitle')}
                    </ThemedText>
                </View>

                <View style={styles.featuresList}>
                    <View style={styles.featureItem}>
                        <View style={styles.featureIcon}>
                            <Ionicons name="heart" size={20} color={Colors.primaryBackgroundColor} />
                        </View>
                        <ThemedText style={styles.featureText}>
                            {t('notification.knowWhenLikes')}
                        </ThemedText>
                    </View>

                    <View style={styles.featureItem}>
                        <View style={styles.featureIcon}>
                            <Ionicons name="chatbubble" size={20} color={Colors.primaryBackgroundColor} />
                        </View>
                        <ThemedText style={styles.featureText}>
                            {t('notification.instantMessageAlerts')}
                        </ThemedText>
                    </View>

                    <View style={styles.featureItem}>
                        <View style={styles.featureIcon}>
                            <Ionicons name="flash" size={20} color={Colors.primaryBackgroundColor} />
                        </View>
                        <ThemedText style={styles.featureText}>
                            {t('notification.neverMissMatch')}
                        </ThemedText>
                    </View>
                </View>

                <View style={styles.spacer} />

                <MainButton
                    title={isLoading ? t('notification.enablingNotifications') : t('notification.allowNotifications')}
                    onPress={handleContinue}
                    disabled={isLoading}
                />
            </View>

            <CustomDialog
                visible={showErrorDialog}
                type="error"
                message={t('notification.unableToEnable')}
                onDismiss={() => setShowErrorDialog(false)}
                primaryButton={{
                    text: t('notification.tryAgain'),
                    onPress: () => {
                        setShowErrorDialog(false);
                        requestNotificationPermission();
                    }
                }}
                secondaryButton={{
                    text: t('notification.skip'),
                    onPress: () => {
                        setShowErrorDialog(false);
                        if (fromHome) {
                            router.replace('/(home)/(tabs)');
                        } else {
                            router.push('/(onboarding)/language');
                        }
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
        paddingHorizontal: 10,
    },
    illustrationContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 40,
    },
    illustration: {
        width: 200,
        height: 200,
        position: 'relative',
        justifyContent: 'center',
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
    notificationContainer: {
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
    bellContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heartIcon: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: 'white',
        borderRadius: 15,
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.secondaryForegroundColor,
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        textAlign: 'center',
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.secondaryForegroundColor,
        textAlign: 'center',
        paddingHorizontal: 20,
        marginTop: 10,
    },
    featuresList: {
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 10,
    },
    featureIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    featureText: {
        fontSize: 16,
        color: Colors.primaryForegroundColor,
        flex: 1,
    },
    spacer: {
        flex: 0.3,
    },
    skipButton: {
        marginTop: 12,
    },
});
