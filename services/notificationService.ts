import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let pushToken: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (pushToken) return pushToken;

  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission denied');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    pushToken = tokenData.data;
    await AsyncStorage.setItem('@push_token', pushToken);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
      });
      await Notifications.setNotificationChannelAsync('calls', {
        name: 'Calls',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
        sound: 'default',
      });
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 100, 200],
        lightColor: '#3B82F6',
      });
    }

    return pushToken;
  } catch {
    return null;
  }
}

export async function scheduleCallNotification(
  callerName: string,
  callerNumber: string,
): Promise<string | undefined> {
  const enabled = await AsyncStorage.getItem('@settings_call_notifications');
  if (enabled !== null && !JSON.parse(enabled)) return undefined;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Incoming Call',
      body: `${callerName} is calling...`,
      data: { type: 'call', callerName, callerNumber },
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: 'calls' } : {}),
    },
    trigger: null,
  });
  return id;
}

export async function scheduleMessageNotification(
  senderName: string,
  message: string,
): Promise<string | undefined> {
  const enabled = await AsyncStorage.getItem('@settings_message_notifications');
  if (enabled !== null && !JSON.parse(enabled)) return undefined;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: senderName,
      body: message,
      data: { type: 'message', senderName },
      ...(Platform.OS === 'android' ? { channelId: 'messages' } : {}),
    },
    trigger: null,
  });
  return id;
}

export async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function getPushToken(): string | null {
  return pushToken;
}

export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

export function removeNotificationResponseListener(
  subscription: Notifications.EventSubscription,
): void {
  subscription.remove();
}
