import CustomBackButton from '@/components/CustomBackButton'
import MainButton from '@/components/MainButton'
import { ThemedText } from '@/components/ThemedText'
import React, { useEffect, useRef } from 'react'
import {
    StyleSheet,
    TouchableOpacity,
    View,
    ScrollView,
    Image,
    Animated,
    Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const MatchingScreen = () => {
    const params = useLocalSearchParams()
    const router = useRouter()
    // Parse the match data and users from params
    const match = params.match ? JSON.parse(params.match as string) : null
    const user1 = params.user1 ? JSON.parse(params.user1 as string) : null
    const user2 = params.user2 ? JSON.parse(params.user2 as string) : null
    const userName = params.userName as string
    const userAvatar = params.userAvatar as string

    // Default data fallback (for development/testing)
    const defaultMatchData = {
        displayName: 'Jake Smith',
        firstName: 'Jake',
        photo: 'https://plus.unsplash.com/premium_photo-1673734625279-2738ecf66fa1?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    }

    const defaultUserData = {
        displayName: 'Emma Johnson',
        firstName: 'Emma',
        photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    }

    const displayMatchName = user2?.profile?.firstName || defaultMatchData.displayName
    const displayMatchPhoto = user2?.profile?.photos?.[0]?.url
    const displayUserPhoto = user1?.profile?.photos?.[0]?.url
    const leftCardAnim = useRef(new Animated.Value(0)).current;
    const rightCardAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(leftCardAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.spring(rightCardAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
                delay: 100,
            })
        ]).start();
    }, [leftCardAnim, rightCardAnim]);

    const handleSayHello = () => {
        router.replace({
            pathname: '/(home)/chatInbox',
            params: {
                matchId: match?._id,
                user1: user1?._id,
                user2: user2?._id,
                userName: user2?.profile?.firstName || displayMatchName,
                userAvatar: user2?.photoURL || user2?.profile?.photos?.[0]?.url
            }
        })
    }

    const handleContinueSwiping = () => {
        router.replace('/(home)/(tabs)');
    }

    const leftCardTranslateX = leftCardAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-SCREEN_WIDTH * 0.8, 0]
    });

    const leftCardRotate = leftCardAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['-15deg', '-8deg']
    });

    const rightCardTranslateX = rightCardAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [SCREEN_WIDTH * 0.8, 0]
    });

    const rightCardRotate = rightCardAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['15deg', '8deg']
    });

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.content}>
                <View style={styles.profileCardsContainer}>
                    <Animated.View
                        style={[
                            styles.leftCard,
                            {
                                transform: [
                                    { translateX: leftCardTranslateX },
                                    { rotate: leftCardRotate }
                                ]
                            }
                        ]}
                    >
                        <Image
                            source={{ uri: displayMatchPhoto }}
                            style={styles.profileImage}
                            resizeMode="cover"
                        />
                        <View style={styles.heartIconLeft}>
                            <ThemedText style={styles.heartIcon}>❤️</ThemedText>
                        </View>
                    </Animated.View>

                    <Animated.View
                        style={[
                            styles.rightCard,
                            {
                                transform: [
                                    { translateX: rightCardTranslateX },
                                    { rotate: rightCardRotate }
                                ]
                            }
                        ]}
                    >
                        <Image
                            source={{ uri: displayUserPhoto }}
                            style={styles.profileImage}
                            resizeMode="cover"
                        />
                        <View style={styles.heartIconRight}>
                            <ThemedText style={styles.heartIcon}>❤️</ThemedText>
                        </View>
                    </Animated.View>
                </View>

                <View style={styles.messageContainer}>
                    <ThemedText style={styles.matchTitle}>
                        It's a match, {user1?.profile?.firstName || displayMatchName}!
                    </ThemedText>
                    <ThemedText type='defaultSemiBold' style={styles.matchSubtitle}>
                        Start a conversation now with each other
                    </ThemedText>
                </View>

                <View style={styles.spacer} />

                <View style={styles.buttonContainer}>
                    <MainButton title='Say hello' onPress={handleSayHello} />
                    <MainButton title='Continue Swiping' type='secondary' onPress={handleContinueSwiping} />
                </View>
            </View>
        </SafeAreaView>
    )
}

const CARD_WIDTH = SCREEN_WIDTH * 0.4
const CARD_HEIGHT = CARD_WIDTH * 1.5

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    profileCardsContainer: {
        height: CARD_HEIGHT + 80,
        marginTop: SCREEN_HEIGHT * 0.08,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    leftCard: {
        position: 'absolute',
        left: '10%',
        top: 10,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 1,
    },
    rightCard: {
        position: 'absolute',
        right: '10%',
        top: 20,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 2,
    },
    profileImage: {
        width: '100%',
        height: '100%',
    },
    heartIconLeft: {
        position: 'absolute',
        bottom: 15,
        left: 15,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    heartIconRight: {
        position: 'absolute',
        top: 15,
        right: 15,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    heartIcon: {
        fontSize: 16,
    },
    messageContainer: {
        alignItems: 'center',
        marginTop: 24,
        paddingHorizontal: 20,
    },
    matchTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#E94057',
        textAlign: 'center',
        fontFamily: 'HellixBold',
        marginBottom: 8,
    },
    matchSubtitle: {
        fontSize: 16,
        color: '#666666',
        textAlign: 'center',
        fontFamily: 'HellixMedium',
        lineHeight: 22,
    },
    spacer: {
        flex: 1,
    },
    buttonContainer: {
        paddingBottom: 20,
        paddingTop: 10,
        flexDirection: 'column',
    },
})

export default MatchingScreen