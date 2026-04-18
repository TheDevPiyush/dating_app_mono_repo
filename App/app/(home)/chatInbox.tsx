import React, { useState, useCallback } from 'react'
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { ChatListItem } from '@/components/ChatListItem'
import { InboxItem } from '@/hooks/useSocket'
import { useMessagingStore } from '@/store/messagingStore'
import { useFocusEffect } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '@/constants/Colors'
import { ThemedText } from '@/components/ThemedText'
import CustomLoader from '@/components/CustomLoader'
import { useTranslation } from 'react-i18next'
import CustomBackButton from '@/components/CustomBackButton'

export default function ChatsScreen() {
  const { t } = useTranslation()
  const { inbox, isSocketConnected, triggerReload } = useMessagingStore()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useFocusEffect(
    useCallback(() => {
      const { inbox } = useMessagingStore.getState()
      if (inbox.length === 0 && isSocketConnected) {
        setLoading(false)
      } else if (inbox.length > 0) {
        setLoading(false)
      }
    }, [isSocketConnected])
  )

  const handleRefresh = async () => {
    setRefreshing(true)
    triggerReload()
    setTimeout(() => {
      setRefreshing(false)
    }, 500)
  }

  const renderItem = ({ item }: { item: InboxItem }) => (
    <ChatListItem item={item} />
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ThemedText type="title" style={styles.emptyTitle}>{t('chats.noMatchesYet')}</ThemedText>
      <ThemedText style={styles.emptyThemedText}>
        {t('chats.startSwiping')}
      </ThemedText>
    </View>
  )

  const renderHeader = () => (
    <View style={styles.header}>
      <CustomBackButton />
      <ThemedText type="title" style={styles.headerTitle}>{t('chats.messages')}</ThemedText>
    </View>
  )

  if (loading && inbox.length === 0) {
    return (
      <SafeAreaView style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.parentBackgroundColor
      }}>
        <ActivityIndicator size="large" color={Colors.primaryBackgroundColor} />
      </SafeAreaView>
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 2 : 0} style={styles.container}>
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <FlatList
          data={inbox}
          renderItem={renderItem}
          keyExtractor={(item) => item.matchId}
          contentContainerStyle={[
            styles.listContainer,
            inbox.length === 0 && styles.emptyListContainer,
          ]}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#FF3B30"
            />
          }
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.parentBackgroundColor,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: "row",
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.parentBackgroundColor,
  },
  headerTitle: {
    color: Colors.primaryBackgroundColor,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionThemedText: {
    fontSize: 13,
  },
  listContainer: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 8,
  },
  emptyListContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    marginBottom: 12,
  },
  emptyThemedText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
})
