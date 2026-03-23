import { Stack } from "expo-router";

export default function _layout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="refer_screen" />
            <Stack.Screen name="helpCenter" />
            <Stack.Screen name="privacyPolicy" />
            <Stack.Screen name="deleteAccount" />
            <Stack.Screen
                name="subscriptionCancelScreen"
                options={{
                    presentation: 'modal',
                    title: 'Cancel Subscription',
                    headerShown: false,
                    headerBackVisible: true,
                }}
            />
            <Stack.Screen name="subscriptionScreenSettings"
                options={{
                    presentation: 'modal',
                    title: "Subscriptions",
                    headerShown: false,
                    headerBackVisible: true,

                }} />
        </Stack>
    )
}