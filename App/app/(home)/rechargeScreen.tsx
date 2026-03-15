import { WebView } from 'react-native-webview';
import { StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/config/supabaseConfig';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useWalletStore } from '@/store/walletStore';
import { useAuth } from '@/hooks/useAuth';

export default function RechargeScreen() {
    const [userToken, setUserToken] = useState<string | null>(null);
    const { fetchBalance } = useWalletStore();
    const { token } = useAuth();

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            const t = data.session?.access_token;
            if (t) setUserToken(t);
        });
    }, []);

    const webviewSource = useMemo(() => {
        if (!userToken) return null;
        return {
            uri: `${process.env.EXPO_PUBLIC_WEB_FRONTEND_URL}/recharge/?user-token-for-payment=${userToken}`,
        };
    }, [userToken]);

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'recharge_success' && token) {
                fetchBalance(token);
            }
        } catch { }
    };

    if (!webviewSource) {
        return (
            <SafeAreaView style={[styles.container, styles.centered]}>
                <ActivityIndicator color={Colors.titleColor} />
            </SafeAreaView>
        );
    }

    return (
        <WebView
            style={styles.webview}
            source={webviewSource}
            cacheEnabled={false}
            onMessage={handleMessage}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    webview: {
        flex: 1,
    },
});
