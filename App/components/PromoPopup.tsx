import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useCall } from '@/context/CallContext';
import { Colors } from '@/constants/Colors';
import { router } from 'expo-router';

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

  const [visible, setVisible] = useState(false);
  const [promoType, setPromoType] = useState<PromoType>(randomPromoType);

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

  const handleAction = useCallback(() => {
    setVisible(false);
    dismissCountRef.current += 1;
    scheduleNext(randomRecurringDelay());

    if (promoType === 'subscription') {
      router.push('/(home)/subscriptionScreenHome');
    } else {
      router.push('/(home)/rechargeScreen');
    }
  }, [promoType, scheduleNext]);

  if (!visible) return null;

  const isSubscription = promoType === 'subscription';

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

        <View style={[styles.card, { marginTop: insets.top + 60, marginBottom: insets.bottom + 60 }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color={Colors.titleColor} />
          </TouchableOpacity>

          <View style={styles.content}>
            <Ionicons
              name={isSubscription ? 'diamond-outline' : 'wallet-outline'}
              size={48}
              color={Colors.primaryBackgroundColor}
            />
            <Text style={styles.title}>
              {isSubscription ? 'Go Premium' : 'Top Up Minutes'}
            </Text>
            <Text style={styles.subtitle}>
              {isSubscription
                ? 'Unlock unlimited swipes, voice calling and more with a Pookiey subscription.'
                : 'Running low on talk time? Grab a minutes pack and keep the conversations going.'}
            </Text>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleAction}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>
                {isSubscription ? 'View Plans' : 'Buy Minutes'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleDismiss}>
              <Text style={styles.laterText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
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
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.titleColor,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: Colors.primaryBackgroundColor,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 14,
    marginTop: 6,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  laterText: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
});
