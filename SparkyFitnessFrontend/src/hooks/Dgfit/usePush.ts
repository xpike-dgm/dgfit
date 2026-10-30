import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deletePushSubscription,
  getPushStatus,
  savePushSubscription,
  sendTestPush,
  updateNotificationSettings,
} from '@/api/Dgfit/pushApi';
import { getErrorMessage } from '@/utils/api';

export type { NotificationSettings } from '@/api/Dgfit/pushApi';

const pushKeys = { status: ['dgfit', 'push'] as const };

const urlBase64ToUint8Array = (base64: string) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export const pushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

/** iOS only delivers web push to an app added to the Home Screen. */
export const isIos = () =>
  typeof navigator !== 'undefined' &&
  /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);

export const usePushStatus = () =>
  useQuery({ queryKey: pushKeys.status, queryFn: getPushStatus });

export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateNotificationSettings,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: pushKeys.status }),
    meta: { errorMessage: (error: unknown) => getErrorMessage(error) },
  });
};

/** Asks for permission, subscribes this device and registers it. */
export const useEnablePush = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (publicKey: string) => {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error(
          'Bildirim izni verilmedi. Tarayıcı/telefon ayarlarından izin verebilirsin.'
        );
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));
      await savePushSubscription(subscription.toJSON());
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: pushKeys.status }),
    meta: {
      successMessage: 'Bildirimler bu cihazda açıldı.',
      errorMessage: (error: unknown) => getErrorMessage(error),
    },
  });
};

export const useDisablePush = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await deletePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: pushKeys.status }),
    meta: {
      successMessage: 'Bu cihazın bildirimleri kapatıldı.',
      errorMessage: (error: unknown) => getErrorMessage(error),
    },
  });
};

export const useTestPush = () =>
  useMutation({
    mutationFn: sendTestPush,
    meta: { errorMessage: (error: unknown) => getErrorMessage(error) },
  });
