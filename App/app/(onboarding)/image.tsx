import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Animated } from 'react-native';
import { Image } from 'expo-image';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomBackButton from '@/components/CustomBackButton';
import MainButton from '@/components/MainButton';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { requestPresignedURl, uploadMultipleTos3 } from '@/hooks/uploadTos3';
import { useOnboardingStore } from '@/store/onboardingStore';
import { compressImageToJPEG } from '@/utils/imageCompression';
import { useTranslation } from 'react-i18next';
import CustomDialog, { DialogType } from '@/components/CustomDialog';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_SIZE = (screenWidth - 80) / 3;

export default function PremiumImageSelectorScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { photos, setPhotos } = useOnboardingStore();
  const [selectedImages, setSelectedImages] = useState<(string | null)[]>(Array(6).fill(null));
  const [selectedImageMimeTypes, setSelectedImageMimeTypes] = useState<string[]>(Array(6).fill('image/jpeg'));
  const [isLoading, setIsLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    type: DialogType;
    title: string;
    message: string;
  }>({
    type: 'error',
    title: '',
    message: '',
  });

  const showDialog = (type: DialogType, title: string, message: string) => {
    setDialogConfig({ type, title, message });
    setDialogVisible(true);
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Load existing photos from store on component mount
  useEffect(() => {
    if (photos && photos.length > 0) {
      const slots = Array(6).fill(null) as (string | null)[];
      const mimeSlots = Array(6).fill('image/jpeg');
      photos.slice(0, 6).forEach((photo, index) => {
        slots[index] = photo;
        mimeSlots[index] = 'image/jpeg';
      });
      setSelectedImages(slots);
      setSelectedImageMimeTypes(mimeSlots);
    }
  }, [photos]);

  const handleupload = async () => {
    try {
      if (!Array.isArray(photos) || photos.length === 0) {
        const filledImages = selectedImages
          .map((uri, index) => ({ uri, mimeType: selectedImageMimeTypes[index] }))
          .filter(item => !!item.uri) as { uri: string; mimeType: string }[];

        if (filledImages.length === 0) return;

        // Step 1: Compress all images
        const compressedImages: string[] = [];
        const compressedMimeTypes: string[] = [];

        for (let i = 0; i < filledImages.length; i++) {
          try {
            const compressed = await compressImageToJPEG(
              filledImages[i].uri,
              0.8  // Good quality for profile photos
            );

            compressedImages.push(compressed.uri);
            compressedMimeTypes.push(compressed.mimeType);

            // Log compression stats
            const originalInfo = await FileSystem.getInfoAsync(filledImages[i].uri);
            if (originalInfo.exists && compressed.size) {
              const originalSize = (originalInfo as any).size;
              const compressionRatio = ((1 - compressed.size / originalSize) * 100).toFixed(1);
            }
          } catch (compressionError) {
            compressedImages.push(filledImages[i].uri);
            compressedMimeTypes.push(filledImages[i].mimeType);
          }
        }


        // Step 2: Request presigned URLs with compressed image MIME types
        const arrayofPresignedUrls = await requestPresignedURl(compressedMimeTypes);

        // Step 3: Prepare result array with compressed images
        let resultArray = [];
        for (let i = 0; i < compressedImages.length; i++) {
          let obj = {
            LocalUrl: compressedImages[i],
            PresignedUrl: arrayofPresignedUrls[i].uploadUrl,
            MimeType: compressedMimeTypes[i]
          };
          resultArray.push(obj);
        }

        let ImagePublicUrl = [];
        for (let i = 0; i < compressedImages.length; i++) {
          const fileUrl = arrayofPresignedUrls[i].fileURL;
          ImagePublicUrl.push(fileUrl);
        }

        // Save the public URLs to Zustand store
        setPhotos(ImagePublicUrl);

        // Step 4: Upload compressed images to S3
        const uploadResponse = await uploadMultipleTos3(resultArray);

        // Step 5: Clean up temporary compressed files
        for (let i = 0; i < compressedImages.length; i++) {
          if (compressedImages[i] !== filledImages[i].uri) {
            try {
              await FileSystem.deleteAsync(compressedImages[i], { idempotent: true });
            } catch (cleanupError) {
            }
          }
        }
      }
    } catch (error) {
    }
  }

  const pickImageForSlot = async (slotIndex: number) => {
    try {
      setIsLoading(true);

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        showDialog('warning', t('image.permissionRequired'), t('image.grantCameraRoll'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsMultipleSelection: false,
        quality: 1,
        allowsEditing: true,
        aspect: [4, 5],
      });



      if (!result.canceled && result.assets) {
        const chosenImage = result.assets[0];
        setSelectedImages(prev => {
          const next = [...prev];
          next[slotIndex] = chosenImage.uri;
          return next;
        });
        setSelectedImageMimeTypes(prev => {
          const next = [...prev];
          next[slotIndex] = chosenImage.mimeType || 'image/jpeg';
          return next;
        });

        // Success animation feedback
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0.95,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } catch (error) {
      showDialog('error', t('profile.error'), t('profile.failedToSelectImage'));
    } finally {
      setIsLoading(false);
    }
  };

  const removeImage = (index: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    const newSelectedImages = [...selectedImages];
    const newSelectedImageMimeTypes = [...selectedImageMimeTypes];
    newSelectedImages[index] = null;
    newSelectedImageMimeTypes[index] = 'image/jpeg';
    setSelectedImages(newSelectedImages);
    setSelectedImageMimeTypes(newSelectedImageMimeTypes);
    setPhotos(newSelectedImages.filter(Boolean) as string[]);
  };

  const handleContinue = () => {
    if (selectedImages.every(Boolean)) {
      router.push('/(onboarding)/notification');
    } else {
      const firstEmpty = selectedImages.findIndex(image => !image);
      if (firstEmpty >= 0) {
        pickImageForSlot(firstEmpty);
      }
    }
  };

  const filledCount = selectedImages.filter(Boolean).length;
  const remainingImages = 6 - filledCount;
  const isComplete = filledCount === 6;
  const progressPercentage = (filledCount / 6) * 100;

  const renderImageCard = (index: number, isPrimary = false) => {
    const imageUri = selectedImages[index];

    return (
      <Animated.View
        key={index}
        style={[
          styles.imageCard,
          isPrimary && styles.primaryImageCard,
          {
            opacity: fadeAnim,
            transform: [
              {
                scale: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.cardTouchable}
          onPress={() => pickImageForSlot(index)}
          activeOpacity={0.7}
        >
          {imageUri ? (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: imageUri }}
                style={styles.selectedImage}
                transition={300}
              />
              <View style={styles.imageOverlay} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeImage(index)}
              >
                <View style={styles.removeButtonInner}>
                  <Ionicons name="close" size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <View style={styles.imageNumberBadge}>
                <ThemedText style={styles.imageNumberText}>
                  {isPrimary ? 'P' : index + 1}
                </ThemedText>
              </View>
              <View style={styles.editBadge}>
                <ThemedText style={styles.editBadgeText}>Change</ThemedText>
              </View>
            </View>
          ) : (
            <View style={[styles.emptyCard, styles.emptyCardGradient]}>
              <View style={styles.addIconContainer}>
                <MaterialCommunityIcons name="plus" size={28} color={Colors.primaryBackgroundColor} />
              </View>
              <ThemedText style={styles.addText}>
                {isPrimary ? 'Add Primary' : t('image.addPhoto')}
              </ThemedText>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomDialog
        visible={dialogVisible}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        onDismiss={() => setDialogVisible(false)}
      />
      <CustomBackButton />

      {/* Modern Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <ThemedText style={styles.title}>
            {t('image.title')}
          </ThemedText>
          <View style={styles.titleUnderline} />
        </View>
        <ThemedText style={styles.subtitle}>
          {t('image.subtitle')}
        </ThemedText>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressLabels}>
            <ThemedText style={styles.progressText}>
              {filledCount}/6 {t('image.photos')}
            </ThemedText>
            <ThemedText style={styles.progressPercentage}>
              {Math.round(progressPercentage)}%
            </ThemedText>
          </View>
          <View style={styles.progressBarBackground}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercentage}%`,
                }
              ]}
            />
          </View>
        </View>
      </View>

      {/* Enhanced Scrollable Image Grid */}
      <ScrollView
        style={styles.scrollableContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.primarySection}>
          <ThemedText style={styles.primaryLabel}>Primary photo</ThemedText>
          <ThemedText style={styles.primaryHint}>
            This is shown first on your profile card
          </ThemedText>
          {renderImageCard(0, true)}
        </View>

        <View style={styles.gallerySection}>
          <ThemedText style={styles.galleryLabel}>Gallery photos</ThemedText>
          <View style={styles.imageGrid}>
            {Array.from({ length: 5 }, (_, idx) => renderImageCard(idx + 1))}
          </View>
        </View>
      </ScrollView>

      {/* Enhanced Bottom Button */}
      <View style={styles.buttonContainer}>
        <MainButton
          title={
            isComplete
              ? t('image.continue')
              : remainingImages === 1
                ? t('image.selectMore', { count: remainingImages })
                : t('image.selectMorePlural', { count: remainingImages })
          }
          onPress={() => {
            handleContinue();
            handleupload();
          }}
          disabled={isLoading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  scrollableContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#FAFBFC',
  },
  titleContainer: {
    alignItems: 'flex-start',
    marginBottom: 13,
  },
  title: {
    textAlign: 'left',
    marginBottom: 10,
    color: '#1A1A1A',
    fontSize: 28,
    letterSpacing: -0.5,
  },
  titleUnderline: {
    width: 40,
    height: 3,
    backgroundColor: Colors.primaryBackgroundColor,
    borderRadius: 2,
  },
  subtitle: {
    fontSize: 17,
    textAlign: 'left',
    color: '#6B7280',
    lineHeight: 26,
    marginBottom: 15,
  },
  progressContainer: {
    marginBottom: 1,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 15,
    color: '#374151',
  },
  progressPercentage: {
    fontSize: 15,
    color: Colors.primaryBackgroundColor,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primaryBackgroundColor,
    borderRadius: 4,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  primarySection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  primaryLabel: {
    fontSize: 18,
    color: '#111827',
    marginBottom: 4,
  },
  primaryHint: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    textAlign: 'center',
  },
  gallerySection: {
    marginTop: 4,
  },
  galleryLabel: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
  },
  imageCard: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  primaryImageCard: {
    width: screenWidth * 0.46,
    height: screenWidth * 0.58,
  },
  cardTouchable: {
    flex: 1,
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 15,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  removeButtonInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  imageNumberBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  imageNumberText: {
    fontSize: 11,
    color: '#374151',
  },
  editBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(17,24,39,0.8)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
  },
  emptyCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    backgroundColor: '#FAFAFA',
  },
  emptyCardGradient: {
    backgroundColor: '#FAFAFA',
  },
  addIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  addText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#FAFBFC',
  },
});