import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const {
    // State
    user,
    dbUser,
    session,
    isAuthenticated,
    isLoading,
    isInitialized,
    idToken,
    notificationTokens,

    // Actions
    setUser,
    setDBUser,
    setSession,
    login,
    logout,
    setLoading,
    initialize,
    getIdToken,
    setIdToken,
    addNotificationToken,
    removeNotificationToken,
    getNotificationTokens,
    setNotificationTokens,

    // Supabase auth methods
    signInWithPhoneOtp,
    verifyPhoneOtp,
    signOut,
  } = useAuthStore();

  return {
    // State
    user,
    dbUser,
    session,
    isAuthenticated,
    isLoading,
    isInitialized,
    idToken,
    token: idToken, // Alias for convenience
    notificationTokens,

    // Actions
    setUser,
    setDBUser,
    setSession,
    login,
    logout,
    setLoading,
    initialize,
    getIdToken,
    setIdToken,
    addNotificationToken,
    removeNotificationToken,
    getNotificationTokens,
    setNotificationTokens,

    // Supabase auth methods
    signInWithPhoneOtp,
    verifyPhoneOtp,
    signOut,
  };
}
