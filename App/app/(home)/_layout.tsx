import { Stack } from "expo-router";
import { CallProvider } from "@/context/CallContext";
import PromoPopup from "@/components/PromoPopup";

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
                    options={{ presentation: 'modal' }} />
                <Stack.Screen name="employeeProfile"
                    options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="rechargeScreen"
                    options={{ presentation: 'modal' }} />
            </Stack>
            <PromoPopup />
        </CallProvider>
    )
}