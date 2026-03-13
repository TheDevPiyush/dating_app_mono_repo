import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { HapticTab } from '@/components/HapticTab';
import { Colors } from '@/constants/Colors';
import { useSocket } from '@/hooks/useSocket';
import { useMessagingStore } from '@/store/messagingStore';
import { useAuth } from '@/hooks/useAuth';
import { messageAPI } from '@/APIs/messageAPIs';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Home, MessageCircle, Heart, Camera, Settings, Compass } from 'lucide-react-native';

// Wrapper component for chat icon with badge
function ChatIconWithBadge({ color, focused }: { color: string; focused: boolean }) {
  const totalUnreadCount = useMessagingStore((state) => state.totalUnreadCount);

  return (
    <View style={{ position: 'relative' }}>
      <MessageCircle
        size={26}
        color={focused ? Colors.primaryBackgroundColor : '#D1D1D6'}
        strokeWidth={focused ? 2.5 : 2}
      />
      {totalUnreadCount > 0 && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{totalUnreadCount > 99 ? '99+' : totalUnreadCount}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  const { isConnected, onInboxUpdate, onNewMessage } = useSocket();
  const { setSocketConnected, setInbox } = useMessagingStore();
  const { token } = useAuth();

  // Update socket connection status in store
  useEffect(() => {
    setSocketConnected(isConnected);
  }, [isConnected]);

  // Load inbox when socket connects
  useEffect(() => {
    if (isConnected && token) {
      loadInbox();
    }
  }, [isConnected, token]);

  // Listen for inbox updates
  useEffect(() => {
    const cleanup = onInboxUpdate(() => {
      if (token) {
        loadInbox();
      }
    });

    return cleanup;
  }, []);

  // Listen for new messages
  useEffect(() => {
    const cleanup = onNewMessage(() => {
      if (token) {
        loadInbox();
      }
    });

    return cleanup;
  }, []);

  const loadInbox = async () => {
    try {
      if (token) {
        const data = await messageAPI.getInbox(token);
        setInbox(data);
      }
    } catch (error) {
      console.error('Error loading inbox:', error);
    }
  };

  useEffect(() => {
    const { setReloadTrigger } = useMessagingStore.getState();
    setReloadTrigger(loadInbox);

    return () => {
      setReloadTrigger(null);
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primaryBackgroundColor,
        tabBarInactiveTintColor: Colors.text.tertiary,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ focused }) => (
            <Home
              size={26}
              color={focused ? Colors.primaryBackgroundColor : '#D1D1D6'}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="(chats)"
        options={{
          title: t('tabs.chats'),
          tabBarIcon: ({ color, focused }) => (
            <ChatIconWithBadge color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="(explore)"
        options={{
          title: t('tabs.explore'),
          tabBarIcon: ({ focused }) => (
            <Compass
              size={26}
              color={focused ? Colors.primaryBackgroundColor : '#D1D1D6'}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="(likes)"
        options={{
          title: t('tabs.likes'),
          tabBarIcon: ({ focused }) => (
            <Heart
              size={26}
              color={focused ? Colors.primaryBackgroundColor : '#D1D1D6'}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="(story)"
        options={{
          title: t('tabs.stories'),
          tabBarIcon: ({ focused }) => (
            <Camera
              size={26}
              color={focused ? Colors.primaryBackgroundColor : '#D1D1D6'}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="(setting)"
        options={{
          title: t('tabs.setting'),
          tabBarIcon: ({ focused }) => (
            <Settings
              size={26}
              color={focused ? Colors.primaryBackgroundColor : '#D1D1D6'}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />

    </Tabs>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    position: 'absolute',
    top: -2,
    right: -10,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
