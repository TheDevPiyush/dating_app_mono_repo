import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { subscriptionAPI, SubscriptionPlan } from '@/APIs/subscriptionAPIs';
import CustomBackButton from '@/components/CustomBackButton';
import CustomDialog, { DialogType } from '@/components/CustomDialog';
import { router } from 'expo-router';

const POOKIEY_WEB_URL = process.env.EXPO_PUBLIC_POOKIEY_WEB_URL;

const formatPrice = (amountInPaise: number, currency: string) => {
  if (amountInPaise === 0) return 'Free';
  const amount = amountInPaise / 100;
  return `${currency} ${amount.toFixed(0)}`;
};

const getDurationLabel = (days: number) => {
  if (!days) return 'Lifetime';
  if (days % 30 === 0) {
    const months = days / 30;
    return months === 1 ? '1 month' : `${months} months`;
  }
  return `${days} days`;
};

export default function PricePlansScreen() {
  const { token } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>('info');
  const [dialogTitle, setDialogTitle] = useState<string>('');
  const [dialogMessage, setDialogMessage] = useState<string>('');
  const [dialogPrimaryButton, setDialogPrimaryButton] = useState<{ text: string; onPress: () => void }>({ text: 'OK', onPress: () => setDialogVisible(false) });
  const [dialogSecondaryButton, setDialogSecondaryButton] = useState<{ text: string; onPress: () => void } | undefined>(undefined);

  useEffect(() => {
    const loadPlans = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError(null);
        const data = await subscriptionAPI.getPlans(token);
        const sorted = [...data].sort((a, b) => a.amountInPaise - b.amountInPaise);
        setPlans(sorted);
      } catch (err) {
        console.error('Failed to load subscription plans', err);
        setError('Failed to load plans. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, [token]);

  // Show dialog helper function
  const showDialog = (
    type: DialogType,
    message: string,
    title?: string,
    primaryButton?: { text: string; onPress: () => void },
    secondaryButton?: { text: string; onPress: () => void }
  ) => {
    setDialogType(type);
    setDialogTitle(title || '');
    setDialogMessage(message);
    setDialogPrimaryButton(primaryButton || { text: 'OK', onPress: () => setDialogVisible(false) });
    setDialogSecondaryButton(secondaryButton);
    setDialogVisible(true);
  };

  const handleOpenWeb = () => {
    // router.push("/subscriptionScreen");
  };

  const renderPlan = ({ item }: { item: SubscriptionPlan }) => {
    const isPopular = item.id === 'premium' || item.id === 'super';
    const featureList = Array.isArray(item.features)
      ? item.features.filter(f => typeof f === 'string' && f.trim().length > 0)
      : [];
    const hasFeatures = featureList.length > 0;

    return (
      <View
        style={[
          styles.card,
          isPopular && styles.cardHighlighted,
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ThemedText type="title" style={styles.planTitle}>
              {item.title}
            </ThemedText>
            {isPopular && (
              <View style={styles.pill}>
                <ThemedText type="default" style={styles.pillText}>
                  Most popular
                </ThemedText>
              </View>
            )}
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <ThemedText type="title" style={styles.priceText}>
              {formatPrice(item.amountInPaise, item.currency)}
            </ThemedText>
            <ThemedText type="default" style={styles.priceSubText}>
              {getDurationLabel(item.durationDays)}
            </ThemedText>
          </View>
        </View>

        <ThemedText type="default" style={styles.subText}>
          {item.interaction_per_day} interactions per day
        </ThemedText>

        <View style={styles.divider} />

        {hasFeatures ? (
          <View style={styles.featuresList}>
            {featureList.map((feature, idx) => (
              <View key={idx} style={styles.featureRow}>
                <View style={styles.bullet} />
                <ThemedText type="defaultSemiBold">
                  {feature}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : (
          <ThemedText type="default" style={styles.mutedText}>
            Includes all core matching features.
          </ThemedText>
        )}
      </View>
    );
  };

  return (
    <>
      <CustomDialog
        visible={dialogVisible}
        type={dialogType}
        title={dialogTitle}
        message={dialogMessage}
        onDismiss={() => setDialogVisible(false)}
        primaryButton={dialogPrimaryButton}
        secondaryButton={dialogSecondaryButton}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <CustomBackButton />

          <View style={styles.header}>
            <ThemedText type="title" style={styles.screenTitle}>
              Limit exhausted? Upgrade to continue swiping!
            </ThemedText>
            <ThemedText type="default" style={styles.screenSubtitle}>
              Choose a plan that fits how you like to connect.
            </ThemedText>
          </View>

          {loading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator color={Colors.primaryBackgroundColor} />
            </View>
          ) : error ? (
            <View style={styles.centerContent}>
              <ThemedText type="default" style={styles.errorText}>
                {error}
              </ThemedText>
            </View>
          ) : (
            <FlatList
              data={plans.filter((plan) => plan.id !== 'free')}
              keyExtractor={(item) => item.id}
              renderItem={renderPlan}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}

          <View style={styles.bottomBar}>
            <TouchableOpacity activeOpacity={0.7} style={styles.primaryButton} onPress={handleOpenWeb}>
              <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
                Subscribe on Pookiey.com!
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.parentBackgroundColor,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 1,
    paddingBottom: 2,
  },
  screenTitle: {
    fontSize: 24,
    marginBottom: 6,
    color: Colors.titleColor,
  },
  screenSubtitle: {
    color: Colors.text.secondary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 140,
    alignItems: 'center',
  },
  card: {
    width: Dimensions.get('window').width * 0.9,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 16,
    backgroundColor: Colors.primary.white,
    borderWidth: 1,
    borderColor: Colors.text.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  cardHighlighted: {
    borderColor: Colors.primaryBackgroundColor,
    shadowColor: Colors.primaryBackgroundColor,
    shadowOpacity: 0.12,
  },
  pill: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: `${Colors.primaryBackgroundColor}15`,
  },
  pillText: {
    fontSize: 11,
    color: Colors.primaryBackgroundColor,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  planTitle: {
    fontSize: 18,
    color: Colors.titleColor,
  },
  priceText: {
    fontSize: 20,
    color: Colors.primaryBackgroundColor,
  },
  priceSubText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  subText: {
    color: Colors.text.secondary,
    marginBottom: 10,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.text.light,
    marginVertical: 8,
  },
  featuresList: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primaryBackgroundColor,
    marginRight: 8,
  },
  featureText: {
    flex: 1,
    color: Colors.textColor,
  },
  mutedText: {
    color: Colors.text.secondary,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: Colors.text.secondary,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: "transparent",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.text.light,
  },
  primaryButton: {
    height: 52,
    borderRadius: 15,
    backgroundColor: Colors.primaryBackgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: 'white',
  },
});


