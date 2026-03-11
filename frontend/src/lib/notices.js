import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

let nativePermissionAsked = false;
let nativeChannelReady = false;

async function ensureNativeNoticeReady() {
  if (!Capacitor.isNativePlatform()) return false;

  if (!nativePermissionAsked) {
    nativePermissionAsked = true;
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== 'granted') return false;
  }

  if (!nativeChannelReady && Capacitor.getPlatform() === 'android') {
    nativeChannelReady = true;
    await LocalNotifications.createChannel({
      id: 'linkedupro-notices',
      name: 'LinkEduPro',
      description: 'Notifications de messages et activités',
      importance: 5,
      visibility: 1
    });
  }

  return true;
}

export async function prepareNotices() {
  if (typeof window === 'undefined') return false;
  try {
    return await ensureNativeNoticeReady();
  } catch (_) {
    return false;
  }
}

export async function pushNotice({ title, body }) {
  if (typeof window === 'undefined') return;

  try {
    const nativeReady = await ensureNativeNoticeReady();
    if (nativeReady) {
      const id = Date.now() % 2147483000;
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title: String(title || 'LinkEduPro'),
            body: String(body || ''),
            channelId: 'linkedupro-notices',
            schedule: { at: new Date(Date.now() + 250) }
          }
        ]
      });
      return;
    }
  } catch (_) {
    // Fallback to web notifications when native plugin is unavailable.
  }

  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'granted') {
    // eslint-disable-next-line no-new
    new Notification(String(title || 'LinkEduPro'), { body: String(body || '') });
    return;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // eslint-disable-next-line no-new
      new Notification(String(title || 'LinkEduPro'), { body: String(body || '') });
    }
  }
}
