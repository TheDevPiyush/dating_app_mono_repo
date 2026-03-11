import { useAuthStore } from '@/store/authStore';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { PaperProvider, MD3LightTheme, configureFonts } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useDeepLinking } from '@/hooks/useDeepLinking';
import { Colors } from '@/constants/Colors';
import '@/config/i18n';
import { StatusBar } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

// Configure Paper theme to match app colors and fonts
const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primaryBackgroundColor, // #E94057
    onPrimary: Colors.primary.white,
    primaryContainer: Colors.primaryBackgroundColor,
    onPrimaryContainer: Colors.primary.white,
    secondary: Colors.primaryBackgroundColor,
    onSecondary: Colors.primary.white,
    tertiary: Colors.primaryBackgroundColor,
    onTertiary: Colors.primary.white,
    surface: Colors.primary.white,
    onSurface: Colors.text.primary, // #333333
    surfaceVariant: Colors.secondaryBackgroundColor, // #FCF3FA
    onSurfaceVariant: Colors.text.secondary, // #666666
    outline: '#E8E8E8',
    outlineVariant: '#E8E8E8',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    error: '#EF4444',
    onError: Colors.primary.white,
    errorContainer: '#FFEBEE',
    onErrorContainer: '#C62828',
    inverseSurface: Colors.text.primary,
    inverseOnSurface: Colors.primary.white,
    inversePrimary: Colors.primaryBackgroundColor,
    shadow: 'rgba(0, 0, 0, 0.15)',
    scrim: 'rgba(0, 0, 0, 0.5)',
  },
  fonts: configureFonts({
    config: {
      displayLarge: {
        fontFamily: 'HellixBold',
        fontSize: 57,
      },
      displayMedium: {
        fontFamily: 'HellixBold',
        fontSize: 45,
      },
      displaySmall: {
        fontFamily: 'HellixSemiBold',
        fontSize: 36,
      },
      headlineLarge: {
        fontFamily: 'HellixSemiBold',
        fontSize: 32,
      },
      headlineMedium: {
        fontFamily: 'HellixSemiBold',
        fontSize: 28,
      },
      headlineSmall: {
        fontFamily: 'HellixSemiBold',
        fontSize: 24,
      },
      titleLarge: {
        fontFamily: 'HellixSemiBold',
        fontSize: 22,
      },
      titleMedium: {
        fontFamily: 'HellixSemiBold',
        fontSize: 16,
      },
      titleSmall: {
        fontFamily: 'HellixMedium',
        fontSize: 14,
      },
      labelLarge: {
        fontFamily: 'HellixSemiBold',
        fontSize: 14,
      },
      labelMedium: {
        fontFamily: 'HellixMedium',
        fontSize: 12,
      },
      labelSmall: {
        fontFamily: 'HellixMedium',
        fontSize: 11,
      },
      bodyLarge: {
        fontFamily: 'HellixMedium',
        fontSize: 16,
      },
      bodyMedium: {
        fontFamily: 'HellixMedium',
        fontSize: 14,
      },
      bodySmall: {
        fontFamily: 'HellixMedium',
        fontSize: 12,
      },
    },
  }),
};

SplashScreen.preventAutoHideAsync();


export default function RootLayout() {
  const [loaded, error] = useFonts({
    HellixBold: require('../assets/fonts/Hellix-Bold.ttf'),
    HellixSemiBold: require('../assets/fonts/Hellix-SemiBold.ttf'),
    HellixMedium: require('../assets/fonts/Hellix-Medium.ttf'),
    HellixRegularItalic: require('../assets/fonts/Hellix-RegularItalic.ttf'),
  });

  const { setupAuthListener, getInitialSession, dbUser } = useAuthStore();

  useEffect(() => {
    const initializeAuth = async () => {
      setupAuthListener();
      await getInitialSession();
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    const screenShotAllow = async () => {
      if (dbUser?.isAdmin) {
        await ScreenCapture.allowScreenCaptureAsync();
      }
      else {
        await ScreenCapture.preventScreenCaptureAsync();
      }
    }

    screenShotAllow();

  }, [dbUser])

  useDeepLinking();

  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.parentBackgroundColor }}>
      <PaperProvider theme={paperTheme}>
        <ThemeProvider value={DefaultTheme}>
          <StatusBar barStyle="dark-content" />
          <Stack initialRouteName='(auth)' screenOptions={{ headerShown: false }}>
            <Stack.Screen name='(auth)' />
            <Stack.Screen name='(home)' />
          </Stack>
        </ThemeProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
