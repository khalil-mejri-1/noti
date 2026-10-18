import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';

// تهيئة معالج الإشعارات أثناء فتح التطبيق (Foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * إعداد قناة الإشعارات لنظام أندرويد وطلب الأذونات والحصول على Expo Push Token
 */
export async function registerForPushNotificationsAsync() {
  let token = null;

  try {
    // إعداد قناة أندرويد المخصصة للرسائل (في التطبيق المستقل فقط لأن Expo Go لا يوفر NotificationsChannelsProvider)
    if (Platform.OS === 'android' && !isRunningInExpoGo()) {
      try {
        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Système',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#e11d48',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
      } catch (channelErr) {
        // تجاهل تحذير القناة في بيئات التطوير غير المدعومة
      }
    }

    // التحقق من أنه جهاز حقيقي (المحاكيات قد لا تدعم Push Notifications)
    if (!Device.isDevice) {
      console.warn('⚠️ Push Notifications nécessitent un appareil physique pour fonctionner.');
    }

    // فحص وطلب الأذونات من المستخدم
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('⚠️ Permission de notifications non accordée par l\'utilisateur.');
      return null;
    }

    // في Expo Go على أندرويد (SDK 53+)، لا تتوفر خدمة Push Tokens عن بعد
    // يتم تجاوز الحصول على الرمز لتجنب أي أخطاء في Expo Go
    if (isRunningInExpoGo() && Platform.OS === 'android') {
      console.log('ℹ️ Expo Go sur Android ne supporte plus les push tokens distants (SDK 53+).');
      return null;
    }

    // الحصول على EAS Project ID المؤكد والربط به
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      '5b04062e-74df-4bd7-b484-8a1ccaa901b7';

    // 1. محاولة الحصول على Expo Push Token
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || '5b04062e-74df-4bd7-b484-8a1ccaa901b7',
      });
      token = tokenData?.data;
      console.log('📲 Expo Push Token généré avec succès :', token);
    } catch (expoErr) {
      console.warn('⚠️ Erreur getExpoPushTokenAsync :', expoErr?.message);
    }

    // 2. محاولة الحصول على Device FCM Push Token الأصلي
    let fcmDeviceToken = null;
    try {
      const deviceData = await Notifications.getDevicePushTokenAsync();
      fcmDeviceToken = deviceData?.data;
      console.log('🔥 Device FCM Token généré avec succès :', fcmDeviceToken);
    } catch (fcmErr) {
      console.warn('⚠️ Erreur getDevicePushTokenAsync :', fcmErr?.message);
    }

    // إذا لم ينجح Expo Token، نعتمد FCM Token كرمز أساسي
    if (!token && fcmDeviceToken) {
      token = fcmDeviceToken;
    }

    return {
      token,
      expoToken: token && token.startsWith('ExponentPushToken') ? token : null,
      fcmToken: fcmDeviceToken || (token && !token.startsWith('ExponentPushToken') ? token : null),
    };
  } catch (error) {
    console.warn('⚠️ Impossible d\'obtenir le push token :', error.message);
  }

  return { token: null, expoToken: null, fcmToken: null };
}

/**
 * تسجيل الرمز وربطه بحساب المستخدم (أو تسجيل الجهاز حتى لو لم يسجل دخوله بعد للإشعارات العامة)
 */
export async function registerDeviceTokenWithServer(apiUrl, userId = null, tokenData) {
  if (!apiUrl) return false;

  const pushToken =
    typeof tokenData === 'string'
      ? tokenData
      : tokenData?.expoToken || tokenData?.token || tokenData?.fcmToken;
  const fcmToken =
    typeof tokenData === 'object' ? tokenData?.fcmToken : null;

  if (!pushToken && !fcmToken) return false;

  try {
    const payload = {
      pushToken: pushToken || fcmToken,
      fcmToken: fcmToken || undefined,
      platform: Platform.OS,
      deviceName: Device.deviceName || `${Device.manufacturer || ''} ${Device.modelName || ''}`.trim() || 'Android Device',
    };
    if (userId) {
      payload.userId = userId;
    }

    const res = await fetch(`${apiUrl}/api/push-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok) {
      console.log(`✅ Push Token synchronisé avec le serveur (${userId ? 'Utilisateur: ' + userId : 'Appareil invité'})`);
      return true;
    } else {
      console.warn('⚠️ Échec de l\'enregistrement du token sur le serveur :', data?.message);
      return false;
    }
  } catch (error) {
    console.warn('⚠️ Erreur réseau lors de l\'enregistrement du token :', error.message);
    return false;
  }
}

/**
 * إلغاء تسجيل الرمز عند تسجيل الخروج
 */
export async function unregisterDeviceTokenFromServer(apiUrl, userId, pushToken) {
  if (!apiUrl) return false;

  try {
    const res = await fetch(`${apiUrl}/api/push-tokens`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        pushToken,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      console.log('🗑️ Push Token retiré du serveur lors de la déconnexion.');
      return true;
    }
    return false;
  } catch (error) {
    console.warn('⚠️ Erreur réseau lors du retrait du token :', error.message);
    return false;
  }
}
