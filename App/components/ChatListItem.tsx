import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { InboxItem } from '@/hooks/useSocket';
import { useRouter } from 'expo-router';
import { ThemedText } from './ThemedText';
import { Colors } from '@/constants/Colors';

interface ChatListItemProps {
  item: InboxItem;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({ item }) => {
  const router = useRouter();

  const formatTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return messageDate.toLocaleDateString();
  };

  const handlePress = () => {
    router.push({
      pathname: '/(home)/chatRoom',
      params: {
        matchId: item.matchId,
        userName: item.name,
        userAvatar: item.avatar || '',
        userId: item.userId,
      },
    });
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {item.avatar ? (
          <Image
            source={{ uri: item.avatar }}
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <ThemedText>
              {item.name.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
        )}
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <ThemedText style={styles.unreadThemedText}>
              {item.unreadCount > 10 ? '10+' : item.unreadCount}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <ThemedText style={styles.name} numberOfLines={1}>
            {item.name}
          </ThemedText>
          {item.lastMessage?.createdAt && (
            <ThemedText style={styles.time}>
              {formatTime(item.lastMessage.createdAt)}
            </ThemedText>
          )}
        </View>

        <View style={styles.messageRow}>
          <ThemedText
            style={[
              styles.lastMessage,
              item.unreadCount > 0 && styles.unreadMessage,
            ]}
            numberOfLines={2}
          >
            {item.lastMessage?.text || 'Start a conversation'}
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 7,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  unreadThemedText: {
    color: '#fff',
    fontSize: 13,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 14,
    color: Colors.titleColor,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 14,
    color: '#999',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 10,
    color: '#666',
    flex: 1,
  },
  unreadMessage: {
    color: '#000',
    fontSize: 13,
    fontFamily:"HellixBold"
  },
});

