

import React, { useState } from 'react'
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/Colors'
import { ThemedText } from './ThemedText'
import CustomBackButton from './CustomBackButton'
import { DBUser } from '@/types/Auth'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useAuthStore } from '@/store/authStore'
import { useMessagingStore } from '@/store/messagingStore'
import { useAuth } from '@/hooks/useAuth'
import { useUserInteraction } from '@/hooks/userInteraction'
import { messageAPI } from '@/APIs/messageAPIs'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface UserProfileViewProps {
  user: DBUser | null
  onLike?: () => void
  onMessage?: () => void
}

const UserProfileView: React.FC<UserProfileViewProps> = ({ user, onMessage }) => {
  const { t } = useTranslation();
  const router = useRouter()
  const { returnToStory } = useLocalSearchParams<{ returnToStory?: string }>()
  const insets = useSafeAreaInsets()
  const [isBioExpanded, setIsBioExpanded] = useState(false)
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState({ title: '', message: '' })
  const { dbUser: currentUser } = useAuthStore()
  const { inbox, setInbox } = useMessagingStore()
  const { token } = useAuth()
  const { likeUser, dislikeUser, superlikeUser } = useUserInteraction()

  const displayUser = user

  const findOrCreateMatch = async (otherUserId: string): Promise<string | null> => {
    try {
      let existingMatch = inbox.find(item => item.userId === otherUserId)
      if (existingMatch) {
        return existingMatch.matchId
      }

      if (token) {
        try {
          const updatedInbox = await messageAPI.getInbox(token)
          setInbox(updatedInbox)

          existingMatch = updatedInbox.find(item => item.userId === otherUserId)
          if (existingMatch) {
            return existingMatch.matchId
          }
        } catch (error) {
          console.error('Error refreshing inbox:', error)
        }
      }

      if (token && currentUser?.user_id) {
        try {
          const interactionResult = await likeUser(otherUserId)

          if (interactionResult.isMatch) {
            const matchId = (interactionResult as any).matchId || interactionResult.match?._id
            if (matchId) {
              return matchId
            }
          }

          if (token) {
            try {
              const updatedInbox = await messageAPI.getInbox(token)
              setInbox(updatedInbox)

              const newMatch = updatedInbox.find(item => item.userId === otherUserId)
              if (newMatch) {
                return newMatch.matchId
              }
            } catch (error) {
              console.error('Error refreshing inbox after interaction:', error)
            }
          }
        } catch (error) {
          console.error('Error creating interaction:', error)
        }
      }

      return null
    } catch (error) {
      console.error('Error finding/creating match:', error)
      return null
    }
  }

  const handleInteraction = async (action: 'like' | 'dislike' | 'superlike') => {
    try {
      const userId = displayUser?.user_id
      if (!userId) return

      let response: any
      if (action === 'like') response = await likeUser(userId)
      else if (action === 'dislike') response = await dislikeUser(userId)
      else response = await superlikeUser(userId)

      if (response?.success) {
        if (response.isMatch && response.match) {
          router.replace({
            pathname: '/matchingScreen',
            params: {
              match: JSON.stringify(response.match),
              user1: JSON.stringify(response.user1 as any),
              user2: JSON.stringify(response.user2 as any),
              userName: response.user2?.profile?.firstName || response.user2?.displayName,
              userAvatar: response.user2?.photoURL || response.user2?.profile?.photos?.[0]?.url,
            },
          })
        }
        return
      }

      if (response?.showPriceModal) {
        router.push('/(home)/subscriptionScreenHome')
        return
      }

      setAlertMessage({
        title: "OOpss!",
        message: response?.message || t('userProfileView.userInfoNotAvailable'),
      })
      setShowAlert(true)
    } catch (err) {
      setAlertMessage({
        title: t('userProfileView.error'),
        message: t('userProfileView.userInfoNotAvailable'),
      })
      setShowAlert(true)
    }
  }

  const getAge = () => {
    if (!displayUser?.profile?.dateOfBirth) return null
    const birthDate = new Date(displayUser.profile.dateOfBirth)
    const ageDiff = Date.now() - birthDate.getTime()
    const ageDate = new Date(ageDiff)
    return Math.abs(ageDate.getUTCFullYear() - 1970)
  }

  const age = getAge()
  const photos = displayUser?.profile?.photos?.map(p => p.url!) || []
  // Get ALL interests - no limit
  const interests = displayUser?.profile?.interests || []
  const bio = displayUser?.profile?.bio || ''
  const firstName = displayUser?.profile?.firstName || displayUser?.displayName || 'User'
  // Handle occupation as both string and array
  const occupationData = displayUser?.profile?.occupation
  const occupations = Array.isArray(occupationData)
    ? occupationData.filter(occ => occ && occ.trim())
    : occupationData
      ? [occupationData]
      : []
  const location = displayUser?.profile?.location
  const currentUserLocation = currentUser?.profile?.location

  // Check if user is premium/subscribed
  const isPremium = displayUser?.subscription?.status === 'active';
  const isCurrentUserSubscribed = currentUser?.subscription?.status === 'active';

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371 // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180)
    const dLon = (lon2 - lon1) * (Math.PI / 180)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Calculate distance if both locations are available
  const getDistance = (): number | null => {
    if (
      !currentUserLocation?.coordinates ||
      !location?.coordinates ||
      currentUserLocation.coordinates.length < 2 ||
      location.coordinates.length < 2
    ) {
      return null
    }

    // Coordinates are stored as [longitude, latitude]
    const [lon1, lat1] = currentUserLocation.coordinates
    const [lon2, lat2] = location.coordinates

    if (typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
      typeof lat2 !== 'number' || typeof lon2 !== 'number') {
      return null
    }

    // calculateDistance expects (lat1, lon1, lat2, lon2)
    return calculateDistance(lat1, lon1, lat2, lon2)
  }

  const distance = getDistance()

  // Format distance for display
  const formatDistance = (dist: number): string => {
    // For privacy: show "under 500 m" for distances under 0.5 km
    if (dist < 0.5) {
      return 'under 500 m'
    } else if (dist < 1) {
      return `${Math.round(dist * 1000)} m`
    } else if (dist < 10) {
      return `${dist.toFixed(1)} km`
    } else {
      return `${Math.round(dist)} km`
    }
  }

  const BIO_TRUNCATE_LENGTH = 100
  const isBioLong = bio.length > BIO_TRUNCATE_LENGTH
  const displayBio = isBioExpanded || !isBioLong ? bio : `${bio.substring(0, BIO_TRUNCATE_LENGTH)}...`

  // Get current user's interests for comparison
  const currentUserInterests = currentUser?.profile?.interests || []

  // Helper function to check if interest matches
  const isInterestMatch = (interest: string) => {
    return currentUserInterests.some(
      (userInterest) => userInterest.toLowerCase().trim() === interest.toLowerCase().trim()
    )
  }

  return (
    <SafeAreaView style={styles.safeAreaContainer} edges={[]}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.headerSection}>
            {photos.length > 0 && photos.length > 1 ? (
              <Image
                source={{ uri: photos[0] }}
                style={styles.backgroundImage}
                resizeMode="cover"
                blurRadius={20}
              />
            ) : photos.length > 0 ? (
              <Image
                source={{ uri: photos[0] }}
                style={styles.backgroundImage}
                resizeMode="cover"
                blurRadius={20}
              />
            ) : (
              <View style={styles.headerImagePlaceholder}>
                <Ionicons name="person" size={80} color={Colors.primary.white} />
              </View>
            )}

            {/* Foreground Image (main image) */}
            {photos.length > 0 ? (
              <Image
                source={{ uri: photos[0] }}
                style={styles.foregroundImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.headerImagePlaceholder}>
                <Ionicons name="person" size={80} color={Colors.primary.white} />
              </View>
            )}

            {/* Gradient overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)']}
              style={styles.imageOverlay}
            />

            {/* Back Button at top */}
            <CustomBackButton
              backgroundColor={Colors.dark.background}
              variant="overlay"
              topOffset={insets.top}
              onPress={() => {
                router.back();
              }}
            />

            {/* Header content at bottom */}
            <View style={styles.headerContent}>
              <View style={styles.nameRow}>
                <View style={styles.nameContainer}>
                  <View style={styles.nameRowWithCrown}>
                    {isPremium && (
                      <Ionicons
                        name="diamond"
                        size={24}
                        color="#FFD700"
                        style={styles.crownIcon}
                      />
                    )}
                    <ThemedText style={styles.userName}>
                      {firstName}{age ? `, ${age}` : ''}
                    </ThemedText>
                  </View>
                  {occupations.length > 0 && (
                    <View style={styles.occupationContainer}>
                      {occupations.map((occ, index) => (
                        <ThemedText key={index} style={styles.occupation}>
                          {occ}
                        </ThemedText>
                      ))}
                    </View>
                  )}
                </View>
                {isCurrentUserSubscribed && (
                  <View style={styles.interactionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.dislikeButton]}
                      onPress={() => handleInteraction('dislike')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={18} color={styles.dislikeIcon.color as string} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.likeButton]}
                      onPress={() => handleInteraction('like')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="heart" size={18} color={styles.likeIcon.color as string} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.superlikeButton]}
                      onPress={() => handleInteraction('superlike')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="star" size={18} color={styles.superlikeIcon.color as string} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.contentSection}>
            {/* Premium Badge */}
            {isPremium && (
              <View style={styles.premiumBadge}>
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.premiumBadgeGradient}
                >
                  <View style={styles.premiumBadgeContent}>
                    <Ionicons name="diamond" size={20} color={Colors.primary.white} />
                    <ThemedText style={styles.premiumBadgeText}>
                      {firstName} is our diamond user
                    </ThemedText>
                  </View>
                </LinearGradient>
              </View>
            )}

            {/* Location - Distance Only */}
            {location && distance !== null && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>{t('userProfileView.location')}</ThemedText>
                <View style={styles.locationCard}>
                  <LinearGradient
                    colors={[Colors.primaryBackgroundColor, '#E94057DD']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.locationCardGradient}
                  >
                    <View style={styles.locationCardContent}>
                      <View style={styles.distanceIconWrapper}>
                        <Ionicons name="navigate" size={24} color={Colors.primaryBackgroundColor} />
                      </View>
                      <View style={styles.distanceInfoContainer}>
                        <ThemedText style={styles.distanceValue}>
                          {formatDistance(distance)}
                        </ThemedText>
                        <ThemedText style={styles.distanceLabel}>away from you</ThemedText>
                      </View>
                    </View>
                  </LinearGradient>
                </View>
              </View>
            )}

            {/* Occupation Section */}
            {occupations.length > 0 && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>
                  {t('profilePage.occupation') || 'Occupation'}
                </ThemedText>
                <View style={styles.occupationTagsContainer}>
                  {occupations.map((occ, index) => (
                    <View key={index} style={styles.occupationTag}>
                      <Ionicons name="briefcase" size={14} color={Colors.primaryBackgroundColor} style={{ marginRight: 6 }} />
                      <ThemedText style={styles.occupationTagText}>{occ}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* About */}
            {bio && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>{t('userProfileView.about')}</ThemedText>
                <ThemedText style={styles.bioText}>{displayBio}</ThemedText>
                {isBioLong && (
                  <TouchableOpacity onPress={() => setIsBioExpanded(!isBioExpanded)}>
                    <ThemedText style={styles.readMoreText}>
                      {isBioExpanded ? t('userProfileView.readLess') : t('userProfileView.readMore')}
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Interests */}
            {interests.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <ThemedText style={styles.sectionTitle}>{t('userProfileView.interests')}</ThemedText>
                </View>
                <View style={styles.tagsContainer}>
                  {interests.map((interest, i) => {
                    const isMatch = isInterestMatch(interest)
                    return isMatch ? (
                      <View key={`interest-${i}`} style={styles.tagSelected}>
                        <Ionicons name="checkmark" size={14} color={Colors.primary.white} style={{ marginRight: 4 }} />
                        <ThemedText style={styles.tagSelectedText}>{interest}</ThemedText>
                      </View>
                    ) : (
                      <View key={`interest-${i}`} style={styles.tagUnselected}>
                        <ThemedText style={styles.tagUnselectedText}>{interest}</ThemedText>
                      </View>
                    )
                  })}
                </View>
              </View>
            )}

            {/* Gallery */}
            {photos.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <ThemedText style={styles.sectionTitle}>{t('userProfileView.gallery')}</ThemedText>
                  <TouchableOpacity
                    onPress={() => {
                      router.push({
                        pathname: '/imageGallery',
                        params: {
                          photos: JSON.stringify(photos),
                          initialIndex: '0'
                        }
                      })
                    }}
                  >
                    <ThemedText style={styles.seeAllText}>{t('userProfileView.seeAll')}</ThemedText>
                  </TouchableOpacity>
                </View>
                <View style={styles.galleryGrid}>
                  {photos.slice(0, 4).map((photoUrl, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.galleryImageContainer}
                      onPress={() => {
                        router.push({
                          pathname: '/imageGallery',
                          params: {
                            photos: JSON.stringify(photos),
                            initialIndex: index.toString()
                          }
                        })
                      }}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: photoUrl }}
                        style={styles.galleryImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Custom Alert Modal */}
        <Modal
          visible={showAlert}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAlert(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowAlert(false)}
          >
            <Pressable style={styles.alertContainer} onPress={(e) => e.stopPropagation()}>
              <View style={styles.alertHeader}>
                <ThemedText style={styles.alertTitle}>{alertMessage.title}</ThemedText>
              </View>

              <View style={styles.alertContent}>
                <ThemedText style={styles.alertMessage}>{alertMessage.message}</ThemedText>
              </View>

              <View style={styles.alertActions}>
                <TouchableOpacity
                  style={styles.alertButton}
                  onPress={() => setShowAlert(false)}
                  activeOpacity={0.8}
                >
                  <ThemedText style={styles.alertButtonText}>{t('userProfileView.gotIt')}</ThemedText>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: Colors.primary.black,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.primary.white,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  headerSection: {
    position: 'relative',
    width: '100%',
    height: 420,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary.black,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  foregroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
    zIndex: 2,
  },
  headerContent: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nameContainer: { flex: 1 },
  nameRowWithCrown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crownIcon: {
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  userName: {
    fontSize: 28,
    color: Colors.primary.white,
    fontFamily: 'HellixBold',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  interactionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  dislikeButton: {
    backgroundColor: Colors.primary.white,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.45)',
  },
  likeButton: { backgroundColor: Colors.primaryBackgroundColor },
  superlikeButton: {
    backgroundColor: Colors.primary.white,
    borderWidth: 1,
    borderColor: 'rgba(233, 64, 87, 0.35)',
  },
  dislikeIcon: { color: 'orange' },
  likeIcon: { color: Colors.primary.white },
  superlikeIcon: { color: Colors.primaryBackgroundColor },
  occupationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 6,
  },
  occupation: {
    fontSize: 15,
    color: Colors.primary.white,
    fontFamily: 'HellixMedium',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    opacity: 0.95,
  },
  occupationTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginTop: 4,
  },
  occupationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.primaryBackgroundColor + '15',
    borderWidth: 1.5,
    borderColor: Colors.primaryBackgroundColor + '40',
    marginHorizontal: 6,
    marginBottom: 10,
  },
  occupationTagText: {
    fontSize: 14,
    color: Colors.primaryBackgroundColor,
    fontFamily: 'HellixSemiBold',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryBackgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryBackgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  contentSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: Colors.primary.white,
  },
  premiumBadge: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  premiumBadgeGradient: {
    padding: 16,
  },
  premiumBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  premiumBadgeText: {
    fontSize: 16,
    color: Colors.primary.white,
    fontFamily: 'HellixSemiBold',
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'HellixBold',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  locationCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: Colors.primaryBackgroundColor,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  locationCardGradient: {
    padding: 16,
  },
  locationCardContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  distanceIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  distanceInfoContainer: {
    alignItems: 'flex-start',
  },
  distanceValue: {
    fontSize: 24,
    color: Colors.primary.white,
    marginBottom: 4,
  },
  distanceLabel: {
    fontSize: 14,
    color: Colors.primary.white,
    opacity: 0.9,
  },

  bioText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  readMoreText: {
    fontSize: 16,
    color: Colors.primaryBackgroundColor,
  },

  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  tagSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.primaryBackgroundColor,
    marginHorizontal: 5,
    marginBottom: 10,
  },
  tagSelectedText: {
    fontSize: 12,
    color: Colors.primary.white,
  },
  tagUnselected: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.primary.white,
    borderWidth: 1,
    borderColor: Colors.auth.inputBorder,
    marginHorizontal: 5,
    marginBottom: 10,
  },
  tagUnselectedText: {
    fontSize: 14,
    color: Colors.text.primary,
  },

  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginTop: 4,
  },
  galleryImageContainer: {
    width: (SCREEN_WIDTH - 52) / 2,
    height: (SCREEN_WIDTH - 52) / 2,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.text.light,
    marginHorizontal: 6,
    marginBottom: 12,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  seeAllText: {
    fontSize: 16,
    color: Colors.primaryBackgroundColor,
  },
  headerImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.text.light,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  alertContainer: {
    backgroundColor: Colors.primary.white,
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  alertHeader: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 22,
    color: Colors.titleColor,
    textAlign: 'center',
  },
  alertContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  alertMessage: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  alertActions: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
  },
  alertButton: {
    backgroundColor: Colors.primaryBackgroundColor,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primaryBackgroundColor,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  alertButtonText: {
    fontSize: 16,
    color: Colors.primary.white,
  },
})

export default UserProfileView
