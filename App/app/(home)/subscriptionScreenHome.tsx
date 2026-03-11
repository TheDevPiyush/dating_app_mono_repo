import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import { StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabaseConfig';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

export default function SubscriptionScreenHome() {

    const [user_token, setUser_token] = useState("")

    const getToken = async () => {
        const { data } = await supabase.auth.getSession()
        setUser_token(data.session?.access_token as string);
    };

    useEffect(() => {
        getToken();
    }, [])

    return (
        <SafeAreaView style={styles.container}>
            <WebView
                style={styles.webview}
                source={{ uri: `https://app.thedevpiyush.com/pay/?user-token-for-payment=${user_token}` }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: Constants.statusBarHeight,
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
    webview: {
        flex: 1,
    },
});
