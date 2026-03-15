import { WebView } from 'react-native-webview';
import { StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/config/supabaseConfig';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';

export default function SubscriptionScreenSettings() {

    const [userToken, setUserToken] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            const token = data.session?.access_token;
            if (token) setUserToken(token);
        });
    }, []);

    const webviewSource = useMemo(() => {
        if (!userToken) return null;
        return {
            uri: `${process.env.EXPO_PUBLIC_WEB_FRONTEND_URL}/pay/?user-token-for-payment=${userToken}`
        };
    }, [userToken]);

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
        />
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "red"
    },
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    webview: {
        flex: 1,
    },
});