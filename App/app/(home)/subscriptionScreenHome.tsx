import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import { StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/config/supabaseConfig';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';

export default function SubscriptionScreenHome() {

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
        <SafeAreaView style={styles.container}>
            <WebView
                style={styles.webview}
                source={webviewSource}
                cacheEnabled={false}
            />
        </SafeAreaView>
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