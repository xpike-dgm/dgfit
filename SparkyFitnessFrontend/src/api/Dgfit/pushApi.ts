import { apiCall } from '@/api/api';

export interface NotificationSettings {
  workout_reminder: boolean;
  workout_reminder_time: string;
  food_reminder: boolean;
  food_reminder_time: string;
  water_reminder: boolean;
  friend_activity: boolean;
}

export interface PushStatus {
  publicKey: string;
  settings: NotificationSettings;
  devices: number;
}

export const getPushStatus = (): Promise<PushStatus> => apiCall('/dgfit/push');
export const updateNotificationSettings = (
  changes: Partial<NotificationSettings>
): Promise<NotificationSettings> =>
  apiCall('/dgfit/push/settings', { method: 'PUT', body: changes });
export const savePushSubscription = (
  subscription: PushSubscriptionJSON
): Promise<void> =>
  apiCall('/dgfit/push/subscriptions', { method: 'POST', body: subscription });
export const deletePushSubscription = (endpoint: string): Promise<void> =>
  apiCall('/dgfit/push/subscriptions', {
    method: 'DELETE',
    body: { endpoint },
  });
export const sendTestPush = (): Promise<{ delivered: number }> =>
  apiCall('/dgfit/push/test', { method: 'POST' });
