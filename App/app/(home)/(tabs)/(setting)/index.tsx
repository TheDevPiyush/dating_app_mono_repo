import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Colors } from '../../../../constants/Colors'
import { ThemedText } from '@/components/ThemedText'
import { AntDesign, Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '@/store/authStore'
import { truncateText } from '@/utils/truncateTexts'
import { useTranslation } from 'react-i18next'
import LanguageSelector from '@/components/LanguageSelector'
import { useOnboardingStore } from '@/store/onboardingStore'
import { LinearGradient } from 'expo-linear-gradient'
const Settings = () => {
  const { t } = useTranslation();
  const { dbUser } = useAuthStore()
  const { setLanguage } = useOnboardingStore()
  const isSubscriptionActive = dbUser?.subscription?.status === 'active'
  const shimmerAnim = useRef(new Animated.Value(0)).current
  const [shimmerWidth, setShimmerWidth] = useState(0)

  useEffect(() => {
    if (!isSubscriptionActive || shimmerWidth === 0) {
      shimmerAnim.stopAnimation()
      return
    }

    shimmerAnim.setValue(0)
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      })
    )
    loop.start()
    return () => loop.stop()
  }, [isSubscriptionActive, shimmerWidth, shimmerAnim])

  const handleButtonPress = (buttonName: string) => {

    if (buttonName === 'Dating Preference') {
      router.push('/(home)/(tabs)/(setting)/datingPreferences')
    }
    if (buttonName === 'Refer') {
      router.push('/(home)/(tabs)/(setting)/refer_screen')
    }
    if (buttonName === 'Help Center') {
      router.push('/(home)/(tabs)/(setting)/helpCenter')
    }
    if (buttonName === 'Privacy Policy') {
      router.push('/(home)/(tabs)/(setting)/privacyPolicy')
    }
    if (buttonName === 'Price Plans') {
      router.push('/(home)/(tabs)/(setting)/subscriptionScreenSettings')
    }
  }

  const handleProfilePress = () => {
    router.push('/(home)/(tabs)/(setting)/profile')
  }

  const handleDeleteAccount = () => {
    router.push('/(home)/(tabs)/(setting)/deleteAccount')
  }

  const formatDate = (date: Date | string, format?: string) => {
    const d = new Date(date)
    if (isNaN(d.getTime())) return 'N/A'

    const day = d.getDate()
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    const month = monthNames[d.getMonth()]
    const year = d.getFullYear()

    if (day === 1 || day === 21 || day === 31) return `${day}st of ${month} ${year}`
    if (day === 2 || day === 22) return `${day}nd of ${month} ${year}`
    if (day === 3 || day === 23) return `${day}rd of ${month} ${year}`
    return `${day}th of ${month} ${year}`
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Settings Header */}
      <View style={styles.headerSection}>
        <ThemedText type='title' style={styles.headerTitle}>{t('settings.settings')}</ThemedText>
      </View>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.profileCard}
            onPress={handleProfilePress}
            activeOpacity={0.8}>

            <View style={styles.profileImageContainer}>
              <Image
                source={{ uri: dbUser?.photoURL }}
                style={styles.profileImage}
              />
            </View>

            <View style={styles.profileInfo}>
              {dbUser?.displayName && (
                <ThemedText type='defaultSemiBold' style={styles.profileName}>
                  {dbUser?.profile?.firstName} {dbUser?.profile?.lastName}
                </ThemedText>
              )}

              {dbUser?.profile?.bio ? (
                <ThemedText style={styles.profileStatus}>
                  {dbUser.profile.bio}
                </ThemedText>
              ) : (
                dbUser?.email && (
                  <ThemedText style={styles.profileStatus}>
                    {truncateText(dbUser.email, 10)}
                  </ThemedText>
                )
              )}
            </View>

            <View style={styles.profileArrow}>
              <Ionicons name="chevron-forward" size={20} color={Colors.primary.red} />
            </View>

          </TouchableOpacity>
        </View>

        {/* Settings List */}
        <View style={styles.settingsList}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => handleButtonPress('Dating Preference')}
            activeOpacity={0.7}>

            <View style={styles.settingIconContainer}>
              <Ionicons name="heart-outline" size={24} color={Colors.primary.red} />
            </View>

            <ThemedText style={styles.settingText}>{t('settings.datingPreference')}</ThemedText>

            <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />
          </TouchableOpacity>

          <View style={styles.decorativeBorder} />

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => handleButtonPress('Refer')}
            activeOpacity={0.7}>

            <View style={styles.settingIconContainer}>
              <Ionicons name="gift-outline" size={24} color={Colors.primary.red} />
            </View>

            <ThemedText style={styles.settingText}>{t('settings.inviteAndRefer')}</ThemedText>

            <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />
          </TouchableOpacity>

          <View style={styles.decorativeBorder} />



          <View style={styles.decorativeBorder} />

          <View style={styles.settingItem}>
            <View style={styles.settingIconContainer}>
              <Ionicons name="language-outline" size={24} color={Colors.primary.red} />
            </View>
            <ThemedText style={styles.settingText}>{t('settings.language')}</ThemedText>
            <View style={{ marginLeft: 'auto' }}>
              <LanguageSelector store={{ setLanguage }} />
            </View>
          </View>

          <View style={styles.decorativeBorder} />

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => handleButtonPress('Help Center')}
            activeOpacity={0.7}
          >
            <View style={styles.settingIconContainer}>
              <Ionicons name="help-circle-outline" size={24} color={Colors.primary.red} />
            </View>
            <ThemedText style={styles.settingText}>{t('settings.helpCenter')}</ThemedText>
            <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />
          </TouchableOpacity>

          <View style={styles.decorativeBorder} />

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => handleButtonPress('Privacy Policy')}
            activeOpacity={0.7}
          >
            <View style={styles.settingIconContainer}>
              <Ionicons name="shield-outline" size={24} color={Colors.primary.red} />
            </View>
            <ThemedText style={styles.settingText}>{t('settings.privacyPolicy')}</ThemedText>
            <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />
          </TouchableOpacity>

          <View style={styles.decorativeBorder} />

          <View
            style={[styles.settingItemWrapper, styles.ExtraAccountItem]}
            onLayout={(event) => setShimmerWidth(event.nativeEvent.layout.width)}
          >
            {isSubscriptionActive && shimmerWidth > 0 && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.shimmerOverlay,
                  {
                    transform: [
                      {
                        translateX: shimmerAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-shimmerWidth, shimmerWidth],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={[
                    'rgba(255, 59, 48, 0.0)',
                    'rgba(255, 59, 48, 0.18)',
                    'rgba(255, 59, 48, 0.0)',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.shimmerGradient}
                />
              </Animated.View>
            )}
            <TouchableOpacity
              style={[styles.settingItem, isSubscriptionActive && styles.subscriptionItem]}
              onPress={() => handleButtonPress('Price Plans')}
              activeOpacity={0.7}
              disabled={!isSubscriptionActive}
            >
              <View style={styles.settingIconContainer}>
                <AntDesign name="crown" size={24} color={Colors.primary.red} />
              </View>

              {isSubscriptionActive ? (
                <View style={styles.subscriptionInfo}>
                  <ThemedText type='defaultSemiBold' style={styles.subscriptionTitle}>
                    {t('settings.subscriptionActive', {
                      plan: dbUser?.subscription?.plan?.toUpperCase()
                    })}
                  </ThemedText>
                  <ThemedText type='default' style={styles.subscriptionSubtext}>
                    {t('settings.validTill', {
                      date: dbUser?.subscription?.endDate
                        ? formatDate(dbUser?.subscription?.endDate)
                        : "N/A"
                    })}
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.settingText}>
                  {t('settings.subscribeToPookiey')}
                </ThemedText>
              )}

              {isSubscriptionActive ? (
                <Ionicons name="checkmark-circle" size={18} color={Colors.primary.red} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />

              )}
            </TouchableOpacity>
          </View>

          <View style={styles.decorativeBorder} />

          <TouchableOpacity
            style={[styles.settingItem]}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <View style={styles.settingIconContainer}>
              <Ionicons name="trash" size={24} color={Colors.primary.red} />
            </View>
            <ThemedText style={styles.settingText}>
              {t('settings.deleteAccount')}
            </ThemedText>
            <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView >
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.parentBackgroundColor,
  },
  scrollView: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 20,
  },
  headerTitle: {
    color: Colors.primaryBackgroundColor,
  },
  profileSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  profileCard: {
    backgroundColor: Colors.primary.white,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 40,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
    gap: 4,
  },
  profileName: {
    fontSize: 20,
    color: Colors.titleColor,
    lineHeight: 24,
  },
  profileStatus: {
    color: Colors.text.secondary,
    marginTop: 2,
  },
  profileArrow: {
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsList: {
    paddingHorizontal: 16,
  },
  settingItemWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    backgroundColor: Colors.primary.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscriptionItem: {
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.25)',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '40%',
    opacity: 0.9,
  },
  shimmerGradient: {
    flex: 1,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
    fontSize: 15,
    color: Colors.titleColor,
    marginLeft: 12,
  },
  decorativeBorder: {
    height: 0,
    backgroundColor: Colors.primary.red,
    marginVertical: 4,
    marginHorizontal: 20,
    borderRadius: 0.5,
    opacity: 0.3,
  },
  ExtraAccountItem: {
    marginTop: 20,
  },
  profileStatusContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.primary.red,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignContent: 'center',
    justifyContent: 'center',
  },
  subscriptionInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 2,
  },
  subscriptionTitle: {
    fontSize: 15,
    color: Colors.titleColor,
  },
  subscriptionSubtext: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 0,
  },
})

export default Settings