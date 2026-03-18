import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { subscriptionAPI, SubscriptionData } from '@/APIs/subscriptionAPIs';
import { Colors } from '@/constants/Colors';

function formatDate(date: Date | string | undefined) {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString();
}

export default function SubscriptionCancelScreen() {
  const { token } = useAuth();

  const [currentSub, setCurrentSub] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const sub = await subscriptionAPI.getCurrentSubscription(token);
      setCurrentSub(sub);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not load subscription info.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const isActive = currentSub?.status === 'active';
  const canCancel = isActive && currentSub?.autoRenew !== false;
  const planTitle = isActive ? currentSub?.plan : null;
  const endDateText = currentSub?.endDate ? formatDate(currentSub.endDate) : 'N/A';

  const handleCancel = () => {
    if (!token) return;

    Alert.alert(
      'Cancel Subscription',
      'Your subscription will remain active until the current billing period ends. Continue?',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await subscriptionAPI.cancelSubscription(token);
              Alert.alert('Cancelled', 'Auto-renewal has been turned off.');
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Could not cancel subscription.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primaryBackgroundColor} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Ionicons name="close-circle-outline" size={24} color={Colors.primary.red} />
          <Text style={styles.title}>Cancel Subscription</Text>
        </View>

        <View style={styles.card}>
          {isActive ? (
            <>
              <Text style={styles.label}>Plan: {planTitle?.toUpperCase()}</Text>
              <Text style={styles.value}>
                Active until: {endDateText}
              </Text>
              {currentSub?.autoRenew === false && (
                <Text style={styles.pendingText}>Cancellation Pending</Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.label}>No active subscription found</Text>
              <Text style={styles.value}>You can subscribe again from the subscription screen.</Text>
            </>
          )}
        </View>

        <TouchableOpacity
          style={[styles.cancelButton, !canCancel && styles.cancelButtonDisabled]}
          onPress={handleCancel}
          disabled={!canCancel || cancelling}
          activeOpacity={0.8}
        >
          {cancelling ? (
            <ActivityIndicator color={Colors.text.secondary} />
          ) : (
            <Text style={styles.cancelButtonText}>
              {canCancel ? 'Cancel Subscription' : 'Cancellation Unavailable'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.parentBackgroundColor,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.titleColor,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.text.light,
  },
  label: {
    fontSize: 15,
    color: Colors.text.secondary,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.titleColor,
    marginTop: 6,
  },
  pendingText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: '#f59e0b',
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
  },
  cancelButtonDisabled: {
    backgroundColor: '#fca5a5',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});

