import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";

import { Colors } from "@/constants/Colors";
import { ThemedText } from "@/components/ThemedText";
import CustomBackButton from "@/components/CustomBackButton";
import { useAuthStore } from "@/store/authStore";
import { getReferralCodeAPI } from "@/APIs/userAPIs";
import type { DBUser } from "@/types";
import { useTranslation } from "react-i18next";

const ReferScreen = () => {
  const { t } = useTranslation();
  const { idToken, dbUser, setDBUser, getIdToken } = useAuthStore();
  const typedDbUser = dbUser as DBUser | null;
  const [referralCode, setReferralCode] = useState<string | undefined>(
    typedDbUser?.referralCode
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = useMemo(() => idToken || getIdToken(), [idToken, getIdToken]);

  const fetchReferralCode = async () => {
    if (!token) {
      setError("Not authenticated");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(getReferralCodeAPI, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const code =
        response?.data?.data?.referralCode || response?.data?.referralCode;
      if (code) {
        setReferralCode(code);
        if (typedDbUser?.referralCode !== code) {
          setDBUser({ ...(typedDbUser ?? {}), referralCode: code } as DBUser);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to load referral code");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!referralCode) {
      fetchReferralCode();
    }
  }, []);

  const handleShare = async () => {
    if (!referralCode) return;
    const message = t("refer.shareMessage", { code: referralCode });
    try {
      await Share.share({ message });
    } catch { }
  };

  const renderCode = () => {
    if (loading) {
      return <ActivityIndicator size="small" color={Colors.primary.white} />;
    }
    if (referralCode) {
      return (
        <ThemedText type="title" style={styles.codeText}>
          {referralCode}
        </ThemedText>
      );
    }
    return (
      <ThemedText style={styles.codePlaceholder}>
        {error || t("refer.tapRefreshToGenerate")}
      </ThemedText>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <CustomBackButton />

        <LinearGradient
          colors={["#E94057", "#FF7A7A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroHeader}>
            <View>
              <ThemedText style={styles.heroLabel}>{t("refer.inviteAndEarn")}</ThemedText>
              <ThemedText type="title" style={styles.heroTitle}>
                {t("refer.shareYourVibe")}
              </ThemedText>
            </View>
            <View style={styles.iconBadge}>
              <Ionicons name="sparkles-outline" size={20} color="#E94057" />
            </View>
          </View>

          <View style={styles.codeContainer}>
            <View style={styles.codeLeft}>
              {renderCode()}
            </View>
            <TouchableOpacity
              style={styles.codeAction}
              activeOpacity={0.85}
              onPress={fetchReferralCode}
            >
              <Ionicons name="refresh-outline" size={18} color="#E94057" />
            </TouchableOpacity>
          </View>

          <ThemedText style={styles.heroSub}>
            {t("refer.sendCodeDescription")}
          </ThemedText>

          {error && (
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          )}

          <View style={styles.heroActions}>
            <TouchableOpacity
              style={[styles.ctaButton, styles.secondaryCta]}
              activeOpacity={0.85}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={18} color={Colors.primary.white} />
              <ThemedText style={styles.secondaryCtaText}>{t("refer.share")}</ThemedText>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.stepBadge}>
              <ThemedText style={styles.stepNumber}>1</ThemedText>
            </View>
            <View style={styles.stepCopy}>
              <ThemedText style={styles.stepTitle}>{t("refer.step1Title")}</ThemedText>
              <ThemedText style={styles.stepText}>
                {t("refer.step1Text")}
              </ThemedText>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.stepBadge}>
              <ThemedText style={styles.stepNumber}>2</ThemedText>
            </View>
            <View style={styles.stepCopy}>
              <ThemedText style={styles.stepTitle}>{t("refer.step2Title")}</ThemedText>
              <ThemedText style={styles.stepText}>
                {t("refer.step2Text")}
              </ThemedText>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.stepBadge}>
              <ThemedText style={styles.stepNumber}>3</ThemedText>
            </View>
            <View style={styles.stepCopy}>
              <ThemedText style={styles.stepTitle}>{t("refer.step3Title")}</ThemedText>
              <ThemedText style={styles.stepText}>
                We’ll keep your circle updated with new perks as they arrive.
              </ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.parentBackgroundColor,
  },
  contentContainer: {
    padding: 10,
    paddingBottom: 30,
    gap: 16,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    shadowColor: "#E94057",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 6,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLabel: {
    color: "#FFE5EC",
    letterSpacing: 0.6,
    marginBottom: 4,
    fontSize: 13,
  },
  heroTitle: {
    color: Colors.primary.white,
    fontSize: 22,
    lineHeight: 28,
  },
  iconBadge: {
    backgroundColor: Colors.primary.white,
    padding: 10,
    borderRadius: 14,
  },
  codeContainer: {
    marginTop: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  codeLeft: {
    gap: 4,
  },
  codeLabel: {
    color: "#FFE5EC",
    fontSize: 13,
  },
  codeText: {
    color: Colors.primary.white,
    letterSpacing: 4,
    fontSize: 24,
  },
  codePlaceholder: {
    color: Colors.primary.white,
    opacity: 0.85,
  },
  codeAction: {
    backgroundColor: Colors.primary.white,
    padding: 10,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  codeActionText: {
    color: "#E94057",
    fontSize: 14,
  },
  heroSub: {
    color: "#FFE5EC",
    opacity: 0.9,
    marginTop: 14,
    lineHeight: 20,
  },
  heroActions: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
  },
  ctaButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryCta: {
    backgroundColor: Colors.primary.white,
  },
  ctaText: {
    color: "#E94057",
    fontSize: 15,
  },
  secondaryCta: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  secondaryCtaText: {
    color: Colors.primary.white,
    fontSize: 15,
  },
  errorText: {
    marginTop: 10,
    color: "#FFE5EC",
  },
  infoCard: {
    backgroundColor: Colors.primary.white,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 4,
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  stepBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: Colors.parentBackgroundColor,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumber: {
    color: Colors.titleColor,
  },
  stepCopy: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    color: Colors.titleColor,
    fontSize: 16,
    fontFamily:"HellixBold"
  },
  stepText: {
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.parentBackgroundColor,
    marginVertical: 4,
  },
});

export default ReferScreen;

