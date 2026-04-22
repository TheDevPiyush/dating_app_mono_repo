import MainButton from '@/components/MainButton';
import { ThemedText } from '@/components/ThemedText';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useAuthStore } from '@/store/authStore';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { requestPresignedURl, uploadTos3 } from '@/hooks/uploadTos3';
import { compressImageToJPEG } from '@/utils/imageCompression';
import { useUser } from '@/hooks/useUser';
import * as FileSystem from 'expo-file-system/legacy';
import CustomDialog, { DialogType } from '@/components/CustomDialog';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { fullName, setFullName, birthday, setBirthday, profilePicture, setProfilePicture } = useOnboardingStore();
  const { dbUser, idToken, setDBUser } = useAuthStore();
  const { updateUser, getUser } = useUser();
  const [birthdayInput, setBirthdayInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const birthdayInputRef = React.useRef<TextInput | null>(null);

  const convertIsoToBirthdayDigits = (isoDate: string) => {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}${month}${year}`;
  };

  const isValidDate = (day: number, month: number, year: number) => {
    if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
      return false;
    }

    const candidate = new Date(year, month - 1, day);
    return (
      candidate.getFullYear() === year &&
      candidate.getMonth() === month - 1 &&
      candidate.getDate() === day
    );
  };

  const handleBirthdayInputChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 8);
    setBirthdayInput(numericValue);

    if (numericValue.length !== 8) {
      setBirthday('');
      return;
    }

    const day = Number(numericValue.slice(0, 2));
    const month = Number(numericValue.slice(2, 4));
    const year = Number(numericValue.slice(4, 8));

    if (!isValidDate(day, month, year)) {
      setBirthday('');
      return;
    }

    const localDate = new Date(year, month - 1, day);
    localDate.setHours(12, 0, 0, 0);
    setBirthday(localDate.toISOString());
  };

  useEffect(() => {
    if (birthday) {
      setBirthdayInput(convertIsoToBirthdayDigits(birthday));
      return;
    }
    setBirthdayInput('');
  }, [birthday, setBirthday]);

  const [uploadedPhotoURL, setUploadedPhotoURL] = useState<string | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    type: DialogType;
    title: string;
    message: string;
    primaryButton?: { text: string; onPress: () => void };
    secondaryButton?: { text: string; onPress: () => void };
    cancelButton?: { text: string; onPress: () => void };
  }>({
    type: 'error',
    title: '',
    message: '',
  });

  const showDialog = (
    type: DialogType,
    title: string,
    message: string,
    onPrimaryPress?: () => void,
    onSecondaryPress?: () => void,
    onCancelPress?: () => void
  ) => {
    const config: typeof dialogConfig = {
      type,
      title,
      message,
    };

    if (onPrimaryPress) {
      config.primaryButton = {
        text: t('profile.takePhoto') || 'Take Photo',
        onPress: onPrimaryPress,
      };
    }
    if (onSecondaryPress) {
      config.secondaryButton = {
        text: t('profile.chooseFromLibrary') || 'Choose from Library',
        onPress: onSecondaryPress,
      };
    }
    if (onCancelPress) {
      config.cancelButton = {
        text: t('profile.cancel') || 'Cancel',
        onPress: onCancelPress,
      };
    }

    setDialogConfig(config);
    setDialogVisible(true);
  };
  
  // Initialize name from provider if available, otherwise from store
  const getInitialFirstName = () => {
    if (dbUser?.displayName) {
      return dbUser.displayName.split(' ')[0] || '';
    }
    return fullName.split(' ')[0] || '';
  };

  const getInitialLastName = () => {
    if (dbUser?.displayName) {
      const parts = dbUser.displayName.split(' ');
      return parts.slice(1).join(' ') || '';
    }
    return fullName.split(' ').slice(1).join(' ') || '';
  };

  const [firstName, setFirstName] = useState(getInitialFirstName());
  const [lastName, setLastName] = useState(getInitialLastName());
  const [heightFt, setHeightFt] = useState('');

  // Initialize profile picture from provider if available (only once)
  useEffect(() => {
    if (dbUser?.photoURL && !profilePicture) {
      setProfilePicture(dbUser.photoURL);
      setUploadedPhotoURL(dbUser.photoURL);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbUser?.photoURL]);

  // Initialize name from provider on mount
  useEffect(() => {
    if (dbUser?.displayName) {
      const nameParts = dbUser.displayName.split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
    }
  }, [dbUser?.displayName]);

  const calculateAge = (dateOfBirth: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    return age;
  };

  const handleConfirm = () => {
    if (!firstName.trim() || !lastName.trim()) {
      showDialog('error', t('profile.missingInfo'), t('profile.enterBothNames'));
      return;
    }

    if (!birthday) {
      showDialog('error', t('profile.missingInfo'), t('profile.selectBirthday'));
      return;
    }

    // Validate age (must be 18+)
    const birthdayDate = new Date(birthday);
    const age = calculateAge(birthdayDate);
    
    if (age < 18) {
      showDialog('warning', t('profile.ageRestriction'), t('profile.mustBe18'));
      return;
    }

    setFullName(`${firstName.trim()} ${lastName.trim()}`);
    router.push('/(onboarding)/referral');
  };

  const handleHeightChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    const [wholePart, ...decimalParts] = sanitized.split('.');
    const decimalPart = decimalParts.join('');
    const normalized =
      decimalParts.length > 0
        ? `${wholePart.slice(0, 1)}.${decimalPart.slice(0, 2)}`
        : wholePart.slice(0, 1);
    setHeightFt(normalized);
  };

  const uploadProfilePicture = async (imageUri: string) => {
    try {
      setIsUploading(true);
      
      // Check if it's already an S3 URL
      if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
        setUploadedPhotoURL(imageUri);
        setIsUploading(false);
        return imageUri;
      }

      // Compress the image
      const compressed = await compressImageToJPEG(imageUri, 0.8);
      
      // Request presigned URL
      const presignedUrls = await requestPresignedURl([compressed.mimeType]);
      
      if (!presignedUrls || presignedUrls.length === 0) {
        throw new Error('Failed to get presigned URL');
      }

      const { uploadUrl, fileURL } = presignedUrls[0];

      // Upload to S3
      const uploadSuccess = await uploadTos3(
        compressed.uri,
        uploadUrl,
        compressed.mimeType
      );

      if (!uploadSuccess) {
        throw new Error('Failed to upload image');
      }

      // Clean up compressed file if different from original
      if (compressed.uri !== imageUri) {
        try {
          await FileSystem.deleteAsync(compressed.uri, { idempotent: true });
        } catch (cleanupError) {
          console.warn('Failed to clean up compressed file:', cleanupError);
        }
      }

      setUploadedPhotoURL(fileURL);
      
      // Save to database immediately
      if (idToken) {
        try {
          await updateUser(idToken, { photoURL: fileURL });
          const updatedUserResponse = await getUser(idToken);
          const updatedDBUser = updatedUserResponse?.data?.user || updatedUserResponse?.data;
          if (updatedDBUser) {
            setDBUser(updatedDBUser);
          }
        } catch (error) {
          console.error('Failed to save photoURL to database:', error);
        }
      }

      setIsUploading(false);
      return fileURL;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setIsUploading(false);
      showDialog('error', t('profile.error'), t('profile.failedToUploadImage'));
      throw error;
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        showDialog('warning', t('profile.permissionRequired'), t('profile.cameraRollPermission'));
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        const selectedUri = result.assets[0].uri;
        setProfilePicture(selectedUri);
        // Upload immediately
        await uploadProfilePicture(selectedUri);
      }
    } catch (error) {
      showDialog('error', t('profile.error'), t('profile.failedToSelectImage'));
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        showDialog('warning', t('profile.permissionRequired'), t('profile.cameraPermission'));
        return;
      }

      let result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        const selectedUri = result.assets[0].uri;
        setProfilePicture(selectedUri);
        // Upload immediately
        await uploadProfilePicture(selectedUri);
      }
    } catch (error) {
      showDialog('error', t('profile.error'), t('profile.failedToTakePhoto'));
    }
  };

  const showImagePickerOptions = () => {
    showDialog(
      'info',
      t('profile.selectProfilePicture'),
      t('profile.chooseOption'),
      () => {
        setDialogVisible(false);
        takePhoto();
      },
      () => {
        setDialogVisible(false);
        pickImage();
      },
      () => {
        setDialogVisible(false);
      }
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
        primaryButton={dialogConfig.primaryButton || {
          text: t('auth.ok') || 'OK',
          onPress: () => setDialogVisible(false),
        }}
        secondaryButton={dialogConfig.secondaryButton}
        cancelButton={dialogConfig.cancelButton}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <ThemedText type="title" style={styles.title}>{t('profile.title')}</ThemedText>
              <ThemedText type='default' style={styles.subtitle}>{t('profile.subtitle')}</ThemedText>
            </View>

            <View style={styles.profilePictureContainer}>
              <TouchableOpacity 
                onPress={showImagePickerOptions} 
                style={styles.profilePictureButton}
                disabled={isUploading}
              >
                <View style={styles.profilePicture}>
                  {profilePicture ? (
                    <>
                      <Image
                        source={{ uri: profilePicture }}
                        style={styles.profileImage}
                      />
                      {isUploading && (
                        <View style={styles.uploadingOverlay}>
                          <ActivityIndicator size="large" color="#FFFFFF" />
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.profileImagePlaceholder}>
                      <Ionicons name="person" size={60} color={Colors.text.tertiary} />
                    </View>
                  )}
                  <View style={styles.cameraIcon}>
                    <Ionicons name="camera" size={20} color={Colors.primary.white} />
                  </View>
                </View>
              </TouchableOpacity>
              <ThemedText type='default' style={styles.profilePictureHint}>
                {isUploading ? t('profile.uploading') : t('profile.tapToChangePhoto')}
              </ThemedText>
              {profilePicture && uploadedPhotoURL && (
                <View style={styles.editOptionsContainer}>
                  <TouchableOpacity 
                    style={styles.editOptionButton}
                    onPress={showImagePickerOptions}
                  >
                    <Ionicons name="create-outline" size={16} color={Colors.primaryBackgroundColor} />
                    <ThemedText style={styles.editOptionText}>{t('profile.editPhoto')}</ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <ThemedText type='default' style={styles.inputLabel}>{t('profile.firstName')}</ThemedText>
                <TextInput
                  style={styles.textInput}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="David"
                  placeholderTextColor={Colors.text.tertiary}
                />
              </View>

              <View style={styles.inputWrapper}>
                <ThemedText type='default' style={styles.inputLabel}>{t('profile.lastName')}</ThemedText>
                <TextInput
                  style={styles.textInput}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Peterson"
                  placeholderTextColor={Colors.text.tertiary}
                />
              </View>

              <View style={styles.inputWrapper}>
                <ThemedText type='default' style={styles.inputLabel}>{t('profile.birthday')}</ThemedText>
                <TouchableOpacity
                  style={styles.birthdayButton}
                  activeOpacity={0.9}
                  onPress={() => birthdayInputRef.current?.focus()}
                >
                  <View style={styles.birthdaySlots}>
                    {Array.from({ length: 8 }, (_, index) => {
                      const slotChar = birthdayInput[index] || '';
                      const isActive = index === birthdayInput.length;
                      const isFilled = !!slotChar;

                      return (
                        <React.Fragment key={index}>
                          {(index === 2 || index === 4) && (
                            <ThemedText style={styles.birthdaySlash}>/</ThemedText>
                          )}
                          <View
                            style={[
                              styles.birthdayDigitBox,
                              isFilled && styles.birthdayDigitBoxFilled,
                              isActive && styles.birthdayDigitBoxActive,
                            ]}
                          >
                            <ThemedText style={styles.birthdayDigitText}>
                              {slotChar || ''}
                            </ThemedText>
                          </View>
                        </React.Fragment>
                      );
                    })}
                  </View>
                </TouchableOpacity>
                <TextInput
                  ref={birthdayInputRef}
                  style={styles.hiddenBirthdayInput}
                  value={birthdayInput}
                  onChangeText={handleBirthdayInputChange}
                  keyboardType="number-pad"
                  maxLength={8}
                  textContentType="none"
                />
              </View>

              <View style={styles.inputWrapper}>
                <ThemedText type='default' style={styles.inputLabel}>Height</ThemedText>
                <View style={styles.heightInputContainer}>
                  <TextInput
                    style={styles.heightInput}
                    value={heightFt}
                    onChangeText={handleHeightChange}
                    placeholder="5.8"
                    placeholderTextColor={Colors.text.tertiary}
                    keyboardType="decimal-pad"
                    maxLength={4}
                  />
                  <ThemedText type='default' style={styles.heightSuffix}>
                    ft
                  </ThemedText>
                </View>
              </View>
            </View>

            <MainButton
              title={t('profile.continue')}
              onPress={handleConfirm}
            />
          </View>
        </ScrollView>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.white,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    color: Colors.onboarding.titleText,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.onboarding.descriptionText,
    textAlign: 'center',
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  profilePictureButton: {
    shadowColor: Colors.primaryBackgroundColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  profilePicture: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.secondaryBackgroundColor,
    borderWidth: 3,
    borderColor: Colors.secondaryBackgroundColor,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.secondaryBackgroundColor,
    borderWidth: 3,
    borderColor: Colors.secondaryBackgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primaryBackgroundColor,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.parentBackgroundColor,
  },
  profilePictureHint: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 8,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editOptionsContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  editOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryBackgroundColor,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  editOptionText: {
    fontSize: 14,
    color: Colors.primaryBackgroundColor,
  },
  inputContainer: {
    flex: 1,
    marginBottom: 32,
  },
  inputWrapper: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    color: Colors.text.primary,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  textInput: {
    // backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text.primary,
    fontFamily:"HellixBold"
  },
  birthdayButton: {
    // backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  birthdaySlots: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'center',
  },
  birthdayDigitBox: {
    width: 22,
    borderBottomWidth: 1.25,
    borderBottomColor: '#CFCFCF',
    alignItems: 'center',
    paddingBottom: 4,
    minHeight: 24,
  },
  birthdayDigitBoxFilled: {
    borderBottomColor: Colors.primaryBackgroundColor,
  },
  birthdayDigitBoxActive: {
    borderBottomColor: Colors.primaryBackgroundColor,
  },
  birthdayDigitText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  birthdaySlash: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginHorizontal: 3,
    marginBottom: 4,
  },
  birthdayPlaceholder: {
    marginTop: 6,
    fontSize: 11,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  hiddenBirthdayInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: 1,
  },
  heightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  heightInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
    paddingVertical: 12,
  },
  heightSuffix: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 8,
  },
});