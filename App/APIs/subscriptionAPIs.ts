import axios from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_API_URL;

export interface SubscriptionPlan {
  id: 'free' | 'basic' | 'premium' | 'super';
  title: string;
  amountInPaise: number;
  currency: 'INR';
  durationDays: number;
  features: string[];
  interaction_per_day: number;
}

export interface SubscriptionData {
  _id: string;
  plan: string;
  status: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  razorpaySubscriptionId?: string;
}

export interface CreateSubscriptionResult {
  subscriptionId: string;
  razorpayKey: string;
  plan: SubscriptionPlan;
}

const authHeaders = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

export const subscriptionAPI = {
  getPlans: async (token: string): Promise<SubscriptionPlan[]> => {
    const res = await axios.get(`${BASE_URL}/subscriptions/plans`, authHeaders(token));
    return (res.data?.data ?? []) as SubscriptionPlan[];
  },

  getCurrentSubscription: async (token: string): Promise<SubscriptionData | null> => {
    const res = await axios.get(`${BASE_URL}/subscriptions/current`, authHeaders(token));
    return res.data?.data ?? null;
  },

  createSubscription: async (
    token: string,
    planId: string,
  ): Promise<CreateSubscriptionResult> => {
    const res = await axios.post(
      `${BASE_URL}/subscriptions/create-subscription`,
      { planId },
      authHeaders(token),
    );
    return res.data?.data;
  },

  verifySubscription: async (
    token: string,
    data: {
      razorpay_payment_id: string;
      razorpay_subscription_id: string;
      razorpay_signature: string;
    },
  ): Promise<{ subscription: SubscriptionData | null; verified: boolean }> => {
    const res = await axios.post(
      `${BASE_URL}/subscriptions/verify-subscription`,
      data,
      authHeaders(token),
    );
    return res.data?.data;
  },

  cancelSubscription: async (token: string): Promise<SubscriptionData> => {
    const res = await axios.post(
      `${BASE_URL}/subscriptions/cancel`,
      {},
      authHeaders(token),
    );
    return res.data?.data?.subscription;
  },
};
