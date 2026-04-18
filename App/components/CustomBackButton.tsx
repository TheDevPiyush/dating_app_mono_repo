import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity, View, Text, ViewStyle } from "react-native";

interface CustomBackButtonProps {
    skipButtonRoute?: string;
    onPress?: () => void;
    style?: ViewStyle;
    iconColor?: string;
    backgroundColor?: string;
    variant?: 'default' | 'overlay';
    topOffset?: number;
}

export default function CustomBackButton({
    skipButtonRoute,
    onPress,
    style,
    iconColor,
    backgroundColor,
    variant = 'default',
    topOffset
}: CustomBackButtonProps) {
    const router = useRouter();

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else {
            router.back();
        }
    };

    const buttonStyle = variant === 'overlay'
        ? [styles.backButtonOverlay, { top: topOffset }, style]
        : [styles.backButton, style];

    const buttonBackgroundStyle = variant === 'overlay'
        ? [
            styles.backButtonBackgroundOverlay,
            { backgroundColor: backgroundColor },
        ]
        : styles.backButtonBackground;

    const iconColorValue = iconColor || (variant === 'overlay' ? Colors.primary.white : Colors.primaryBackgroundColor);

    if (variant === 'overlay') {
        return (
            <TouchableOpacity
                onPress={handlePress}
                style={buttonStyle}
                activeOpacity={0.7}
            >
                <View style={buttonBackgroundStyle}>
                    <Ionicons name="chevron-back" size={24} color={"white"} />
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={handlePress} style={buttonStyle}>
                <View style={buttonBackgroundStyle}>
                    <Ionicons name="chevron-back" size={24} color={iconColorValue} />
                </View>
            </TouchableOpacity>

            {skipButtonRoute && (
                <TouchableOpacity onPress={() => router.push(skipButtonRoute as any)} style={styles.skipButton}>
                    <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginTop: 8,
        marginLeft: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        color:Colors.primaryBackgroundColor
    },
    backButtonBackground: {
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#f0f0f0",
        justifyContent: 'center',
        alignItems: 'center',
        color:Colors.primaryBackgroundColor
    },
    backButtonOverlay: {
        position: 'absolute',
        left: 8,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    backButtonBackgroundOverlay: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: "transparent"
    },
    skipButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 'auto',
        marginRight: 15,
    },
    skipButtonText: {
        fontSize: 16,
        color: Colors.primaryForegroundColor,
        fontWeight: '600',
    },
})