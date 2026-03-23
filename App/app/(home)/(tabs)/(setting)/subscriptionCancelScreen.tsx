import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { useUser } from '@/hooks/useUser';
import { subscriptionAPI, SubscriptionData } from '@/APIs/subscriptionAPIs';
import { Colors } from '@/constants/Colors';
import CustomDialog, { DialogType } from '@/components/CustomDialog';
import { ThemedText } from '@/components/ThemedText';
import CustomBackButton from '@/components/CustomBackButton';

function formatDate(date: Date | string | undefined) {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString();
}

export default function SubscriptionCancelScreen() {
  const { token, setDBUser } = useAuth();
  const { getUser } = useUser();

  const [currentSub, setCurrentSub] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>('info');
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogPrimaryButton, setDialogPrimaryButton] = useState<{
    text: string;
    onPress: () => void;
  }>({ text: 'OK', onPress: () => setDialogVisible(false) });
  const [dialogCancelButton, setDialogCancelButton] = useState<
    { text: string; onPress: () => void } | undefined
  >(undefined);

  const showDialog = (
    type: DialogType,
    message: string,
    title?: string,
    primaryButton?: { text: string; onPress: () => void },
    cancelButton?: { text: string; onPress: () => void },
  ) => {
    setDialogType(type);
    setDialogTitle(title ?? '');
    setDialogMessage(message);
    setDialogPrimaryButton(primaryButton ?? { text: 'OK', onPress: () => setDialogVisible(false) });
    setDialogCancelButton(cancelButton);
    setDialogVisible(true);
  };

  const refetchProfile = useCallback(async () => {
    if (!token) return;
    try {
      const profile = await getUser(token);
      const nextDbUser = profile?.data?.user ?? profile?.data ?? profile?.user ?? profile;
      if (nextDbUser) {
        setDBUser(nextDbUser);
      }
    } catch (err) {
      console.error('Profile refetch failed after cancellation', err);
    }
  }, [getUser, setDBUser, token]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const sub = await subscriptionAPI.getCurrentSubscription(token);
      setCurrentSub(sub);
    } catch (err: any) {
      showDialog('error', err?.message ?? 'Could not load subscription info.', 'Error');
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

    showDialog(
      'warning',
      'Your subscription will remain active until the current billing period ends. Continue?',
      'Cancel Subscription',
      {
        text: 'Cancel Subscription',
        onPress: async () => {
          setDialogVisible(false);
          setCancelling(true);
          try {
            await subscriptionAPI.cancelSubscription(token);
            await refetchProfile();
            showDialog('success', 'Auto-renewal has been turned off.', 'Cancelled', {
              text: 'OK',
              onPress: () => {
                setDialogVisible(false);
                router.back();
              },
            });
            await load();
          } catch (err: any) {
            showDialog('error', err?.message ?? 'Could not cancel subscription.', 'Error');
          } finally {
            setCancelling(false);
          }
        },
      },
      { text: 'Keep', onPress: () => setDialogVisible(false) },
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
    <>
      <CustomDialog
        visible={dialogVisible}
        type={dialogType}
        title={dialogTitle}
        message={dialogMessage}
        onDismiss={() => setDialogVisible(false)}
        primaryButton={dialogPrimaryButton}
        cancelButton={dialogCancelButton}
      />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <CustomBackButton />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Ionicons name="close-circle-outline" size={24} color={Colors.primary.red} />
            <ThemedText type="title" style={styles.title}>Cancel Subscription</ThemedText>
          </View>

          <View style={styles.card}>
            {isActive ? (
              <>
                <ThemedText style={styles.label}>Plan: {planTitle?.toUpperCase()}</ThemedText>
                <ThemedText type="defaultSemiBold" style={styles.value}>
                  Active until: {endDateText}
                </ThemedText>
                {currentSub?.autoRenew === false && (
                  <ThemedText type="defaultSemiBold" style={styles.pendingText}>Your subscription will remain active until the current billing period ends.</ThemedText>
                )}
              </>
            ) : (
              <>
                <ThemedText style={styles.label}>No active subscription found</ThemedText>
                <ThemedText style={styles.value}>You can subscribe again from the subscription screen.</ThemedText>
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
              <ThemedText type="defaultSemiBold" style={styles.cancelButtonText}>
                {canCancel ? 'Cancel Subscription' : 'Cancellation Unavailable'}
              </ThemedText>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
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
  },
  title: {
    fontSize: 20,
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
    color: Colors.titleColor,
    marginTop: 6,
  },
  pendingText: {
    marginTop: 10,
    fontSize: 13,
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
  },
});

