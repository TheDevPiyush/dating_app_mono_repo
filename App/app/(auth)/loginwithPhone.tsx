import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import CustomBackButton from '@/components/CustomBackButton';
import CustomDialog, { DialogType } from '@/components/CustomDialog';
import MainButton from '@/components/MainButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone } from 'react-native-feather';
import { useAuth } from '@/hooks/useAuth';
import CustomLoader from '@/components/CustomLoader';
import { useDeepLinkProcessing } from '@/hooks/useDeepLinkProcessing';
import { useTranslation } from 'react-i18next';

const OTP_LENGTH = 6;
const INDIA_COUNTRY_CODE = '+91';

export default function LoginWithEmail() {
  const { t } = useTranslation();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [statusMessage, setStatusMessage] = useState('');

  const { signInWithPhoneOtp, verifyPhoneOtp, isLoading } = useAuth();
  const isDeepLinkProcessing = useDeepLinkProcessing();

  const otpInputRef = useRef<TextInput | null>(null);

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

  const normalizedPhone = phone.replace(/\D/g, '').slice(0, 10);
  const fullPhoneNumber = `${INDIA_COUNTRY_CODE}${normalizedPhone}`;
  const isOtpStep = step === 'OTP';

  const validatePhone = () => /^\d{10}$/.test(normalizedPhone);

  useEffect(() => {
    if (isOtpStep) {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 200);
    }
  }, [isOtpStep]);

  const handleSendOtp = async () => {
    if (!validatePhone()) {
      showDialog('error', t('auth.error'), 'Enter a valid 10-digit mobile number.');
      return;
    }

    const result = await signInWithPhoneOtp(fullPhoneNumber);

    if (result.error) {
      showDialog('error', t('auth.error'), result.error.message);
      return;
    }

    setOtp('');
    setStep('OTP');
    setStatusMessage(`Enter the 6-digit code we sent to ${fullPhoneNumber}.`);

    showDialog(
      'info',
      'Check your phone',
      `We sent a one-time code to ${fullPhoneNumber}.`
    );
  };

  const handleVerifyOtp = async () => {
    if (otp.length < OTP_LENGTH) {
      showDialog('error', t('auth.error'), 'Please enter the 6-digit code.');
      return;
    }

    const result = await verifyPhoneOtp(fullPhoneNumber, otp);

    if (result.error) {
      showDialog('error', t('auth.error'), result.error.message);
      return;
    }

    setStatusMessage('Code verified! Finishing sign-in...');
  };

  const handleResendOtp = () => {
    if (isLoading) return;
    handleSendOtp();
  };

  const handleUseDifferentPhone = () => {
    setStep('PHONE');
    setOtp('');
    setStatusMessage('');
  };

  const handleOtpChange = (value: string) => {
    const numbersOnly = value.replace(/\D/g, '');
    setOtp(numbersOnly.slice(0, OTP_LENGTH));
  };

  const handlePhoneChange = (value: string) => {
    const numbersOnly = value.replace(/\D/g, '');
    setPhone(numbersOnly.slice(0, 10));
  };

  const handlePrimaryAction = () => {
    if (isOtpStep) {
      handleVerifyOtp();
    } else {
      handleSendOtp();
    }
  };

  const otpDigits = Array.from({ length: OTP_LENGTH }, (_, i) => otp[i] ?? '');

  if (isDeepLinkProcessing) {
    return <CustomLoader messages={[t('auth.justAMoment')]} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomDialog
        visible={dialogVisible}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        onDismiss={() => setDialogVisible(false)}
        primaryButton={{
          text: t('auth.ok') || 'OK',
          onPress: () => setDialogVisible(false),
        }}
      />

      <CustomBackButton />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <ThemedText type="title" style={styles.mainHeading}>
            {isOtpStep ? 'Check your phone' : 'Sign In with Phone'}
          </ThemedText>

          <ThemedText type="default" style={styles.subHeading}>
            {isOtpStep
              ? statusMessage ||
              `Enter the 6-digit code we sent to ${fullPhoneNumber}.`
              : 'We will send a one-time code to your phone number.'}
          </ThemedText>

          {/* Phone Input */}
          {!isOtpStep && (
            <View style={styles.inputContainer}>
              <Phone
                color={Colors.iconsColor}
                style={styles.inputIcon}
                width={20}
                height={20}
              />
              <ThemedText style={styles.countryCodeText}>{INDIA_COUNTRY_CODE}</ThemedText>
              <TextInput
                style={styles.textInput}
                placeholder="10-digit mobile number"
                placeholderTextColor={Colors.text?.secondary}
                value={phone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                maxLength={10}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="telephoneNumber"
                autoComplete="tel-national"
              />
            </View>
          )}

          {/* OTP Input */}
          {isOtpStep && (
            <View style={styles.otpContainer}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => otpInputRef.current?.focus()}
              >
                <View style={styles.otpBoxes}>
                  {otpDigits.map((digit, index) => {
                    const isActive = index === otp.length;

                    return (
                      <View
                        key={index}
                        style={[
                          styles.otpBox,
                          digit && styles.otpBoxFilled,
                          isActive && styles.otpBoxActive,
                        ]}
                      >
                        <ThemedText type="title" style={styles.otpDigit}>
                          {digit || ' '}
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>
              </TouchableOpacity>

              <TextInput
                ref={otpInputRef}
                value={otp}
                onChangeText={handleOtpChange}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                textContentType="oneTimeCode"
                autoFocus
                style={styles.hiddenOtpInput}
              />

              <View style={styles.helperStack}>
                <View style={styles.helperRow}>
                  <TouchableOpacity onPress={handleUseDifferentPhone}>
                    <ThemedText type="default" style={styles.changeEmailText}>
                      Change phone
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleResendOtp}
                    disabled={isLoading}
                  >
                    <ThemedText
                      type="defaultSemiBold"
                      style={[
                        styles.helperAction,
                        isLoading && styles.helperActionDisabled,
                      ]}
                    >
                      Resend
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          <View style={styles.footer}>
            <MainButton
              title={isOtpStep ? 'Verify & Sign In' : t('auth.continue')}
              onPress={handlePrimaryAction}
              disabled={isLoading}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  mainHeading: {
    fontSize: 26,
    color: Colors.titleColor,
  },
  subHeading: {
    fontSize: 16,
    color: Colors.text?.secondary,
    marginTop: 8,
    marginBottom: 32,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary?.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.text?.light,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 24,
    shadowColor: Colors.primaryBackgroundColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.titleColor,
    paddingVertical: 16,
    fontFamily: 'HellixMedium',
  },
  countryCodeText: {
    color: Colors.text?.secondary,
    marginRight: 8,
    fontSize: 16,
    fontFamily: 'HellixMedium',
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: Colors.text?.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  otpContainer: {
    backgroundColor: Colors.primary?.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.text?.light,
    shadowColor: Colors.primaryBackgroundColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  otpBoxes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpBox: {
    flex: 1,
    aspectRatio: 0.9,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.text?.light,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary?.white,
    marginHorizontal: 6,
  },
  otpBoxFilled: {
    borderColor: Colors.primaryBackgroundColor,
    backgroundColor: `${Colors.primaryBackgroundColor}10`,
  },
  otpBoxActive: {
    borderColor: Colors.primaryBackgroundColor,
    shadowColor: Colors.primaryBackgroundColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  otpDigit: {
    color: Colors.titleColor,
    fontFamily: 'HellixSemiBold',
    fontSize: 22,
  },
  otpDigitPlaceholder: {
    color: Colors.text?.light,
  },
  hiddenOtpInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: 60,
  },
  helperStack: {
    marginTop: 20,
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helperText: {
    color: Colors.text?.secondary,
    fontSize: 14,
  },
  helperAction: {
    color: Colors.primaryBackgroundColor,
    fontSize: 14,
  },
  helperActionDisabled: {
    opacity: 0.5,
  },
  changeEmailText: {
    color: Colors.text?.secondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  loadingIndicator: {
    marginRight: 10,
  },
  loadingText: {
    color: Colors.primary.white,
    fontSize: 16,
    fontFamily: 'HellixSemiBold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryBackgroundColor,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
});
