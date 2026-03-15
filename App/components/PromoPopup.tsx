import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useCall } from '@/context/CallContext';
import { useWalletStore } from '@/store/walletStore';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/config/supabaseConfig';
import { Colors } from '@/constants/Colors';

const INITIAL_DELAY_MS = 4_000;
const SECOND_POPUP_DELAY_MS = 3 * 60 * 1_000;
const MIN_RECURRING_MS = 15 * 60 * 1_000;
const MAX_RECURRING_MS = 20 * 60 * 1_000;

type PromoType = 'subscription' | 'recharge';

const randomRecurringDelay = () =>
  MIN_RECURRING_MS + Math.random() * (MAX_RECURRING_MS - MIN_RECURRING_MS);

const randomPromoType = (): PromoType =>
  Math.random() < 0.5 ? 'subscription' : 'recharge';

export default function PromoPopup() {
  const insets = useSafeAreaInsets();
  const { dbUser } = useAuthStore();
  const { callStatus } = useCall();
  const { fetchBalance } = useWalletStore();
  const { token } = useAuth();

  const [visible, setVisible] = useState(false);
  const [promoType, setPromoType] = useState<PromoType>(randomPromoType);
  const [userToken, setUserToken] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissCountRef = useRef(0);
  const showPopupRef = useRef<() => void>(() => {});

  const isFreeUser = useMemo(() => {
    if (!dbUser) return false;
    const sub = dbUser.subscription;
    if (!sub || !sub.status || sub.status === 'none') return true;
    if (sub.status === 'active' && sub.plan && sub.plan !== 'free') return false;
    return true;
  }, [dbUser]);

  const isOnCall =
    callStatus.isRinging || callStatus.isConnecting || callStatus.isConnected;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const t = data.session?.access_token;
      if (t) setUserToken(t);
    });
  }, []);

  // Hide immediately if a call starts while the popup is open
  useEffect(() => {
    if (isOnCall && visible) setVisible(false);
  }, [isOnCall, visible]);

  const scheduleNext = useCallback((delayMs: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => showPopupRef.current(), delayMs);
  }, []);

  const showPopup = useCallback(() => {
    if (!isFreeUser) return;
    if (isOnCall) {
      scheduleNext(30_000);
      return;
    }
    setPromoType(randomPromoType());
    setVisible(true);
  }, [isFreeUser, isOnCall, scheduleNext]);

  showPopupRef.current = showPopup;

  useEffect(() => {
    if (!isFreeUser) return;
    scheduleNext(INITIAL_DELAY_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isFreeUser, scheduleNext]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    dismissCountRef.current += 1;
    const delay =
      dismissCountRef.current === 1
        ? SECOND_POPUP_DELAY_MS
        : randomRecurringDelay();
    scheduleNext(delay);
  }, [scheduleNext]);

  const handleRechargeMessage = useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'recharge_success' && token) {
          fetchBalance(token);
        }
      } catch {}
    },
    [token, fetchBalance],
  );

  const webviewUri = useMemo(() => {
    if (!userToken) return null;
    const base = process.env.EXPO_PUBLIC_WEB_FRONTEND_URL;
    return promoType === 'subscription'
      ? `${base}/pay/?user-token-for-payment=${userToken}`
      : `${base}/recharge/?user-token-for-payment=${userToken}`;
  }, [userToken, promoType]);

  if (!visible || !webviewUri) return null;

  return (
    <Modal
      visible
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={handleDismiss} />

        <View style={[styles.card, { marginTop: insets.top + 24, marginBottom: insets.bottom + 16 }]}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={Colors.titleColor} />
            </TouchableOpacity>
          </View>

          <WebView
            style={styles.webview}
            source={{ uri: webviewUri }}
            cacheEnabled={false}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator size="large" color={Colors.primaryBackgroundColor} />
              </View>
            )}
            onMessage={promoType === 'recharge' ? handleRechargeMessage : undefined}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '92%',
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: {
    flex: 1,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
