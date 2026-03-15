// Simple state manager for deep link processing without hooks
let isProcessing = false;
let pendingDeeplink: PendingDeeplink = null;
let lastHandledUrl: string | null = null;
let listeners: Array<(value: boolean) => void> = [];

export type PendingDeeplink =
  | string
  | { pathname: string; params: Record<string, string> }
  | null;

export const deepLinkState = {
  setProcessing: (value: boolean) => {
    isProcessing = value;
    listeners.forEach(listener => listener(value));
  },

  getProcessing: () => isProcessing,

  subscribe: (listener: (value: boolean) => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },

  setPendingDeeplink: (value: PendingDeeplink) => {
    pendingDeeplink = value;
  },

  getPendingDeeplink: (): PendingDeeplink => pendingDeeplink,

  clearPendingDeeplink: () => {
    pendingDeeplink = null;
  },

  // Dedup helpers
  getLastHandledUrl: () => lastHandledUrl,
  setLastHandledUrl: (url: string | null) => {
    lastHandledUrl = url;
  },
};

