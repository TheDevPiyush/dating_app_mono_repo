/* -------------------------------------------------------
   Generic Expo push sender — used by all notification helpers
-------------------------------------------------------- */
interface PushPayload {
  expo_tokens: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  channelId?: string;
}

export async function sendPushNotification({
  expo_tokens,
  title,
  body,
  data = {},
  sound = 'default',
  channelId = 'messages',
}: PushPayload) {
  if (!expo_tokens?.length) return;

  const messages = expo_tokens.map((token) => ({
    to: token,
    sound,
    title,
    body,
    channelId,
    data,
  }));

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.errors?.[0]?.message || 'Expo push error');
  }

  return result;
}

/* -------------------------------------------------------
   Message notification
-------------------------------------------------------- */
export async function sendMessageNotification({
  matchId,
  userName,
  userAvatar,
  otherUserId,
  expo_tokens,
  messageText,
  messageType,
}: {
  matchId: string;
  userName: string;
  userAvatar?: string;
  otherUserId: string;
  expo_tokens: string[];
  messageText?: string;
  messageType?: 'text' | 'image' | 'gif' | 'audio';
}) {
  if (!expo_tokens?.length) {
    console.warn(`⚠️ No Expo tokens provided for user ${otherUserId}`);
    return;
  }

  const bodyPreview = (() => {
    if (messageType === 'image') return `${userName} sent a photo`;
    if (messageType === 'gif') return `${userName} sent a GIF`;
    if (messageType === 'audio') return `${userName} sent a voice note`;
    const text = (messageText || '').trim();
    if (!text) return `${userName} sent a message`;
    return text.length > 140 ? `${text.slice(0, 137)}...` : text;
  })();

  return sendPushNotification({
    expo_tokens,
    title: userName,
    body: bodyPreview,
    data: {
      type: 'message',
      matchId,
      userName,
      userAvatar: userAvatar || '',
      otherUserId,
      userId: otherUserId,
      messageText: messageText || '',
      messageType: messageType || 'text',
      route: '/(home)/chatRoom',
    },
  });
}

/* -------------------------------------------------------
   Story like notification
-------------------------------------------------------- */
export async function sendStoryLikeNotification({
  likerName,
  storyOwnerId,
  expo_tokens,
}: {
  likerName: string;
  storyOwnerId: string;
  expo_tokens: string[];
}) {
  if (!expo_tokens?.length) {
    console.warn(`⚠️ No Expo tokens provided for user ${storyOwnerId}`);
    return;
  }

  return sendPushNotification({
    expo_tokens,
    title: 'Pookiey Stories',
    body: `${likerName} liked your Pookiey story. Give them a swipe! 💘`,
    data: {
      type: 'story_like',
      route: '/(home)/(tabs)/(story)',
    },
  });
}
