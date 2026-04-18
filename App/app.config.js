import 'dotenv/config'

export default {
  expo: {
    name: "Pookiey",
    slug: "pookieycom",
    version: "1.0.8",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "pookiey",
    userInterfaceStyle: "light",
    newArchEnabled: false,
    platforms: ["ios", "android"],
    notification: {
      icon: "./assets/images/icon.png",
      color: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.pookiey.pookiey",
      icon: "./assets/images/icon.png",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription:
          "Pookiey needs your location to show you people nearby.",
        NSLocationAlwaysUsageDescription:
          "Pookiey needs your location to show you people nearby.",
      },
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },

    android: {
      softwareKeyboardLayoutMode: "resize",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#f1969f",
      },
      edgeToEdgeEnabled: true,
      permissions: [
        "android.permission.CAMERA",
        "android.permission.READ_CONTACTS",
        "android.permission.WRITE_CONTACTS",
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
      ],
      package: "com.pookiey.pookiey",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
    },

    plugins: [
      "expo-router",
      "expo-font",
      "expo-secure-store",
      "expo-web-browser",
      [
        "expo-audio",
        {
          "microphonePermission": "Allow Pookiey to access your microphone for audio & video calls."
        }
      ],

      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],

      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Allow Pookiey to use your location to show you people nearby.",
          locationAlwaysPermission:
            "Allow Pookiey to use your location to show you people nearby.",
          locationWhenInUsePermission:
            "Allow Pookiey to use your location to show you people nearby.",
        },
      ],

      [
        "expo-contacts",
        {
          contactsPermission: "Allow Pookiey to access your contacts.",
        },
      ],

      [
        "expo-image-picker",
        {
          photosPermission:
            "Pookiey requires access to your photos to upload profile pictures.",
          cameraPermission:
            "Pookiey requires access to your camera to take profile pictures.",
        },
      ],
      [
        "expo-media-library",
        {
          photosPermission: "Allow Pookiey to access your photos.",
          savePhotosPermission: "Allow Pookiey to save photos to your gallery.",
          isAccessMediaLocationEnabled: true,
        },
      ],

      "expo-font",
      "expo-secure-store",
      "expo-web-browser",
      "expo-video",
    ],
    experiments: {
      typedRoutes: true,
    },
    updates: {
      url: "https://u.expo.dev/c18e1abf-a6cc-4ba0-bc5b-3d59cee190b9",
      fallbackToCacheTimeout: 0,
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    extra: {
      router: {},
      eas: {
        projectId: "c18e1abf-a6cc-4ba0-bc5b-3d59cee190b9",
      },
    },

    owner: "pookiey.official",
  },
}
