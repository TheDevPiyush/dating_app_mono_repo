import { Stack } from "expo-router";
import { CallProvider } from "@/context/CallContext";

export default function _layout() {
    return (
        <CallProvider>
            <Stack initialRouteName="(tabs)" screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="matchingScreen" />
                <Stack.Screen name="imageGallery" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="userProfile" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="annoucements" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="subscriptionScreenHome"
                    options={{ presentation: 'modal', headerShown: true }} />
            </Stack>
        </CallProvider>
    )
}