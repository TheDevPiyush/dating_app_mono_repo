import { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  StatusBar,
  Image,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import CustomDialog, { DialogType } from '@/components/CustomDialog';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useDeepLinkProcessing } from '@/hooks/useDeepLinkProcessing';
import { useTranslation } from 'react-i18next';
import AntDesign from '@expo/vector-icons/AntDesign';
import { Foundation } from '@expo/vector-icons';

/* Floating bubble */
const FloatingBubble = ({
  size,
  color,
  top,
  left,
  right,
  bottom,
  duration = 5000,
}: any) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 20],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        top,
        left,
        right,
        bottom,
        transform: [{ translateY }],
      }}
    />
  );
};

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const { loading: googleLoading, signInWithGoogleMobile } =
    useGoogleAuth();
  const isDeepLinkProcessing = useDeepLinkProcessing();

  const panelAnim = useRef(new Animated.Value(80)).current;
  const textFade = useRef(new Animated.Value(0)).current;

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
    Animated.parallel([
      Animated.spring(panelAnim, {
        toValue: 0,
        friction: 12,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(textFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithGoogleMobile();
      if (result.error) {
        showDialog('error', "Google Sign-In Cancelled", "Sign-In was cancelled. Please try again.");
      }
    } catch (error) {
      showDialog('error', t('auth.error'), t('auth.unexpectedError'));
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.primaryBackgroundColor}
      />

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

      {/* Floating background */}
      <FloatingBubble size={260} color="rgba(255,255,255,0.06)" top={-80} left={-60} duration={7000} />
      <FloatingBubble size={200} color="rgba(255,255,255,0.05)" bottom={140} right={-40} duration={5500} />
      <FloatingBubble size={120} color="rgba(255,255,255,0.07)" top={120} right={40} duration={4800} />

      {/* Top text section */}
      <Animated.View style={[styles.topContent, { opacity: textFade }]}>
        <Image
          source={require('@/assets/images/landing_screen.png')}
          style={[styles.logoImage]}
          resizeMode="cover"
        />
        <ThemedText type="title" style={styles.mainHeading}>
          Let's get started..
        </ThemedText>
        <ThemedText style={styles.subHeading}>
          {t('auth.signInToStart')}
        </ThemedText>
      </Animated.View>

      {/* Bottom sheet */}
      <Animated.View
        style={[
          styles.bottomPanel,
          { transform: [{ translateY: panelAnim }] },
        ]}
      >


        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.PhoneButton}
          onPress={() => router.push('/(auth)/loginwithPhone')}
          disabled={googleLoading || isDeepLinkProcessing}
        >
          {isDeepLinkProcessing ?
            <ActivityIndicator size={"small"} color={'white'} />
            :
            <>
              <Foundation
                name="telephone"
                size={24}
                color={Colors.text.light}
              />
              <ThemedText type='defaultSemiBold' style={styles.PhoneText}>
                Continue with Phone
              </ThemedText>
            </>
          }
        </TouchableOpacity>


        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <ThemedText style={styles.dividerText}>
            {t('auth.or')}
          </ThemedText>
          <View style={styles.divider} />
        </View>



        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.googleButton}
          onPress={handleGoogleSignIn}
          disabled={googleLoading || isDeepLinkProcessing}
        >
          {(googleLoading)
            ?
            <ActivityIndicator size={"small"} color={Colors.primaryBackgroundColor} />
            :
            <>
              <AntDesign name="google" size={22} color={Colors.primaryBackgroundColor} />
              <ThemedText type='defaultSemiBold' style={styles.googleText}>
                {t('auth.continueWithGoogle')}
              </ThemedText>
            </>
          }
        </TouchableOpacity>


        <ThemedText style={styles.footerText}>
          {t('auth.termsAndPrivacy')}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryBackgroundColor,
    justifyContent: 'space-between',
  },

  topContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  mainHeading: {
    fontSize: 28,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },

  subHeading: {
    fontSize: 16,
    color: '#f2f2f2',
    textAlign: 'center',
    lineHeight: 22,
  },

  bottomPanel: {
    backgroundColor: '#fff',
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 40,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },

  googleButton: {
    width: '100%',
    height: 52,
    borderWidth: 1.5,
    borderColor: Colors.primaryBackgroundColor,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },

  googleText: {
    fontSize: 16,
    color: Colors.primaryBackgroundColor,

  },

  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 12,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },

  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: '#999',
  },

  PhoneButton: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.primaryBackgroundColor,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  PhoneText: {
    color: '#fff',
    fontSize: 16,
  },

  footerText: {
    marginTop: 18,
    fontSize: 12,
    color: Colors.text?.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  logoContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  logoGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 50,
  },
});
