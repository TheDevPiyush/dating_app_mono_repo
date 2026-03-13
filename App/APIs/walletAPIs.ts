import axios from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_API_URL;

export interface MinutePack {
    _id: string;
    packId: string;
    title: string;
    minutes: number;
    amountInPaise: number;
    currency: string;
    isActive: boolean;
    sortOrder: number;
}

export interface WalletBalance {
    balance: number;
    totalRecharged: number;
    lastRechargedAt: string | null;
}

export interface WalletTransactionItem {
    _id: string;
    type: 'recharge' | 'deduction' | 'refund';
    amount: number;
    balanceAfter: number;
    reason: string;
    createdAt: string;
}

const authHeaders = (token: string) => ({
    headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    },
});

export const walletAPI = {
    getBalance: async (token: string): Promise<WalletBalance> => {
        const res = await axios.get(`${BASE_URL}/wallet/balance`, authHeaders(token));
        return res.data?.data;
    },

    getPacks: async (token: string): Promise<MinutePack[]> => {
        const res = await axios.get(`${BASE_URL}/wallet/packs`, authHeaders(token));
        return res.data?.data ?? [];
    },

    getTransactions: async (token: string): Promise<WalletTransactionItem[]> => {
        const res = await axios.get(`${BASE_URL}/wallet/transactions`, authHeaders(token));
        return res.data?.data ?? [];
    },
};
