import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { deepLinkState } from '@/utils/deepLinkState';
import { useAuthStore } from '@/store/authStore';
import { router } from 'expo-router';

/* --------------------------------------------------------
   🔎 Helper: Parse Hash Tokens (for Supabase magic links)
-------------------------------------------------------- */
const parseHashParams = (url: string): Record<string, string> => {
  const hashMatch = url.match(/#(.+)$/);
  const hashParams: Record<string, string> = {};

  if (hashMatch) {
    const hashString = hashMatch[1];
    const pairs = hashString.split('&');
    pairs.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) {
        hashParams[key] = decodeURIComponent(value);
      }
    });
  }

  return hashParams;
};

/* --------------------------------------------------------
   🔐 Supabase - Handle Magic Link Session Tokens
-------------------------------------------------------- */
const handleMagicLinkTokens = async (hashParams: Record<string, string>): Promise<boolean> => {
  if (!hashParams.access_token || !hashParams.refresh_token) return false;

  deepLinkState.setProcessing(true);

  try {
    const { supabase } = await import('@/config/supabaseConfig');

    const { data, error } = await supabase.auth.setSession({
      access_token: hashParams.access_token,
      refresh_token: hashParams.refresh_token,
    });

    if (error) {
      deepLinkState.setProcessing(false);
      return false;
    }

    deepLinkState.setProcessing(false);
    return true;
  } catch (error) {
    deepLinkState.setProcessing(false);
    return false;
  }
};

/* --------------------------------------------------------
   👥 Referral Link Handler
-------------------------------------------------------- */
const handleReferralLink = (queryParams: Record<string, any>): boolean => {
  if (queryParams?.ref) {
    return true;
  }
  return false;
};

/* --------------------------------------------------------
   📌 MAIN HOOK — Deep Link & Notification Handling
-------------------------------------------------------- */
export const useDeepLinking = () => {
  useEffect(() => {
    // Track handled notification identifiers to avoid double-processing
    // between the listener and the cold-start check
    const handledNotificationIds = new Set<string>();

    /* ---------------------
       🔗 HANDLE ANY URL
    ---------------------- */
    const handleDeepLink = async (event: { url: string }) => {

      const last = deepLinkState.getLastHandledUrl?.();
      if (last && last === event.url) {
        return;
      }
      deepLinkState.setLastHandledUrl?.(event.url);

      // Parse URL
      const { queryParams } = Linking.parse(event.url);
      const hashParams = parseHashParams(event.url);

      const parsed = Linking.parse(event?.url);

      /* 📍 Determine Target Route */
      let targetRoute: string | null = null;

      if (queryParams?.route && typeof queryParams.route === 'string') {
        targetRoute = queryParams.route.startsWith('/')
          ? queryParams.route
          : '/' + queryParams.route;
      } else if (parsed.path) {
        targetRoute = parsed.path.startsWith('/')
          ? parsed.path
          : '/' + parsed.path;
      }

      /* 🔐 Handle Magic Link Login */
      const hasMagicLinkTokens = await handleMagicLinkTokens(hashParams);
      if (hasMagicLinkTokens && targetRoute) {
        deepLinkState.setPendingDeeplink(targetRoute);
        return;
      }

      /* 👥 Referral */
      if (handleReferralLink(queryParams || {})) return;

      /* 🚦 Normal routing with Auth Check */
      if (targetRoute) {
        const store = useAuthStore.getState();
        const isAuthenticated = store.isAuthenticated;
        const dbUser = store.dbUser;

        if (isAuthenticated && dbUser?.profile?.isOnboarded) {
          router.push(targetRoute as any);
          deepLinkState.clearPendingDeeplink();
        } else {
          deepLinkState.setPendingDeeplink(targetRoute);
        }
      }
    };

    /* --------------------------------------------------
       🔔 Build the route from notification response data
    --------------------------------------------------- */
    const extractNotificationRoute = (
      data: Record<string, unknown>,
    ): { pathname: string; params: Record<string, string> } | string | null => {
      if (data.type === 'message' && data.matchId) {
        return {
          pathname: '/(home)/(tabs)/(chats)/chatRoom',
          params: {
            matchId: (data.matchId as string),
            userName: (data.userName as string) || '',
            userAvatar: (data.userAvatar as string) || '',
            userId: (data.userId as string) || '',
          },
        };
      }

      if (data.deepLink) return data.deepLink as string;

      if (data.route) {
        const r = data.route as string;
        return r.startsWith('/') ? r : '/' + r;
      }

      return null;
    };

    /* --------------------------------------------------
       🔔 Handle notification tap (foreground/background)
       Navigates immediately since the app is mounted
    --------------------------------------------------- */
    const handleLiveNotificationResponse = (
      response: Notifications.NotificationResponse,
    ) => {
      const notifId = response.notification.request.identifier;
      if (handledNotificationIds.has(notifId)) return;
      handledNotificationIds.add(notifId);

      const data = response.notification.request.content.data;
      if (!data) return;

      const route = extractNotificationRoute(data);
      if (!route) return;

      if (typeof route === 'string') {
        handleDeepLink({ url: route.includes('://') ? route : `pookiey://app${route}` });
      } else {
        router.push(route as any);
      }
    };

    /* --------------------------------------------------
       🧊 Handle notification that launched a killed app
       Always stores as pending — the auth flow navigates
    --------------------------------------------------- */
    const handleColdStartNotification = (
      response: Notifications.NotificationResponse,
    ) => {
      const notifId = response.notification.request.identifier;
      if (handledNotificationIds.has(notifId)) return;
      handledNotificationIds.add(notifId);

      const data = response.notification.request.content.data;
      if (!data) return;

      const route = extractNotificationRoute(data);
      if (!route) return;

      deepLinkState.setPendingDeeplink(route);
    };

    /* ------------------------------------------
       📱 Listen to external app & link events
    ------------------------------------------- */
    const linkSubscription = Linking.addEventListener('url', handleDeepLink);

    /* ------------------------------------------
       🔔 Live listener for notification taps
       (works when app is in foreground/background)
    ------------------------------------------- */
    const notifSubscription = Notifications.addNotificationResponseReceivedListener(
      handleLiveNotificationResponse,
    );

    /* ------------------------------------------
       🚀 Cold start: check if app was opened
       via a URL deep link
    ------------------------------------------- */
    Linking.getInitialURL().then((url) => {
      if (url) {
        deepLinkState.setLastHandledUrl?.(url);
        handleDeepLink({ url });
      }
    });

    /* ------------------------------------------
       🧊 Cold start: check if app was launched
       by tapping a notification (killed state).
       Always deferred — auth flow handles routing.
    ------------------------------------------- */
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleColdStartNotification(response);
      }
    });

    /* ------------------------------------------
       🧹 Cleanup
    ------------------------------------------- */
    return () => {
      linkSubscription.remove();
      notifSubscription.remove();
    };
  }, []);
};
