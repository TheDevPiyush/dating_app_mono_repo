import { create } from 'zustand';
import { walletAPI, WalletBalance } from '../APIs/walletAPIs';

interface WalletState {
    balance: number;
    totalRecharged: number;
    isLoading: boolean;
    lastFetchedAt: number | null;
}

interface WalletActions {
    fetchBalance: (token: string) => Promise<void>;
    setBalance: (balance: number) => void;
    decrementBalance: () => void;
    reset: () => void;
}

type WalletStore = WalletState & WalletActions;

const initialState: WalletState = {
    balance: 0,
    totalRecharged: 0,
    isLoading: false,
    lastFetchedAt: null,
};

export const useWalletStore = create<WalletStore>()((set, get) => ({
    ...initialState,

    fetchBalance: async (token: string) => {
        try {
            set({ isLoading: true });
            const data: WalletBalance = await walletAPI.getBalance(token);
            set({
                balance: data.balance,
                totalRecharged: data.totalRecharged,
                isLoading: false,
                lastFetchedAt: Date.now(),
            });
        } catch (error) {
            console.error('Error fetching wallet balance:', error);
            set({ isLoading: false });
        }
    },

    setBalance: (balance: number) => set({ balance }),

    decrementBalance: () => {
        const { balance } = get();
        if (balance > 0) {
            set({ balance: balance - 1 });
        }
    },

    reset: () => set(initialState),
}));
