import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Platform,
  Alert,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
  Image,
  AppState,
  RefreshControl,
  Keyboard,
  Pressable,
  Animated,
  PanResponder,
  Dimensions,
  BackHandler,
  Linking,
  StatusBar as RNStatusBar,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  SafeAreaInsetsContext,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Notifications from 'expo-notifications';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

// طبقة تخزين محلية آمنة مع دعم الذاكرة التلقائي (In-Memory Fallback)
// تضمن عمل التطبيق بنسبة 100% بدون أي أخطاء أو تحذيرات حتى في Expo Go
const _inMemoryStorage = new Map();
const SafeAsyncStorage = {
  getItem: async (key) => {
    try {
      if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
        const val = await AsyncStorage.getItem(key);
        if (val !== null && val !== undefined) return val;
      }
    } catch (e) {
      // الاعتماد على التخزين الداخلي عند غياب الموديول الأصلي
    }
    return _inMemoryStorage.get(key) || null;
  },
  setItem: async (key, val) => {
    _inMemoryStorage.set(key, String(val));
    try {
      if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
        await AsyncStorage.setItem(key, String(val));
      }
    } catch (e) {
      // تم الحفظ في الذاكرة بنجاح
    }
  },
  removeItem: async (key) => {
    _inMemoryStorage.delete(key);
    try {
      if (AsyncStorage && typeof AsyncStorage.removeItem === 'function') {
        await AsyncStorage.removeItem(key);
      }
    } catch (e) {
      // تم الحذف بنجاح
    }
  },
};
import {
  registerForPushNotificationsAsync,
  registerDeviceTokenWithServer,
  unregisterDeviceTokenFromServer,
} from './services/notificationService';

const USER_SESSION_KEY = '@app_user_session';
const DEFAULT_API_URL = 'https://antiquewhite-raccoon-491871.hostingersite.com';
const IMGBB_API_KEY = 'a48914c52d05446e36a17b348de2201f';

// خيارات الإيموجي الشائعة للتفاعل الفاخر مع الرسائل (WhatsApp / Telegram style)
const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '👏'];
const MESSAGE_REACTIONS_KEY = '@app_message_reactions';

// دالة مساعدة لمعالجة استجابات الخادم بأمان وتجنب أخطاء تحليل HTML
const safeJsonFetch = async (res) => {
  if (!res) return null;
  const contentType = res.headers?.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }
  try {
    return await res.json();
  } catch (e) {
    return null;
  }
};

// ----------------- SVG Icons ----------------- //

// أيقونة العين (إظهار/إخفاء كلمة المرور)
const EyeIcon = ({ visible, color = '#6b7280' }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    {visible ? (
      <>
        <Path
          d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle
          cx="12"
          cy="12"
          r="3.2"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ) : (
      <>
        <Path
          d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M1 1l22 22"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    )}
  </Svg>
);

// سهم الرجوع <
const ChevronLeftIcon = ({ color = '#111827' }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 18l-6-6 6-6"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// أيقونة البحث
const SearchIcon = ({ color = '#9ca3af' }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="11"
      cy="11"
      r="7"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M21 21l-4.35-4.35"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// أيقونة +
const PlusIcon = ({ color = '#ffffff' }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 5v14M5 12h14"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// أيقونة الدرع (Admin Shield Icon)
const ShieldIcon = ({ color = '#ffffff', size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// أيقونة جرس الإشعارات (Bell Icon)
const BellIcon = ({ color = '#ffffff', size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// أيقونة الميكروفون
const MicIcon = ({ color = '#6b7280' }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M19 10v2a7 7 0 0 1-14 0v-2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 19v4M8 23h8"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// أيقونة الإرسال (Paper Plane)
const SendIcon = ({ color = '#ffffff' }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 2L11 13"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M22 2L15 22L11 13L2 9L22 2Z" fill={color} />
  </Svg>
);

// أيقونة الرد على الرسالة (Reply Icon)
const ReplyIcon = ({ color = '#ffffff', size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 14L4 9l5-5"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v1.5"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// أيقونة صحين القراءة المزدوجين باللون الأزرق الملكي أو المخصص (Double Check)
const DoubleCheckIcon = ({ color = '#2563eb', size = 15 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L7 17l-5-5"
      stroke={color}
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M22 10l-7.5 7.5-2.5-2.5"
      stroke={color}
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// أيقونة صح مفردة فاخرة تبين أن الرسالة مرسلة وبانتظار المشاهدة (Single Check)
const SingleCheckIcon = ({ color = '#94a3b8', size = 14 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17l-5-5"
      stroke={color}
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// أيقونة المحادثات الاحترافية والرسمية للحالة الفارغة (Empty State Icon)
const EmptyMessagesIcon = ({ size = 68, color = '#0f1117' }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    {/* خلفية الفقاعة الثانوية المتداخلة */}
    <Path
      d="M48 31.5C48 37.85 42.63 43 36 43C34.6 43 33.26 42.77 32 42.34C30.2 43.8 27.9 44.8 25.4 45C26.9 43.6 28 41.7 28.4 39.5C25.7 37.6 24 34.7 24 31.5C24 25.15 29.37 20 36 20C42.63 20 48 25.15 48 31.5Z"
      fill="#e2e8f0"
    />
    {/* الفقاعة الرئيسية الأمامية */}
    <Path
      d="M16 28C16 20.27 22.27 14 30 14C37.73 14 44 20.27 44 28C44 35.73 37.73 42 30 42C27.96 42 26.03 41.56 24.28 40.78C21.44 42.65 17.88 43.88 14 44C16.14 41.87 17.65 39.06 18.23 35.88C16.84 33.61 16 30.91 16 28Z"
      fill={color}
    />
    {/* نقاط المحادثة الثلاث الرسمية */}
    <Circle cx="24" cy="28" r="2.2" fill="#ffffff" />
    <Circle cx="30" cy="28" r="2.2" fill="#ffffff" />
    <Circle cx="36" cy="28" r="2.2" fill="#ffffff" />
  </Svg>
);

// أيقونة صح (Check) لاكتمال المهمة
const CheckIcon = ({ color = '#ffffff', size = 14 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17L4 12"
      stroke={color}
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// أيقونة التعديل (Edit / Pencil)
const EditIcon = ({ color = '#6b7280', size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// أيقونة تشغيل الفيديو (Play Icon)
const PlayIcon = ({ color = '#ffffff', size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ marginLeft: 2 }}>
    <Path d="M8 5v14l11-7z" fill={color} />
  </Svg>
);

// أيقونة الحذف (Trash / Delete)
const TrashIcon = ({ color = '#ef4444', size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// أيقونة النسخ (Copy / Clipboard)
const CopyIcon = ({ color = '#ffffff', size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="9"
      y="9"
      width="13"
      height="13"
      rx="2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// أيقونة التقويم (Calendar) لتاريخ المهمة
const CalendarIcon = ({ color = '#9ca3af', size = 13 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// أيقونة المستخدم (Profile / User)
const UserIcon = ({ color = '#111827', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2" />
  </Svg>
);

// أيقونة الرسائل مع علامة + للذهاب لصفحة الرسائل
const ChatPlusIcon = ({ color = '#ffffff', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 8v6M9 11h6"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// أيقونة المهام (Task Checklist Icon)
const TaskIcon = ({ color = '#111827', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 11l3 3L22 4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// أيقونة تسجيل الخروج (Logout)
const LogoutIcon = ({ color = '#ef4444', size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ----------------- أيقونات ومكونات التنبيه المخصص (Custom Alert System) -----------------

const AlertTrashIcon = ({ color = '#e11d48', size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const AlertCheckIcon = ({ color = '#10b981', size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="2.2" />
    <Path
      d="M8.5 12.3l2.4 2.4 4.6-4.6"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const AlertErrorIcon = ({ color = '#ef4444', size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="2.2" />
    <Path
      d="M15 9l-6 6M9 9l6 6"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const AlertWarningIcon = ({ color = '#f59e0b', size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 9v4M12 17h.01"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const AlertInfoIcon = ({ color = '#0284c7', size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="2.2" />
    <Path
      d="M12 8.5h.01M11.5 12h1v4h1"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const AlertLogoutIcon = ({ color = '#6366f1', size = 30 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const AlertCameraIcon = ({ color = '#9333ea', size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth="2" />
  </Svg>
);

const AlertGalleryIcon = ({ color = '#2563eb', size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="2" />
    <Circle cx="8.5" cy="8.5" r="1.5" fill={color} />
    <Path
      d="M21 15l-5-5L5 21"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const AlertVideoCameraIcon = ({ color = '#0f1117', size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 7l-7 5 7 5V7z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={color}
    />
    <Rect x="1" y="5" width="15" height="14" rx="2" stroke={color} strokeWidth="2" />
  </Svg>
);

const AlertVideoGalleryIcon = ({ color = '#0284c7', size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth="2" />
    <Path d="M10 9l5 3-5 3V9z" fill={color} />
  </Svg>
);

const ChevronRightIcon = ({ color = '#94a3b8', size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 18l6-6-6-6"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// دالة التعرف التلقائي على نوع التنبيه إذا لم يُحدد يدوياً
const detectAlertType = (title = '', message = '', buttons = []) => {
  const fullText = `${title || ''} ${message || ''}`.toLowerCase();

  if (buttons?.some((b) => b?.style === 'destructive')) {
    if (
      fullText.includes('déconnexion') ||
      fullText.includes('déconnecter') ||
      fullText.includes('logout')
    ) {
      return 'logout';
    }
    return 'danger';
  }
  if ((fullText.includes('photo') || fullText.includes('média') || fullText.includes('vidéo')) && buttons?.length >= 3) {
    return 'media_picker';
  }
  if (
    fullText.includes('supprim') ||
    fullText.includes('delete') ||
    fullText.includes('refus') ||
    fullText.includes('définitiv')
  ) {
    return 'danger';
  }
  if (
    fullText.includes('succès') ||
    fullText.includes('succes') ||
    fullText.includes('réussi') ||
    fullText.includes('enregistré') ||
    fullText.includes('déclenché')
  ) {
    return 'success';
  }
  if (
    fullText.includes('erreur') ||
    fullText.includes('error') ||
    fullText.includes('échec') ||
    fullText.includes('impossible') ||
    fullText.includes('interdit')
  ) {
    return 'error';
  }
  if (
    fullText.includes('attention') ||
    fullText.includes('champ requis') ||
    fullText.includes('requis') ||
    fullText.includes('avertissement') ||
    fullText.includes('autorisation') ||
    fullText.includes('permission')
  ) {
    return 'warning';
  }
  if (
    fullText.includes('déconnexion') ||
    fullText.includes('déconnecter') ||
    fullText.includes('logout')
  ) {
    return 'logout';
  }
  return 'info';
};

// تخصيص الألوان والشارات حسب نوع التنبيه
const getAlertTheme = (type) => {
  switch (type) {
    case 'danger':
      return {
        badgeBg: '#fff1f2',
        badgeBorder: '#ffe4e6',
        badgeIcon: <AlertTrashIcon color="#e11d48" size={32} />,
        primaryBtnBg: '#e11d48',
        tagText: 'ATTENTION',
        tagBg: '#fee2e2',
        tagColor: '#be123c',
      };
    case 'success':
      return {
        badgeBg: '#f0fdf4',
        badgeBorder: '#dcfce7',
        badgeIcon: <AlertCheckIcon color="#10b981" size={32} />,
        primaryBtnBg: '#10b981',
        tagText: 'SUCCÈS',
        tagBg: '#dcfce7',
        tagColor: '#047857',
      };
    case 'error':
      return {
        badgeBg: '#fff1f2',
        badgeBorder: '#fecdd3',
        badgeIcon: <AlertErrorIcon color="#ef4444" size={32} />,
        primaryBtnBg: '#0f172a',
        tagText: 'ERREUR',
        tagBg: '#fee2e2',
        tagColor: '#b91c1c',
      };
    case 'warning':
      return {
        badgeBg: '#fffbeb',
        badgeBorder: '#fef3c7',
        badgeIcon: <AlertWarningIcon color="#f59e0b" size={32} />,
        primaryBtnBg: '#0f172a',
        tagText: 'ATTENTION',
        tagBg: '#fef3c7',
        tagColor: '#b45309',
      };
    case 'logout':
      return {
        badgeBg: '#f5f3ff',
        badgeBorder: '#ede9fe',
        badgeIcon: <AlertLogoutIcon color="#6366f1" size={30} />,
        primaryBtnBg: '#ef4444',
        tagText: 'SESSION',
        tagBg: '#ede9fe',
        tagColor: '#5b21b6',
      };
    case 'media_picker':
    case 'photo_picker':
      return {
        badgeBg: '#faf5ff',
        badgeBorder: '#f3e8ff',
        badgeIcon: <AlertCameraIcon color="#9333ea" size={28} />,
        primaryBtnBg: '#9333ea',
        tagText: 'MÉDIA',
        tagBg: '#f3e8ff',
        tagColor: '#7e22ce',
      };
    case 'info':
    default:
      return {
        badgeBg: '#f0f9ff',
        badgeBorder: '#e0f2fe',
        badgeIcon: <AlertInfoIcon color="#0284c7" size={32} />,
        primaryBtnBg: '#0f172a',
        tagText: 'INFORMATION',
        tagBg: '#e0f2fe',
        tagColor: '#0369a1',
      };
  }
};

// مكون النافذة المنبثقة الاحترافية التفاعلية
const CustomAlertModal = ({ alert, onClose }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    if (alert?.visible) {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.88);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [alert?.visible]);

  const handleDismiss = (onPressCallback) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      if (typeof onPressCallback === 'function') {
        onPressCallback();
      }
    });
  };

  if (!alert?.visible) return null;

  const type = alert.type || 'info';
  const theme = getAlertTheme(type);
  const buttons =
    alert.buttons && alert.buttons.length > 0 ? alert.buttons : [{ text: "D'accord" }];
  const isMultipleOptions = buttons.length > 2;
  const isTwoButtons = buttons.length === 2;
  const isSingleButton = buttons.length === 1;

  return (
    <Modal
      visible={Boolean(alert?.visible)}
      transparent={true}
      animationType="none"
      onRequestClose={() => handleDismiss()}
      statusBarTranslucent={true}
    >
      <Animated.View style={[styles.customAlertOverlay, { opacity: fadeAnim }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            const cancelBtn = buttons.find((b) => b.style === 'cancel');
            if (cancelBtn) {
              handleDismiss(cancelBtn.onPress);
            } else if (isSingleButton) {
              handleDismiss(buttons[0]?.onPress);
            }
          }}
        />

        <Animated.View
          style={[
            styles.customAlertContainer,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* أيقونة الشارة المميزة */}
          <View
            style={[
              styles.customAlertBadge,
              { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder },
            ]}
          >
            {theme.badgeIcon}
          </View>

          {/* شريط التصنيف الأنيق */}
          {Boolean(theme.tagText) && (
            <View style={[styles.customAlertTag, { backgroundColor: theme.tagBg }]}>
              <Text style={[styles.customAlertTagText, { color: theme.tagColor }]}>
                {theme.tagText}
              </Text>
            </View>
          )}

          {/* عنوان التنبيه */}
          {Boolean(alert.title) && (
            <Text style={styles.customAlertTitle} numberOfLines={2}>
              {alert.title}
            </Text>
          )}

          {/* نص الرسالة أو التنبيه */}
          {Boolean(alert.message) && (
            <Text style={styles.customAlertMessage}>{alert.message}</Text>
          )}

          {/* أزرار الإجراء (زرين: إلغاء وتأكيد) */}
          {isTwoButtons && (
            <View style={styles.customAlertBtnRow}>
              {buttons.map((btn, index) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive =
                  btn.style === 'destructive' || (type === 'danger' && !isCancel);

                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.75}
                    style={[
                      styles.customAlertBtn,
                      isCancel
                        ? styles.customAlertCancelBtn
                        : isDestructive
                          ? styles.customAlertDestructiveBtn
                          : [styles.customAlertPrimaryBtn, { backgroundColor: theme.primaryBtnBg }],
                    ]}
                    onPress={() => handleDismiss(btn.onPress)}
                  >
                    <Text
                      style={[
                        styles.customAlertBtnText,
                        isCancel
                          ? styles.customAlertCancelBtnText
                          : styles.customAlertActionBtnText,
                      ]}
                      numberOfLines={1}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* زر وحيد (تنبيه أو إعلام بسيط) */}
          {isSingleButton && (
            <TouchableOpacity
              activeOpacity={0.75}
              style={[
                styles.customAlertSingleBtn,
                type === 'danger'
                  ? styles.customAlertDestructiveBtn
                  : type === 'success'
                    ? styles.customAlertSuccessBtn
                    : [styles.customAlertSingleBtn, { backgroundColor: theme.primaryBtnBg }],
              ]}
              onPress={() => handleDismiss(buttons[0]?.onPress)}
            >
              <Text style={styles.customAlertSingleBtnText}>
                {buttons[0]?.text || "D'accord"}
              </Text>
            </TouchableOpacity>
          )}

          {/* خيارات متعددة (مثل اختيار مصدر الصورة: كاميرا، معرض، إلغاء) */}
          {isMultipleOptions && (
            <View style={styles.customAlertOptionList}>
              {buttons.map((btn, index) => {
                const isCancel = btn.style === 'cancel';
                if (isCancel) {
                  return (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.75}
                      style={styles.customAlertCancelFullBtn}
                      onPress={() => handleDismiss(btn.onPress)}
                    >
                      <Text style={styles.customAlertCancelBtnText}>{btn.text}</Text>
                    </TouchableOpacity>
                  );
                }

                const isCamera =
                  btn.icon === 'camera' ||
                  btn.text.toLowerCase().includes('photo') && btn.text.toLowerCase().includes('appareil');
                const isVideoCamera =
                  btn.icon === 'video_camera' ||
                  btn.text.toLowerCase().includes('enregistrer') ||
                  (btn.text.toLowerCase().includes('vidéo') && btn.text.toLowerCase().includes('caméra'));
                const isVideoGallery =
                  btn.icon === 'video_gallery' ||
                  (btn.text.toLowerCase().includes('vidéo') && btn.text.toLowerCase().includes('galerie'));

                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.75}
                    style={styles.customAlertOptionBtn}
                    onPress={() => handleDismiss(btn.onPress)}
                  >
                    <View
                      style={[
                        styles.customAlertOptionIconWrap,
                        {
                          backgroundColor: isCamera
                            ? '#f3e8ff'
                            : isVideoCamera
                              ? '#f1f5f9'
                              : isVideoGallery
                                ? '#e0f2fe'
                                : '#eff6ff',
                        },
                      ]}
                    >
                      {isCamera ? (
                        <AlertCameraIcon color="#9333ea" size={20} />
                      ) : isVideoCamera ? (
                        <AlertVideoCameraIcon color="#0f1117" size={20} />
                      ) : isVideoGallery ? (
                        <AlertVideoGalleryIcon color="#0284c7" size={20} />
                      ) : (
                        <AlertGalleryIcon color="#2563eb" size={20} />
                      )}
                    </View>
                    <Text style={styles.customAlertOptionText}>{btn.text}</Text>
                    <ChevronRightIcon color="#94a3b8" size={16} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// توليد لون جذاب ومتناسق لكل شخص بناءً على اسمه
const getAvatarColor = (name = '') => {
  const colors = [
    '#e11d48',
    '#0284c7',
    '#059669',
    '#d97706',
    '#7c3aed',
    '#db2777',
    '#4b5563',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// دالة استخراج النص المكتوب وبيانات الرد بذكاء واحترافية
const parseMessageData = (message) => {
  if (!message) return { cleanContent: '', replyTo: null };

  let cleanContent = message.content || '';
  let replyTo = message.replyTo || null;

  if (typeof cleanContent === 'string' && cleanContent.startsWith('@@REPLY:')) {
    const endIdx = cleanContent.indexOf('@@\n');
    if (endIdx !== -1) {
      try {
        const jsonStr = cleanContent.substring(8, endIdx);
        const parsedReply = JSON.parse(jsonStr);
        if (!replyTo && parsedReply) {
          replyTo = parsedReply;
        }
        cleanContent = cleanContent.substring(endIdx + 3);
      } catch (e) {
        // ignore parse error
      }
    }
  }

  return { cleanContent, replyTo };
};

const getCleanMessageText = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return rawText || '';
  if (rawText.startsWith('@@REPLY:')) {
    const endIdx = rawText.indexOf('@@\n');
    if (endIdx !== -1) {
      return rawText.substring(endIdx + 3);
    }
  }
  return rawText;
};

// دالة تقسيم واستخراج الروابط الإلكترونية في الرسائل
const parseTextWithLinks = (text) => {
  if (!text || typeof text !== 'string') return [{ text: text || '', isUrl: false }];
  const urlRegex = /((?:https?:\/\/|www\.)[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9.-]+\.(?:com|org|net|io|edu|gov|me|app|dev|ai|fr|tn|site|online|store|tech|info|co|dz|ma|xyz|tv|cc|ly|link|live|club)(?:\/[^\s]*)?)/gi;
  let lastIndex = 0;
  let match;
  const parts = [];
  const countChar = (str, char) => (str.match(new RegExp('\\' + char, 'g')) || []).length;
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.substring(lastIndex, match.index), isUrl: false });
    }
    let matchedUrl = match[0];
    let trailingPunct = '';
    while (matchedUrl.length > 0) {
      const lastChar = matchedUrl.slice(-1);
      if (lastChar === ')') {
        if (countChar(matchedUrl, '(') < countChar(matchedUrl, ')')) {
          trailingPunct = lastChar + trailingPunct;
          matchedUrl = matchedUrl.slice(0, -1);
          continue;
        }
        break;
      }
      if (lastChar === ']') {
        if (countChar(matchedUrl, '[') < countChar(matchedUrl, ']')) {
          trailingPunct = lastChar + trailingPunct;
          matchedUrl = matchedUrl.slice(0, -1);
          continue;
        }
        break;
      }
      if (/[.,!?:;"'،؟»«>]/.test(lastChar)) {
        trailingPunct = lastChar + trailingPunct;
        matchedUrl = matchedUrl.slice(0, -1);
        continue;
      }
      break;
    }
    if (matchedUrl.length > 0) {
      parts.push({ text: matchedUrl, isUrl: true });
    }
    if (trailingPunct) {
      parts.push({ text: trailingPunct, isUrl: false });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), isUrl: false });
  }
  return parts.length > 0 ? parts : [{ text: text, isUrl: false }];
};

// مكوّن عرض نص الرسالة مع تمييز الروابط وجعلها قابلة للفتح المباشر
const MessageContentWithLinks = ({
  content,
  baseStyle,
  linkStyle,
  onPressUrl,
}) => {
  if (!content) return null;
  const parts = parseTextWithLinks(content);
  return (
    <Text style={baseStyle}>
      {parts.map((part, index) => {
        if (part.isUrl) {
          return (
            <Text
              key={`link_${index}`}
              style={linkStyle}
              onPress={() => onPressUrl && onPressUrl(part.text)}
              suppressHighlighting={false}
            >
              {part.text}
            </Text>
          );
        }
        return <Text key={`txt_${index}`}>{part.text}</Text>;
      })}
    </Text>
  );
};

const formatConversationPreview = (item, currentUserId = null) => {
  if (!item) return '';

  const myId = currentUserId ? String(currentUserId) : '';
  const senderId = item.lastMessageSenderId ? String(item.lastMessageSenderId) : '';
  const isMe = Boolean(
    item.isLastMessageMine === true ||
    (myId && senderId && myId === senderId)
  );

  let text = '';
  const clean = getCleanMessageText(item.lastMessage);
  if (clean && typeof clean === 'string' && clean.trim().length > 0) {
    text = clean.trim();
  } else if (item.lastMessageVideo) {
    text = '🎥 Vidéo';
  } else if (item.lastMessageImage) {
    text = '📷 Photo';
  } else if (item.lastMessage && typeof item.lastMessage === 'string') {
    if (item.lastMessage.includes('Vidéo') || item.lastMessage.includes('فيديو')) {
      text = '🎥 Vidéo';
    } else if (item.lastMessage.includes('Photo') || item.lastMessage.includes('صورة')) {
      text = '📷 Photo';
    } else {
      text = item.lastMessage.trim();
    }
  }

  if (!text) {
    text = 'Message';
  }

  if (isMe) {
    if (text.startsWith('Vous : ')) {
      return text;
    }
    return `Vous : ${text}`;
  }

  return text;
};

// دالة تنظيف التكرارات وضمان فرادة المعرفات من الجذور
const deduplicateById = (arr) => {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const result = [];
  for (const item of arr) {
    if (!item) continue;
    const id = item._id || item.id;
    if (id) {
      const idStr = String(id);
      if (!seen.has(idStr)) {
        seen.add(idStr);
        result.push(item);
      }
    } else {
      result.push(item);
    }
  }
  return result;
};

// مكون عرض الصورة داخل الفقاعة مع التخزين المؤقت والتحميل الفائق السرعة
const ChatImage = ({ uri, onPress, onLongPress, hasText }) => {
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    if (uri && typeof uri === 'string') {
      Image.prefetch(uri).catch(() => { });
    }
  }, [uri]);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={200}
      style={[
        styles.bubbleImageWrap,
        hasText && styles.bubbleImageWrapWithMargin,
      ]}
    >
      <Image
        source={{ uri }}
        style={styles.bubbleImage}
        resizeMode="cover"
        onLoadStart={() => setImageLoading(true)}
        onLoadEnd={() => setImageLoading(false)}
      />
      {imageLoading && (
        <View style={styles.imageInlineLoadingOverlay}>
          <ActivityIndicator size="small" color="#ffffff" />
        </View>
      )}
    </TouchableOpacity>
  );
};

// مكون تشغيل وعرض الفيديو داخل فقاعة المحادثة بتصميم احترافي وانسيابي
const ChatVideo = ({ uri, hasText }) => {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });

  return (
    <View
      style={[
        styles.bubbleVideoWrap,
        hasText && styles.bubbleImageWrapWithMargin,
      ]}
    >
      <VideoView
        style={styles.bubbleVideo}
        player={player}
        allowsFullscreen={true}
        allowsPictureInPicture={false}
        nativeControls={true}
        contentFit="cover"
      />
    </View>
  );
};

// مكون سحب الرسالة لليمين للرد مع حركة انسيابية ورقصة اهتزاز احترافية عند استدعاء الرسالة
const SwipeableMessageRow = ({
  children,
  onSwipeReply,
  disabled = false,
  isHighlighted = false,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const wiggleAnim = useRef(new Animated.Value(0)).current;
  const isTriggered = useRef(false);

  // رقصة الاهتزاز الخفيفة مثل رنة الهاتف لمدة قصيرة جداً بتصميم احترافي
  useEffect(() => {
    if (isHighlighted) {
      wiggleAnim.setValue(0);
      Animated.sequence([
        Animated.timing(wiggleAnim, { toValue: -6, duration: 42, useNativeDriver: true }),
        Animated.timing(wiggleAnim, { toValue: 6, duration: 42, useNativeDriver: true }),
        Animated.timing(wiggleAnim, { toValue: -5, duration: 42, useNativeDriver: true }),
        Animated.timing(wiggleAnim, { toValue: 5, duration: 42, useNativeDriver: true }),
        Animated.timing(wiggleAnim, { toValue: -3, duration: 38, useNativeDriver: true }),
        Animated.timing(wiggleAnim, { toValue: 3, duration: 38, useNativeDriver: true }),
        Animated.timing(wiggleAnim, { toValue: -1.5, duration: 35, useNativeDriver: true }),
        Animated.timing(wiggleAnim, { toValue: 1.5, duration: 35, useNativeDriver: true }),
        Animated.timing(wiggleAnim, { toValue: 0, duration: 30, useNativeDriver: true }),
      ]).start();
    }
  }, [isHighlighted]);

  // مسافة السحب المطلوبة لتفعيل الرد
  const SWIPE_THRESHOLD = 52;
  const MAX_TRANSLATE = 84;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (disabled) return false;
        // تفعيل السحب فقط عند التحرك أفقياً لليمين بشكل واضح وبأكثر من الحركة الرأسية
        return (
          gestureState.dx > 18 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.4
        );
      },
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        if (disabled) return false;
        // التقاط السحب الأفقي حتى ولو كانت لوحة المفاتيح مفتوحة
        return (
          gestureState.dx > 18 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.4
        );
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (evt, gestureState) => {
        if (disabled) return;
        if (gestureState.dx > 0) {
          // حركة انسيابية مرنة مع مقاومة فيزيائية
          const drag = Math.min(
            MAX_TRANSLATE,
            gestureState.dx <= SWIPE_THRESHOLD
              ? gestureState.dx
              : SWIPE_THRESHOLD + (gestureState.dx - SWIPE_THRESHOLD) * 0.35
          );
          translateX.setValue(drag);

          if (gestureState.dx >= SWIPE_THRESHOLD && !isTriggered.current) {
            isTriggered.current = true;
          } else if (gestureState.dx < SWIPE_THRESHOLD && isTriggered.current) {
            isTriggered.current = false;
          }
        } else {
          translateX.setValue(0);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (disabled) return;
        const triggered = gestureState.dx >= SWIPE_THRESHOLD;
        isTriggered.current = false;

        // رجوع سلس ومرن لمكان الرسالة الأصلي
        Animated.spring(translateX, {
          toValue: 0,
          tension: 110,
          friction: 9,
          useNativeDriver: true,
        }).start();

        if (triggered && onSwipeReply) {
          onSwipeReply();
        }
      },
      onPanResponderTerminate: () => {
        isTriggered.current = false;
        Animated.spring(translateX, {
          toValue: 0,
          tension: 110,
          friction: 9,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // تحريك أيقونة الرد لليسار مع السحب وظهورها بتكبير وتلاشي انسيابي
  const iconTranslateX = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD, MAX_TRANSLATE],
    outputRange: [-24, 12, 22],
    extrapolate: 'clamp',
  });

  const iconScale = translateX.interpolate({
    inputRange: [0, 15, SWIPE_THRESHOLD, MAX_TRANSLATE],
    outputRange: [0.4, 0.7, 1.15, 1.05],
    extrapolate: 'clamp',
  });

  const iconOpacity = translateX.interpolate({
    inputRange: [0, 12, SWIPE_THRESHOLD],
    outputRange: [0, 0.6, 1],
    extrapolate: 'clamp',
  });

  // دمج حركة السحب مع رقصة الاهتزاز والدوران الخفيف
  const combinedTranslateX = Animated.add(translateX, wiggleAnim);
  const rotate = wiggleAnim.interpolate({
    inputRange: [-6, 6],
    outputRange: ['-2.2deg', '2.2deg'],
  });

  return (
    <View
      style={[
        styles.swipeableMessageContainer,
        isHighlighted && styles.messageRowHighlighted,
      ]}
    >
      {/* أيقونة الرد الخلفية الأنيقة */}
      <Animated.View
        style={[
          styles.swipeReplyBadge,
          {
            transform: [
              { translateX: iconTranslateX },
              { scale: iconScale },
            ],
            opacity: iconOpacity,
          },
        ]}
        pointerEvents="none"
      >
        <ReplyIcon size={16} color="#5046e5" />
      </Animated.View>

      {/* محتوى الرسالة القابل للسحب والرقص باحترافية */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          transform: [{ translateX: combinedTranslateX }, { rotate }],
          width: '100%',
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
};

// دالة التحقق الذكي لاكتشاف وجود أزرار النظام السفلية للهاتف (3-Button Navigation Bar)
const detectHasBottomSystemButtons = () => {
  if (Platform.OS === 'web') return false;

  const insetsBottom = initialWindowMetrics?.insets?.bottom || 0;

  if (Platform.OS === 'android') {
    const screenHeight = Dimensions.get('screen').height;
    const windowHeight = Dimensions.get('window').height;
    const statusBarHeight = RNStatusBar.currentHeight || 0;

    const rawDiff = screenHeight - windowHeight;
    const netNavHeight = rawDiff - statusBarHeight;

    // شريط أزرار التنقل البرمجية (Back, Home, Recent) في أندرويد يأخذ عادة مساحة 40 إلى 56 بكسل
    return rawDiff >= 42 || netNavHeight >= 24 || insetsBottom >= 36;
  }

  if (Platform.OS === 'ios') {
    return insetsBottom > 24;
  }

  return false;
};

export default function App() {
  // حالة اكتشاف وجود أزرار النظام السفلية للهاتف
  const [hasBottomSystemButtons, setHasBottomSystemButtons] = useState(() =>
    detectHasBottomSystemButtons()
  );

  useEffect(() => {
    const handleDimensionChange = () => {
      setHasBottomSystemButtons(detectHasBottomSystemButtons());
    };

    const sub = Dimensions.addEventListener('change', handleDimensionChange);
    return () => sub?.remove();
  }, []);

  // الخادم والمستخدم الحالي
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [currentUser, setCurrentUser] = useState(null);
  const isAdmin = currentUser?.email?.toLowerCase() === 'admin@admin.com';

  // حالة لوحة تحكم الأدمن (Gestion des comptes)
  const [isAdminModalVisible, setIsAdminModalVisible] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [loadingAdminUsers, setLoadingAdminUsers] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [deletingMessagesUserId, setDeletingMessagesUserId] = useState(null);
  const [sendingTestNotification, setSendingTestNotification] = useState(false);

  // شاشة البداية الترحيبية (Splash Screen) عند فتح التطبيق
  const [isAppStarting, setIsAppStarting] = useState(true);

  // نافذة التنبيه الاحترافية المخصصة (Custom Alert Modal)
  const [appAlert, setAppAlert] = useState(null);

  const closeAlert = (callback) => {
    setAppAlert((prev) => (prev ? { ...prev, visible: false } : null));
    if (typeof callback === 'function') {
      setTimeout(callback, 150);
    }
  };

  const showAlert = (title, message, buttons, options = {}) => {
    const computedType = options.type || detectAlertType(title, message, buttons);
    const resolvedButtons =
      buttons && buttons.length > 0 ? buttons : [{ text: "D'accord" }];

    setAppAlert({
      visible: true,
      title,
      message,
      buttons: resolvedButtons,
      type: computedType,
      ...options,
    });
  };

  useEffect(() => {
    Alert.alert = (title, message, buttons, options) => {
      showAlert(title, message, buttons, options);
    };
  }, []);

  // التحقق المباشر من قاعدة البيانات MongoDB عند فتح التطبيق والتأكد من وجود وصحة الحساب
  useEffect(() => {
    let isMounted = true;
    const restoreSavedSession = async () => {
      try {
        const savedSessionJson = await SafeAsyncStorage.getItem(USER_SESSION_KEY);
        if (savedSessionJson) {
          const savedUser = JSON.parse(savedSessionJson);
          const userId = savedUser?.id || savedUser?._id;
          if (userId) {
            // التحقق المباشر من MongoDB في قاعدة البيانات لضمان عدم الاعتماد على الكاش
            try {
              const verifyRes = await fetch(`${apiUrl}/api/users/validate/${userId}`, {
                headers: {
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache',
                },
              });
              const verifyData = await safeJsonFetch(verifyRes);
              if (verifyRes.ok && verifyData?.valid && verifyData?.user) {
                if (isMounted) {
                  setCurrentUser({
                    ...verifyData.user,
                    id: verifyData.user.id || verifyData.user._id,
                  });
                  setActiveScreen('tasks');
                }
                return;
              }
            } catch (networkErr) {
              // عند تعذر الاتصال بالخادم، لا نسجل الدخول تلقائياً من الكاش
            }

            // إذا لم يتم العثور على الحساب في قاعدة البيانات، إلغاء الكاش فوراً
            await SafeAsyncStorage.removeItem(USER_SESSION_KEY);
            if (isMounted) {
              setCurrentUser(null);
            }
          }
        }
      } catch (err) {
        // تم تجاوز الخطأ بأمان
      } finally {
        if (isMounted) {
          setIsAppStarting(false);
        }
      }
    };

    restoreSavedSession();
    return () => {
      isMounted = false;
    };
  }, [apiUrl]);

  // حالة المصادقة (تسجيل دخول / إنشاء حساب)
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isAuthKeyboardVisible, setIsAuthKeyboardVisible] = useState(false);
  const authScrollRef = useRef(null);
  const lastNameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const submittingAuthRef = useRef(false);
  const chatInputRef = useRef(null);
  const isChatKeyboardOpenRef = useRef(false);

  // تتبع فتح وإغلاق لوحة المفاتيح بدقة لمعرفة حالتها الحالية دون التسبب في إغلاق غير مقصود
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsAuthKeyboardVisible(true);
      isChatKeyboardOpenRef.current = true;
      if (activeChatUserRef.current && chatFlatListRef.current) {
        setTimeout(() => {
          try {
            chatFlatListRef.current?.scrollToEnd({ animated: true });
          } catch (e) { }
        }, 120);
      }
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsAuthKeyboardVisible(false);
      isChatKeyboardOpenRef.current = false;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // حالة الصفحة الرئيسية
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // حالة المحادثة
  const [activeChatUser, setActiveChatUser] = useState(null);
  const activeChatUserRef = useRef(null);
  const hasDoneInitialChatScrollRef = useRef(false);
  const isScrollingChatRef = useRef(false);
  useEffect(() => {
    activeChatUserRef.current = activeChatUser;
    hasDoneInitialChatScrollRef.current = false;
    isScrollingChatRef.current = false;
  }, [activeChatUser]);

  const [messages, setMessages] = useState([]);
  const [refreshingConversations, setRefreshingConversations] = useState(false);
  const [refreshingMessages, setRefreshingMessages] = useState(false);

  // حالة الإشعارات الفورية
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [deviceTokens, setDeviceTokens] = useState(null);
  const notificationListener = useRef(null);
  const responseListener = useRef(null);
  const pendingNotificationChatRef = useRef(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMsgText, setNewMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingImageUri, setUploadingImageUri] = useState(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingVideoUri, setUploadingVideoUri] = useState(null);
  const [uploadingCaption, setUploadingCaption] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  // الرسائل التي يتم إظهار وقتها عند النقر عليها فقط
  const [visibleTimeMessageIds, setVisibleTimeMessageIds] = useState(new Set());
  // الرسالة التي يتم الرد عليها حالياً عبر السحب
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  // الرسالة المحددة للرقص والاهتزاز عند النقر على اقتباس الرد
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);

  // ميزة التفاعل بالإيموجي عند النقر لمدة 200 ملي ثانية (WhatsApp / Telegram style)
  const [messageReactions, setMessageReactions] = useState({});
  const [reactionTargetMessage, setReactionTargetMessage] = useState(null);
  const [reactionPosition, setReactionPosition] = useState({ top: 200, isMe: true });
  const reactionAnim = useRef(new Animated.Value(0)).current;
  const longPressGestureActiveRef = useRef(false);
  const longPressReleasedAtRef = useRef(0);
  const overlayMountedAtRef = useRef(0);
  const lastMessageTappedAtRef = useRef(0);
  const justTriggeredLongPressRef = useRef(false);

  // تحميل التفاعلات المحفوظة مسبقاً من الذاكرة المحلية للجهاز
  useEffect(() => {
    (async () => {
      try {
        const stored = await SafeAsyncStorage.getItem(MESSAGE_REACTIONS_KEY);
        if (stored) {
          setMessageReactions(JSON.parse(stored));
        }
      } catch (err) { }
    })();
  }, []);

  // تسريع فتح وعرض الصور مسبقاً في الخلفية لضمان سرعة فائقة 0ms عند تصفح الرسائل أو فتحها بحجم كامل
  useEffect(() => {
    if (messages && messages.length > 0) {
      messages.forEach((msg) => {
        if (msg.imageUrl && typeof msg.imageUrl === 'string') {
          Image.prefetch(msg.imageUrl).catch(() => { });
        }
      });
    }
  }, [messages]);

  // مرجع لتسجيل وقت النقر على رابط لمنع أي تداخل مع النقر على الفقاعة
  const lastLinkPressTimeRef = useRef(0);

  // فتح الروابط الإلكترونية مباشرة عند النقر عليها
  const handleOpenUrl = async (rawUrl) => {
    if (!rawUrl) return;
    lastLinkPressTimeRef.current = Date.now();
    if (selectedMessageIds.length > 0) {
      setSelectedMessageIds([]);
      return;
    }
    if (reactionTargetMessage) {
      return;
    }
    let url = String(rawUrl).trim();
    if (url.includes('@') && !url.startsWith('http')) {
      url = `mailto:${url}`;
    } else if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert('Lien', 'Impossible d’ouvrir ce lien : ' + url);
    }
  };

  // تبديل إظهار وإخفاء وقت الرسالة عند النقر عليها
  const toggleMessageTime = (messageId) => {
    if (!messageId) return;
    Keyboard.dismiss(); // إغلاق لوحة المفاتيح بسلاسة مع إظهار الوقت في نفس اللحظة
    try {
      chatInputRef.current?.blur();
    } catch (e) { }
    setVisibleTimeMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  // بدء الرد على رسالة عند سحبها لليمين مع الحفاظ على ثبات لوحة المفاتيح تماماً
  const handleInitiateReply = (message) => {
    if (!message) return;
    setReplyingToMessage(message);

    // 1. إذا كانت لوحة المفاتيح مفتوحة بالفعل: نحافظ عليها مفتوحة تماماً دون أي وميض أو اختفاء!
    if (isChatKeyboardOpenRef.current) {
      chatInputRef.current?.focus();
      return;
    }

    // 2. إذا كانت لوحة المفاتيح مغلقة: نفتحها بسلاسة وموثوقية تامة
    if (chatInputRef.current?.isFocused?.()) {
      chatInputRef.current.blur();
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 40);
    } else {
      chatInputRef.current?.focus();
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 80);
    }
  };

  // معالجة النقر المطول على الرسالة (200 ملي ثانية) لوضع إيموجي باحترافية بالغة
  const handleLongPressMessage = (message, event) => {
    try {
      if (!message) return;
      const now = Date.now();
      overlayMountedAtRef.current = now;
      longPressGestureActiveRef.current = true;
      longPressReleasedAtRef.current = 0;
      justTriggeredLongPressRef.current = true;
      shouldAutoScrollRef.current = false; // إيقاف التمرير التلقائي للأسفل فوراً

      // إذا كان المستخدم في وضع تحديد الرسائل المتعددة بالفعل (أكثر من رسالة واحدة)، يستمر في التحديد
      if (selectedMessageIds.length > 1) {
        const msgId = typeof message === 'object' ? (message._id || message.id) : message;
        handleToggleSelectMessage(msgId);
        return;
      }

      // إخفاء لوحة المفاتيح بلطف حتى تظهر قائمة الإيموجي بوضوح وجمال
      Keyboard.dismiss();
      try {
        chatInputRef.current?.blur();
      } catch (e) { }

      const targetMsg =
        typeof message === 'object'
          ? message
          : messages.find((m) => m._id === message);

      if (targetMsg) {
        const targetIdStr = String(targetMsg._id || targetMsg.id);
        // تحديد الرسالة المنقور عليها مطولاً مباشرة
        setSelectedMessageIds([targetIdStr]);

        // حساب موضع نافذة الإيموجي لتظهر مباشرة فوق الرسالة بدقة متناهية
        const screenHeight = Dimensions.get('window').height;
        let targetTop = Math.round(screenHeight * 0.35);
        const currentUserId = currentUser ? String(currentUser.id || currentUser._id || '') : '';
        const senderId =
          typeof targetMsg.sender === 'object' && targetMsg.sender !== null
            ? String(targetMsg.sender._id || targetMsg.sender.id || '')
            : String(targetMsg.sender || '');
        const isMe = Boolean(currentUserId && senderId && currentUserId === senderId);

        let pageY = null;
        let locationY = 24;

        if (event && event.nativeEvent) {
          if (
            typeof event.nativeEvent.pageY === 'number' &&
            !isNaN(event.nativeEvent.pageY) &&
            event.nativeEvent.pageY > 0
          ) {
            pageY = event.nativeEvent.pageY;
            if (
              typeof event.nativeEvent.locationY === 'number' &&
              !isNaN(event.nativeEvent.locationY)
            ) {
              locationY = event.nativeEvent.locationY;
            }
          } else if (
            Array.isArray(event.nativeEvent.touches) &&
            event.nativeEvent.touches.length > 0
          ) {
            const touch = event.nativeEvent.touches[0];
            if (typeof touch.pageY === 'number' && !isNaN(touch.pageY) && touch.pageY > 0) {
              pageY = touch.pageY;
              if (typeof touch.locationY === 'number' && !isNaN(touch.locationY)) {
                locationY = touch.locationY;
              }
            }
          } else if (
            Array.isArray(event.nativeEvent.changedTouches) &&
            event.nativeEvent.changedTouches.length > 0
          ) {
            const touch = event.nativeEvent.changedTouches[0];
            if (typeof touch.pageY === 'number' && !isNaN(touch.pageY) && touch.pageY > 0) {
              pageY = touch.pageY;
              if (typeof touch.locationY === 'number' && !isNaN(touch.locationY)) {
                locationY = touch.locationY;
              }
            }
          }
        }

        if (pageY !== null) {
          const msgTop = pageY - locationY;
          if (msgTop > 180) {
            targetTop = msgTop - 56;
          } else {
            targetTop = Math.max(120, pageY + 48);
          }
          targetTop = Math.min(targetTop, screenHeight - 175);
          targetTop = Math.max(120, targetTop);
        }
        targetTop = Math.round(targetTop);
        setReactionPosition({ top: targetTop, isMe });

        setReactionTargetMessage(targetMsg);
        reactionAnim.setValue(0);
        Animated.spring(reactionAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }).start();

        // الحفاظ على ثبات الرسائل وموضع الشاشة دون أي تمرير مفاجئ
        shouldAutoScrollRef.current = false;
      }
    } catch (err) {
      console.log('Error in handleLongPressMessage:', err);
    }
  };

  // إغلاق نافذة التفاعل والإيموجي بحركة انسيابية سريعة وثبات فائق يمنع اختفاءها عند رفع الإصبع
  const handleCloseReactionOverlay = (force = false) => {
    const isExplicitAction = force === true;
    if (!isExplicitAction) {
      // 1. منع الإغلاق إذا كان الإصبع لا يزال موضوعاً على الشاشة
      if (longPressGestureActiveRef.current) {
        return;
      }
      // 2. منع الإغلاق العرضي الناتج عن رفع الإصبع بعد النقر المطول (مهلة أمان 450ms)
      if (Date.now() - longPressReleasedAtRef.current < 450) {
        return;
      }
      // 3. أمان إضافي منذ لحظة فتح القائمة (500ms)
      if (Date.now() - overlayMountedAtRef.current < 500) {
        return;
      }
    }
    Animated.timing(reactionAnim, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      setReactionTargetMessage(null);
      setSelectedMessageIds([]);
      longPressGestureActiveRef.current = false;
    });
  };

  // وضع أو إزالة الإيموجي على الرسالة وحفظه محلياً في ذاكرة الهاتف
  const handleSelectReaction = async (messageId, emoji) => {
    if (!messageId || !emoji) return;
    const msgIdStr = String(messageId);
    const updated = { ...messageReactions };
    if (updated[msgIdStr] === emoji) {
      delete updated[msgIdStr]; // إلغاء التفاعل عند الضغط على نفس الإيموجي مرة ثانية
    } else {
      updated[msgIdStr] = emoji; // تطبيق الإيموجي المختار
    }
    setMessageReactions(updated);
    handleCloseReactionOverlay(true);
    setSelectedMessageIds([]); // إلغاء التحديد فور تطبيق التفاعل
    try {
      await SafeAsyncStorage.setItem(MESSAGE_REACTIONS_KEY, JSON.stringify(updated));
    } catch (err) { }
  };

  // حذف رسالة مفردة فورياً وبسلاسة من قائمة الخيارات السريعة
  const handleDeleteSingleMessageDirect = async (messageId) => {
    if (!messageId) return;
    const targetIdStr = String(messageId);

    // 1. حذف متفائل فوري من الشاشة دون انتظار استجابة الخادم
    setMessages((prev) => prev.filter((m) => String(m._id || m.id) !== targetIdStr));
    setSelectedMessageIds([]);

    // تنظيف أي تفاعل مرتبط بالرسالة محلياً
    setMessageReactions((prev) => {
      if (prev && prev[targetIdStr]) {
        const copy = { ...prev };
        delete copy[targetIdStr];
        SafeAsyncStorage.setItem(MESSAGE_REACTIONS_KEY, JSON.stringify(copy)).catch(() => { });
        return copy;
      }
      return prev;
    });

    // 2. إرسال أمر الحذف للخادم في الخلفية
    try {
      const res = await fetch(`${apiUrl}/api/messages/batch`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: [targetIdStr] }),
      });
      if (res.ok) {
        fetchConversations();
      }
    } catch (err) { }
  };

  // معالجة النقر العادي أثناء وضع التحديد
  const handleToggleSelectMessage = (messageId) => {
    if (!messageId) return;
    shouldAutoScrollRef.current = false; // إيقاف التمرير التلقائي للأسفل فوراً عند التحديد
    const strId = String(messageId);

    // إذا كان النقر على نفس الرسالة المنقور عليها مطولاً للتو، نتجاهل نقرة رفع الإصبع
    if (
      reactionTargetMessage &&
      String(reactionTargetMessage._id || reactionTargetMessage.id) === strId &&
      (justTriggeredLongPressRef.current || Date.now() - overlayMountedAtRef.current < 450)
    ) {
      justTriggeredLongPressRef.current = false;
      return;
    }

    // لأي رسالة أخرى، نلغي علامة النقر المطول فوراً حتى تُحدد بلمسة واحدة
    justTriggeredLongPressRef.current = false;

    setSelectedMessageIds((prev) => {
      const exists = prev.some((id) => String(id) === strId);
      let updated;
      if (exists) {
        updated = prev.filter((id) => String(id) !== strId);
      } else {
        updated = [...prev, strId];
      }
      // إذا أصبح عدد الرسائل المحددة أكثر من 1، أو تم إلغاء تحديد كل الرسائل (0)، تُزال نوافذ التفاعل والإيموجي والأزرار السفلية فوراً
      if (updated.length > 1 || updated.length === 0) {
        setReactionTargetMessage(null);
      }
      return updated;
    });
  };

  // الصعود للرسالة المردود عليها وتشغيل رقصة واهتزاز خفيف مثل رنة الهاتف
  const handlePressReplyQuote = (replyData, currentMessageId) => {
    if (selectedMessageIds.length > 0) {
      handleToggleSelectMessage(currentMessageId);
      return;
    }
    if (!replyData || !messages || messages.length === 0) return;

    // 1. البحث عن الرسالة بالمعرف أولاً ثم بمطابقة النص أو الصورة
    const targetId = replyData.messageId;
    let targetIndex = -1;

    if (targetId) {
      targetIndex = messages.findIndex((m) => String(m._id) === String(targetId));
    }

    if (targetIndex === -1 && replyData.content) {
      targetIndex = messages.findIndex((m) => {
        const clean = getCleanMessageText(m.content);
        return clean === replyData.content;
      });
    }

    if (targetIndex === -1 && replyData.imageUrl) {
      targetIndex = messages.findIndex((m) => m.imageUrl === replyData.imageUrl);
    }

    if (targetIndex === -1) {
      showAlert(
        'Message introuvable',
        "Le message d'origine n'est plus disponible ou a été supprimé.",
        [{ text: "D'accord" }],
        { type: 'info' }
      );
      return;
    }

    const targetMsg = messages[targetIndex];
    const targetMsgId = targetMsg._id;

    // إيقاف التمرير التلقائي للأسفل حتى يستقر العرض عند الرسالة المستهدفة
    shouldAutoScrollRef.current = false;

    // 2. التمرير الانسيابي للرسالة لتتوسط الشاشة تماماً
    try {
      chatFlatListRef.current?.scrollToIndex({
        index: targetIndex,
        animated: true,
        viewPosition: 0.5,
      });
    } catch (e) {
      setTimeout(() => {
        try {
          chatFlatListRef.current?.scrollToIndex({
            index: targetIndex,
            animated: true,
            viewPosition: 0.5,
          });
        } catch (err) { }
      }, 100);
    }

    // 3. تفعيل حركة الرقص والاهتزاز الاحترافية فور وصول العرض للرسالة
    const isFar = Math.abs(messages.length - 1 - targetIndex) > 2;
    const animDelay = isFar ? 260 : 40;

    setTimeout(() => {
      setHighlightedMessageId(targetMsgId);
    }, animDelay);

    // إعادة ضبط التمييز بعد انتهاء الرقصة
    setTimeout(() => {
      setHighlightedMessageId((curr) => (curr === targetMsgId ? null : curr));
    }, animDelay + 950);
  };

  // Suppression de toute la conversation (من داخل المحادثة أو من قائمة المحادثات)
  const handleDeleteAllMessages = (targetContact = null) => {
    // التحقق بأمان من أن المعامل هو كائن جهة اتصال وليس حدث لمس (Gesture Event)
    const isValidContact =
      targetContact &&
      typeof targetContact === 'object' &&
      (targetContact._id || targetContact.id);
    const contact = isValidContact ? targetContact : activeChatUser;
    if (!contact) return;

    const contactId = contact._id || contact.id;
    const currentUserId = currentUser?.id || currentUser?._id;
    if (!contactId || !currentUserId) return;

    showAlert(
      'Supprimer la conversation',
      `Êtes-vous sûr de vouloir supprimer définitivement toute la conversation avec ${contact.name || 'cet utilisateur'
      } ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(
                `${apiUrl}/api/messages/conversation/${currentUserId}/${contactId}`,
                { method: 'DELETE' }
              );
              if (res.ok) {
                if (
                  activeChatUser &&
                  (activeChatUser._id === contactId || activeChatUser.id === contactId)
                ) {
                  setMessages([]);
                  setSelectedMessageIds([]);
                }
                fetchConversations();
              } else {
                showAlert(
                  'Erreur',
                  'Échec de la suppression de la conversation.',
                  [{ text: 'Fermer' }],
                  { type: 'error' }
                );
              }
            } catch (err) {
              showAlert(
                'Erreur',
                'Une erreur est survenue lors de la suppression de la conversation.',
                [{ text: 'Fermer' }],
                { type: 'error' }
              );
            }
          },
        },
      ],
      { type: 'danger' }
    );
  };

  // Suppression des messages sélectionnés
  const handleDeleteSelectedMessages = () => {
    if (selectedMessageIds.length === 0) return;
    const count = selectedMessageIds.length;
    showAlert(
      'Supprimer les messages',
      `Êtes-vous sûr de vouloir supprimer définitivement ${count} message${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${apiUrl}/api/messages/batch`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageIds: selectedMessageIds }),
              });
              if (res.ok) {
                setMessages((prev) =>
                  prev.filter((m) => !selectedMessageIds.includes(m._id))
                );
                setSelectedMessageIds([]);
                fetchConversations();
                // تم حذف الرسائل بنجاح وبدون إظهار نافذة إعلام منبثقة
              } else {
                showAlert(
                  'Erreur',
                  'Échec de la suppression des messages sélectionnés.',
                  [{ text: 'Fermer' }],
                  { type: 'error' }
                );
              }
            } catch (err) {
              showAlert(
                'Erreur',
                'Une erreur est survenue lors de la suppression des messages.',
                [{ text: 'Fermer' }],
                { type: 'error' }
              );
            }
          },
        },
      ],
      { type: 'danger' }
    );
  };

  // نسخ الرسالة المحددة إلى الحافظة بسلاسة وبدون إظهار أي نافذة منبثقة
  const handleCopySelectedMessage = async () => {
    if (selectedMessageIds.length !== 1) return;
    const targetMsg = messages.find((m) => m._id === selectedMessageIds[0]);
    if (!targetMsg) return;

    const rawText = targetMsg.content ? getCleanMessageText(targetMsg.content) : '';
    const textToCopy = rawText || targetMsg.imageUrl || '';

    if (!textToCopy) {
      setSelectedMessageIds([]);
      return;
    }

    try {
      await Clipboard.setStringAsync(textToCopy);
      setSelectedMessageIds([]); // إلغاء التحديد فور النسخ بسلاسة وبدون أي نافذة منبثقة
    } catch (err) {
      setSelectedMessageIds([]);
    }
  };

  const chatFlatListRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);

  // دالة النزول لأسفل المحادثة تلقائياً
  const scrollToBottomChat = (animated = true) => {
    shouldAutoScrollRef.current = true;
    setTimeout(() => {
      try {
        chatFlatListRef.current?.scrollToEnd({ animated });
      } catch (e) { }
    }, 60);
    setTimeout(() => {
      try {
        chatFlatListRef.current?.scrollToEnd({ animated });
      } catch (e) { }
    }, 240);
  };

  // حالة صفحة بدء محادثة جديدة (New Message Modal)
  const [isNewChatModalVisible, setIsNewChatModalVisible] = useState(false);
  const [allRegisteredUsers, setAllRegisteredUsers] = useState([]);
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');

  // ----------------- حالة الشاشة النشطة والملف الشخصي ----------------- //
  const [activeScreen, setActiveScreen] = useState('tasks'); // 'tasks' | 'messages'
  const [isProfileVisible, setIsProfileVisible] = useState(false);

  // ----------------- حالة إدارة المهام (Tasks State) ----------------- //
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [taskFilter, setTaskFilter] = useState('All'); // 'All' | 'Work' | 'Personal' | 'Design' | 'Urgent'
  const [taskStatusFilter, setTaskStatusFilter] = useState('all'); // 'all' | 'pending' | 'completed'

  // نافذة إضافة / تعديل مهمة
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskCategory, setTaskCategory] = useState('Work');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  // جلب المحادثات والمهام عند تسجيل الدخول
  useEffect(() => {
    if (currentUser) {
      fetchTasks();
      fetchConversations();
    }
  }, [currentUser]);

  // ----------------- التعامل الذكي مع زر الرجوع الخاص بنظام الهاتف (Hardware Back Button) ----------------- //
  useEffect(() => {
    const handleHardwareBackPress = () => {
      // 0. إغلاق نافذة التفاعلات السريعة والإيموجي إذا كانت مفتوحة
      if (reactionTargetMessage) {
        handleCloseReactionOverlay();
        return true;
      }

      // 1. إغلاق التنبيه المخصص إن كان ظاهراً
      if (appAlert?.visible) {
        closeAlert();
        return true;
      }

      // 2. إغلاق نافذة عرض الصورة المكبرة إن كانت مفتوحة
      if (previewImage !== null) {
        setPreviewImage(null);
        return true;
      }

      // 3. إغلاق نافذة بدء محادثة جديدة
      if (isNewChatModalVisible) {
        setIsNewChatModalVisible(false);
        return true;
      }

      // 4. إغلاق نافذة لوحة تحكم الأدمن
      if (isAdminModalVisible) {
        setIsAdminModalVisible(false);
        return true;
      }

      // 5. إغلاق نافذة الملف الشخصي
      if (isProfileVisible) {
        setIsProfileVisible(false);
        return true;
      }

      // 6. إغلاق نافذة إضافة / تعديل المهمة
      if (isTaskModalVisible) {
        setIsTaskModalVisible(false);
        return true;
      }

      // 7. إذا كان المستخدم داخل محادثة مع شخص، العودة إلى قائمة الرسائل
      if (activeChatUser !== null) {
        setActiveChatUser(null);
        return true;
      }

      // 8. إذا كان المستخدم في صفحة الرسائل (messages)، العودة فوراً إلى الصفحة الرئيسية (tasks) بدلاً من إغلاق التطبيق
      if (activeScreen === 'messages') {
        setActiveScreen('tasks');
        return true;
      }

      // 9. إذا كان المستخدم في شاشة إنشاء حساب، العودة إلى شاشة تسجيل الدخول
      if (!currentUser && !isLogin) {
        setIsLogin(true);
        return true;
      }

      // 10. في حال كان في الصفحة الرئيسية (tasks) ولا توجد أي نوافذ مفتوحة، يعمل السلوك الافتراضي للهاتف
      return false;
    };

    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleHardwareBackPress
    );

    return () => backSubscription.remove();
  }, [
    reactionTargetMessage,
    appAlert,
    previewImage,
    isNewChatModalVisible,
    isAdminModalVisible,
    isProfileVisible,
    isTaskModalVisible,
    activeChatUser,
    activeScreen,
    currentUser,
    isLogin,
  ]);

  // إعداد الإشعارات الفورية والاستماع للأحداث والنقر
  useEffect(() => {
    // 1. طلب الإذن والحصول على رمز الجهاز
    registerForPushNotificationsAsync()
      .then((tokenData) => {
        if (tokenData) {
          const rawToken =
            typeof tokenData === 'string'
              ? tokenData
              : tokenData.expoToken || tokenData.token || tokenData.fcmToken;
          setExpoPushToken(rawToken);
          setDeviceTokens(tokenData);
          // تسجيل الجهاز فوراً في الخادم للوصول إلى كافة الأجهزة حتى قبل تسجيل الدخول
          registerDeviceTokenWithServer(apiUrl, currentUser?.id || null, tokenData);
        }
      })
      .catch((err) => {
        console.warn('Erreur registerForPushNotificationsAsync:', err?.message);
      });

    // 2. الاستماع لوصول إشعار أثناء تشغيل التطبيق (ظهور الرسائل فوراً للطرف الآخر)
    try {
      notificationListener.current = Notifications.addNotificationReceivedListener(
        (notification) => {
          if (currentUser) {
            fetchConversations();
            const notifData = notification?.request?.content?.data;
            // إذا كان المستخدم فاتحاً للمحادثة مع المرسل، نجلب الرسالة فوراً دون أي تأخير
            if (
              activeChatUserRef.current?._id &&
              (!notifData?.senderId || String(notifData.senderId) === String(activeChatUserRef.current._id))
            ) {
              fetchMessagesSilently(activeChatUserRef.current._id);
              markMessagesAsRead(activeChatUserRef.current._id);
            }
          }
        }
      );
    } catch (err) {
      console.warn('Erreur addNotificationReceivedListener:', err?.message);
    }

    // 3. الاستماع لنقر المستخدم على الإشعار وفتح الصفحة الرئيسية فقط لحماية الخصوصية التامة
    try {
      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        () => {
          // فتح التطبيق فقط في الصفحة الرئيسية (tasks) وإغلاق أي محادثة مفتوحة
          setActiveChatUser(null);
          setActiveScreen('tasks');
          pendingNotificationChatRef.current = null;
        }
      );
    } catch (err) {
      console.warn('Erreur addNotificationResponseReceivedListener:', err?.message);
    }

    // 4. معالجة فتح التطبيق وهو مغلق بالكامل عبر النقر على إشعار
    try {
      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (response) {
            // فتح الصفحة الرئيسية فقط
            setActiveChatUser(null);
            setActiveScreen('tasks');
            pendingNotificationChatRef.current = null;
          }
        })
        .catch((err) => {
          console.warn('Erreur getLastNotificationResponseAsync:', err?.message);
        });
    } catch (err) {
      console.warn('Erreur appel getLastNotificationResponseAsync:', err?.message);
    }

    return () => {
      try {
        if (notificationListener.current) {
          notificationListener.current.remove();
        }
      } catch (e) { }
      try {
        if (responseListener.current) {
          responseListener.current.remove();
        }
      } catch (e) { }
    };
  }, [currentUser]);

  // مزامنة رمز الجهاز مع الخادم فور توفر المستخدم أو رمز الجهاز
  useEffect(() => {
    if (currentUser?.id) {
      if (expoPushToken || deviceTokens) {
        registerDeviceTokenWithServer(
          apiUrl,
          currentUser.id,
          deviceTokens || expoPushToken
        );
      } else {
        // إذا لم يكن الرمز قد تم جلبه بعد، نطلبه ونسجله للمستخدم فوراً
        registerForPushNotificationsAsync()
          .then((tokens) => {
            if (tokens) {
              const raw = tokens.expoToken || tokens.token || tokens.fcmToken;
              setExpoPushToken(raw);
              setDeviceTokens(tokens);
              registerDeviceTokenWithServer(apiUrl, currentUser.id, tokens);
            }
          })
          .catch(() => {});
      }
    }

    // ضمان البقاء في الصفحة الرئيسية وعدم فتح أي محادثة سرية تلقائياً
    pendingNotificationChatRef.current = null;
  }, [currentUser?.id, expoPushToken, deviceTokens, apiUrl]);

  // تتبع حالة الاتصال ونبضات التواجد (Heartbeat) وتحديث حالة الآخرين
  useEffect(() => {
    if (!currentUser?.id) return;

    const sendPresence = async (online = true) => {
      try {
        await fetch(`${apiUrl}/api/users/presence`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, isOnline: online }),
        });
      } catch (e) { }
    };

    // إرسال حالة "متصل" فور فتح التطبيق
    sendPresence(true);

    // نبضة تواجد كل 20 ثانية لتأكيد أن التطبيق ما زال مفتوحاً
    const heartbeat = setInterval(() => {
      sendPresence(true);
    }, 20000);

    // تحديث دوري لقائمة المحادثات كل 5 ثوانٍ لتحديث الرسائل والنقطة الخضراء
    const refreshInterval = setInterval(() => {
      fetchConversations();
    }, 5000);

    // تتبع حالة التطبيق عند الخروج إلى الخلفية أو العودة
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        sendPresence(true);
        fetchConversations();
      } else {
        sendPresence(false);
      }
    });

    return () => {
      clearInterval(heartbeat);
      clearInterval(refreshInterval);
      appStateSub.remove();
      sendPresence(false);
    };
  }, [currentUser?.id, apiUrl]);

  // مزامنة حية وسريعة كل 1.5 ثانية للرسائل ما دامت شاشة المحادثة مفتوحة
  useEffect(() => {
    if (!activeChatUser?._id || !currentUser?.id) return;

    // جلب صامت متكرر دون وميض
    const liveChatTicker = setInterval(() => {
      fetchMessagesSilently(activeChatUser._id);
    }, 1500);

    return () => clearInterval(liveChatTicker);
  }, [activeChatUser?._id, currentUser?.id]);

  // البحث التلقائي عن المستخدمين المسجلين
  useEffect(() => {
    if (!currentUser) return;
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // دالة التبديل السلس والموثوق بين شاشتي تسجيل الدخول وإنشاء الحساب
  const switchAuthMode = (targetIsLogin) => {
    Keyboard.dismiss();
    setAuthError('');
    if (typeof targetIsLogin === 'boolean') {
      setIsLogin(targetIsLogin);
    } else {
      setIsLogin((prev) => !prev);
    }
    setTimeout(() => {
      authScrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 50);
  };

  // Exécution de la connexion ou de la création de compte (Recherche directe dans MongoDB sans cache)
  const handleAuthSubmit = async () => {
    if (submittingAuthRef.current || authLoading) return;
    submittingAuthRef.current = true;
    Keyboard.dismiss();
    setAuthError('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setAuthError('Veuillez renseigner votre adresse e-mail et votre mot de passe.');
      submittingAuthRef.current = false;
      return;
    }

    if (!isLogin && (!firstName.trim() || !lastName.trim())) {
      setAuthError('Veuillez entrer votre prénom et votre nom.');
      submittingAuthRef.current = false;
      return;
    }

    setAuthLoading(true);
    const endpoint = isLogin ? '/api/login' : '/api/register';
    const fullName = isLogin ? '' : `${firstName.trim()} ${lastName.trim()}`;
    const payload = isLogin
      ? { email: cleanEmail, password: cleanPassword }
      : { name: fullName, email: cleanEmail, password: cleanPassword };

    // مسح أي جلسة قديمة في الكاش لضمان التحقق النظيف والمباشر من قاعدة البيانات
    try {
      await SafeAsyncStorage.removeItem(USER_SESSION_KEY);
    } catch (e) { }

    try {
      // إرسال الطلب مباشرة لقاعدة البيانات مع ترويسات منع أي كاش وسيط
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        body: JSON.stringify(payload),
      });

      const data = await safeJsonFetch(res);
      if (!res.ok || !data) {
        throw new Error(data?.message || `Erreur serveur (${res.status || 'injoignable'})`);
      }

      const userData = {
        ...data.user,
        id: data.user?.id || data.user?._id,
      };
      setCurrentUser(userData);
      try {
        await SafeAsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(userData));
      } catch (cacheErr) { }
      setPassword('');
      setAuthError('');
      setActiveScreen('tasks');
    } catch (err) {
      setAuthError(err.message || 'Erreur de connexion au serveur');
    } finally {
      submittingAuthRef.current = false;
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    showAlert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter de votre compte ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          try {
            await SafeAsyncStorage.removeItem(USER_SESSION_KEY);
            console.log('🗑️ الجلسة حُذفت من التخزين المحلي (AsyncStorage)');
          } catch (cacheErr) {
            // تم الحذف بنجاح
          }
          if (currentUser?.id) {
            if (expoPushToken || deviceTokens) {
              unregisterDeviceTokenFromServer(
                apiUrl,
                currentUser.id,
                expoPushToken || deviceTokens?.expoToken || deviceTokens?.token
              );
            }
            try {
              await fetch(`${apiUrl}/api/users/presence`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, isOnline: false }),
              });
            } catch (e) { }
          }
          setCurrentUser(null);
          setIsLogin(true);
          setSearchQuery('');
          setSearchResults([]);
          setConversations([]);
          setActiveChatUser(null);
          setActiveScreen('tasks');
          setIsProfileVisible(false);
          setTasks([]);
        },
      },
    ], { type: 'logout' });
  };

  // ----------------- دوال إدارة المهام (Tasks Handlers) ----------------- //
  const fetchTasks = async () => {
    if (!currentUser?.id) return;
    setLoadingTasks(true);
    try {
      const res = await fetch(`${apiUrl}/api/tasks/${currentUser.id}`);
      const data = await safeJsonFetch(res);
      if (res.ok && Array.isArray(data)) setTasks(deduplicateById(data));
    } catch (err) {
      // safe catch
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleSaveTask = async () => {
    if (!taskTitle.trim()) {
      showAlert('Champ requis', 'Veuillez entrer un titre pour la tâche.', [{ text: 'Compris' }], { type: 'warning' });
      return;
    }

    setSavingTask(true);
    try {
      if (editingTask) {
        const res = await fetch(`${apiUrl}/api/tasks/${editingTask._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: taskTitle.trim(),
            description: taskDesc.trim(),
            category: taskCategory,
            priority: taskPriority,
            dueDate: taskDueDate.trim(),
          }),
        });
        const updated = await safeJsonFetch(res);
        if (res.ok && updated) {
          setTasks((prev) =>
            deduplicateById(prev.map((t) => (t._id === updated._id ? updated : t)))
          );
          setIsTaskModalVisible(false);
          setEditingTask(null);
        } else {
          showAlert('Erreur', updated?.message || 'Échec de la mise à jour de la tâche', [{ text: 'Fermer' }], { type: 'error' });
        }
      } else {
        const res = await fetch(`${apiUrl}/api/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            title: taskTitle.trim(),
            description: taskDesc.trim(),
            category: taskCategory,
            priority: taskPriority,
            dueDate: taskDueDate.trim(),
          }),
        });
        const created = await safeJsonFetch(res);
        if (res.ok && created) {
          setTasks((prev) => deduplicateById([created, ...prev]));
          setIsTaskModalVisible(false);
        } else {
          showAlert('Erreur', created?.message || 'Échec de la création de la tâche', [{ text: 'Fermer' }], { type: 'error' });
        }
      }
    } catch (err) {
      showAlert('Erreur', err.message || "Impossible d'enregistrer la tâche", [{ text: 'Fermer' }], { type: 'error' });
    } finally {
      setSavingTask(false);
    }
  };

  const handleToggleTask = async (task) => {
    const newStatus = !task.completed;
    setTasks((prev) =>
      prev.map((t) => (t._id === task._id ? { ...t, completed: newStatus } : t))
    );

    try {
      await fetch(`${apiUrl}/api/tasks/${task._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newStatus }),
      });
    } catch (err) {
      console.log('Error toggling task:', err.message);
      setTasks((prev) =>
        prev.map((t) => (t._id === task._id ? { ...t, completed: !newStatus } : t))
      );
    }
  };

  const handleDeleteTask = (task) => {
    showAlert(
      'Supprimer la tâche',
      `Êtes-vous sûr de vouloir supprimer "${task.title}" ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setTasks((prev) => prev.filter((t) => t._id !== task._id));
            try {
              await fetch(`${apiUrl}/api/tasks/${task._id}`, {
                method: 'DELETE',
              });
            } catch (err) {
              console.log('Error deleting task:', err.message);
              fetchTasks();
            }
          },
        },
      ],
      { type: 'danger' }
    );
  };

  const openNewTaskModal = () => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDesc('');
    setTaskCategory('Work');
    setTaskPriority('Medium');
    setTaskDueDate('');
    setIsTaskModalVisible(true);
  };

  const openEditTaskModal = (task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description || '');
    setTaskCategory(task.category || 'Work');
    setTaskPriority(task.priority || 'Medium');
    setTaskDueDate(task.dueDate || '');
    setIsTaskModalVisible(true);
  };

  const fetchConversations = async () => {
    if (!currentUser?.id) return;
    setLoadingConversations(true);
    try {
      const res = await fetch(`${apiUrl}/api/conversations/${currentUser.id}`);
      const data = await safeJsonFetch(res);
      if (res.ok && Array.isArray(data)) {
        const seenContactIds = new Set();
        const uniqueConversations = [];
        for (const item of data) {
          const contactId = item?.contact?._id;
          if (contactId && !seenContactIds.has(String(contactId))) {
            seenContactIds.add(String(contactId));
            uniqueConversations.push(item);
          }
        }
        setConversations(uniqueConversations);
        if (activeChatUser) {
          const found = uniqueConversations.find((c) => c.contact._id === activeChatUser._id);
          if (found && Boolean(found.contact.isOnline) !== Boolean(activeChatUser.isOnline)) {
            setActiveChatUser((prev) => (prev ? { ...prev, isOnline: Boolean(found.contact.isOnline) } : null));
          }
        }
      }
    } catch (err) {
      // safe ignore
    } finally {
      setLoadingConversations(false);
    }
  };

  const searchUsers = async (query) => {
    setSearchLoading(true);
    try {
      const res = await fetch(
        `${apiUrl}/api/users/search?q=${encodeURIComponent(query)}&currentUserId=${currentUser.id}`
      );
      const data = await safeJsonFetch(res);
      if (res.ok && Array.isArray(data)) setSearchResults(data);
    } catch (err) {
      // safe ignore
    } finally {
      setSearchLoading(false);
    }
  };

  const openChatWith = (user) => {
    const contactData = {
      _id: user._id || user.id,
      name: user.name || user.email.split('@')[0],
      email: user.email,
      isOnline: Boolean(user.isOnline),
    };
    setActiveChatUser(contactData);
    fetchMessages(contactData._id);

    // تصفير العداد فوراً للمحادثة عند فتحها
    setConversations((prev) =>
      prev.map((c) =>
        c.contact._id === contactData._id ? { ...c, unreadCount: 0 } : c
      )
    );

    // تحديث قاعدة البيانات لجعل الرسائل مقروءة
    markMessagesAsRead(contactData._id);
  };

  const markMessagesAsRead = async (contactId) => {
    try {
      await fetch(`${apiUrl}/api/messages/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUserId: currentUser.id,
          contactId: contactId,
        }),
      });
    } catch (err) {
      console.log('Error marking messages as read:', err.message);
    }
  };

  const fetchMessages = async (otherUserId) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`${apiUrl}/api/messages/${currentUser.id}/${otherUserId}`);
      const data = await safeJsonFetch(res);
      if (res.ok && Array.isArray(data)) {
        setMessages(deduplicateById(data));
        scrollToBottomChat(false);
      }
    } catch (err) {
      // safe ignore
    } finally {
      setLoadingMessages(false);
      setTimeout(() => scrollToBottomChat(false), 80);
    }
  };

  // جلب صامت فوري للرسائل دون إظهار مؤشر تحميل كامل لمنع أي وميض
  const fetchMessagesSilently = async (otherUserId) => {
    if (!currentUser?.id || !otherUserId) return;
    try {
      const res = await fetch(`${apiUrl}/api/messages/${currentUser.id}/${otherUserId}`);
      const data = await safeJsonFetch(res);
      if (res.ok && Array.isArray(data)) {
        const uniqueMessages = deduplicateById(data);

        // إذا كان الطرف الآخر قد أرسل رسائل ولم تُقرأ بعد وأنا فاتح للمحادثة، وضع علامة مقروءة فوراً
        const hasUnreadFromOther = uniqueMessages.some(
          (m) => !m.read && (m.sender?._id === otherUserId || m.sender === otherUserId)
        );
        if (hasUnreadFromOther) {
          markMessagesAsRead(otherUserId);
        }

        setMessages((prev) => {
          if (
            uniqueMessages.length === prev.length &&
            uniqueMessages.length > 0
          ) {
            const isIdentical =
              uniqueMessages[uniqueMessages.length - 1]._id === prev[prev.length - 1]._id &&
              uniqueMessages.every((m, idx) => {
                const pm = prev[idx];
                return pm && pm._id === m._id && pm.read === m.read;
              });
            if (isIdentical) {
              return prev;
            }
          }

          const isNewMessage =
            uniqueMessages.length > prev.length ||
            (uniqueMessages.length > 0 &&
              prev.length > 0 &&
              uniqueMessages[uniqueMessages.length - 1]._id !== prev[prev.length - 1]._id);

          if (isNewMessage) {
            setTimeout(() => {
              chatFlatListRef.current?.scrollToEnd({ animated: true });
            }, 60);
          }

          return uniqueMessages;
        });
      }
    } catch (err) { }
  };

  // معالجة السحب للأسفل لإعادة تحميل قسم الرسائل والمحادثات الواردة
  const handleRefreshConversations = async () => {
    setRefreshingConversations(true);
    try {
      await fetchConversations();
    } finally {
      setRefreshingConversations(false);
    }
  };

  // معالجة السحب للأسفل لإعادة تحميل رسائل المحادثة النشطة
  const handleRefreshMessages = async () => {
    if (!activeChatUser?._id) return;
    setRefreshingMessages(true);
    try {
      await fetchMessages(activeChatUser._id);
    } finally {
      setRefreshingMessages(false);
    }
  };

  // ----------------- دوال لوحة تحكم الأدمن (Admin Panel Handlers) -----------------
  // 1. جلب جميع الحسابات مع إحصائيات الرسائل
  const fetchAdminUsers = async () => {
    setLoadingAdminUsers(true);
    try {
      const res = await fetch(`${apiUrl}/api/admin/users`);
      const data = await safeJsonFetch(res);
      if (res.ok && data?.users) {
        setAdminUsers(data.users);
      } else {
        showAlert('Erreur', data?.message || 'Impossible de récupérer les comptes.', [{ text: 'Fermer' }], { type: 'error' });
      }
    } catch (err) {
      console.log('Error fetching admin users:', err.message);
      showAlert('Erreur', 'Erreur réseau lors de la récupération des comptes.', [{ text: 'Fermer' }], { type: 'error' });
    } finally {
      setLoadingAdminUsers(false);
    }
  };

  // 2. حذف جميع رسائل المستخدم تماماً وبصمت (المرسلة والمستقبلة)
  const handleDeleteUserMessages = (targetUser) => {
    showAlert(
      'Supprimer tous les messages',
      `Êtes-vous sûr de vouloir supprimer définitivement et silencieusement tous les messages envoyés et reçus par "${targetUser.name || targetUser.email}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer définitivement',
          style: 'destructive',
          onPress: async () => {
            setDeletingMessagesUserId(targetUser._id);
            try {
              const res = await fetch(`${apiUrl}/api/admin/users/${targetUser._id}/messages`, {
                method: 'DELETE',
              });
              const data = await safeJsonFetch(res);
              if (res.ok) {
                setAdminUsers((prev) =>
                  prev.map((u) =>
                    u._id === targetUser._id
                      ? { ...u, sentCount: 0, receivedCount: 0, totalMessages: 0 }
                      : u
                  )
                );
                fetchConversations();
                showAlert('Succès', 'Tous les messages ont été supprimés comme s\'ils n\'avaient jamais existé.', [{ text: "D'accord" }], { type: 'success' });
              } else {
                showAlert('Erreur', data?.message || 'Échec de la suppression des messages.', [{ text: 'Fermer' }], { type: 'error' });
              }
            } catch (err) {
              showAlert('Erreur', 'Erreur réseau lors de la suppression des messages.', [{ text: 'Fermer' }], { type: 'error' });
            } finally {
              setDeletingMessagesUserId(null);
            }
          },
        },
      ],
      { type: 'danger' }
    );
  };

  // 3. حذف حساب المستخدم بالكامل مع بياناته
  const handleDeleteUserAccount = (targetUser) => {
    if (targetUser.email === 'admin@admin.com') {
      showAlert('Action refusée', 'Le compte administrateur principal ne peut pas être supprimé.', [{ text: 'Compris' }], { type: 'warning' });
      return;
    }

    showAlert(
      'Supprimer le compte',
      `Êtes-vous sûr de vouloir supprimer définitivement le compte "${targetUser.name || targetUser.email}" avec toutes ses données et messages ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer définitivement',
          style: 'destructive',
          onPress: async () => {
            setDeletingUserId(targetUser._id);
            try {
              const res = await fetch(`${apiUrl}/api/admin/users/${targetUser._id}`, {
                method: 'DELETE',
              });
              const data = await safeJsonFetch(res);
              if (res.ok) {
                setAdminUsers((prev) => prev.filter((u) => u._id !== targetUser._id));
                fetchConversations();
                showAlert('Succès', 'Le compte a été supprimé définitivement.', [{ text: "D'accord" }], { type: 'success' });
              } else {
                showAlert('Erreur', data?.message || 'Échec de la suppression du compte.', [{ text: 'Fermer' }], { type: 'error' });
              }
            } catch (err) {
              showAlert('Erreur', 'Erreur réseau lors de la suppression du compte.', [{ text: 'Fermer' }], { type: 'error' });
            } finally {
              setDeletingUserId(null);
            }
          },
        },
      ],
      { type: 'danger' }
    );
  };

  // إرسال إشعار فوري لجميع الأجهزة والحسابات المسجلة
  const handleSendBroadcastTestNotification = () => {
    showAlert(
      'Notification générale',
      'Voulez-vous envoyer une notification à TOUS les appareils et utilisateurs ayant installé l\'application ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Diffuser à tous',
          onPress: async () => {
            setSendingTestNotification(true);

            const notifTitle = `📢 Notification : ${currentUser?.name || 'Contact'}`;
            const notifBody = 'Message général destiné à tous les appareils de l\'application ! 🎉';
            const cleanToken =
              expoPushToken ||
              (typeof deviceTokens === 'string'
                ? deviceTokens
                : deviceTokens?.expoToken || deviceTokens?.token);

            // تأكيد تسجيل الرمز في الخادم مسبقاً لضمان وجوده
            if (cleanToken) {
              registerDeviceTokenWithServer(
                apiUrl,
                currentUser?.id || null,
                deviceTokens || cleanToken
              ).catch(() => { });
            }

            let serverSuccess = false;
            let serverCount = 0;
            let serverMsg = '';

            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000);

              const res = await fetch(`${apiUrl}/api/notifications/broadcast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                  senderName: currentUser?.name || currentUser?.email?.split('@')[0] || 'Admin',
                  title: notifTitle,
                  body: notifBody,
                  pushToken: cleanToken || undefined,
                }),
              });
              clearTimeout(timeoutId);

              const ct = res.headers.get('content-type') || '';
              if (ct.includes('application/json')) {
                const data = await res.json();
                if (res.ok && data?.success) {
                  serverSuccess = true;
                  serverCount = data.count || 1;
                  serverMsg = data.message;
                } else if (data?.message) {
                  serverMsg = data.message;
                }
              }
            } catch (err) {
              console.warn('Erreur serveur broadcast :', err?.message);
            }

            setSendingTestNotification(false);

            if (serverSuccess) {
              showAlert(
                'Diffusion réussie !',
                `Notification envoyée avec succès à tous les appareils (${serverCount} appareil(s) enregistré(s)) !`,
                [{ text: 'Super' }],
                { type: 'success' }
              );
            } else {
              showAlert(
                'Échec de la diffusion',
                serverMsg || 'Impossible de contacter le serveur pour la diffusion générale. Vérifiez la connexion.',
                [{ text: "D'accord" }],
                { type: 'error' }
              );
            }
          },
        },
      ],
      { type: 'info' }
    );
  };

  const handleSendMessage = async () => {
    if (!newMsgText.trim() || !activeChatUser || sendingMsg) return;

    setSendingMsg(true);
    const contentToSend = newMsgText.trim();
    const currentReply = replyingToMessage
      ? {
        messageId: replyingToMessage._id,
        senderName:
          replyingToMessage.sender?._id === currentUser?.id ||
            replyingToMessage.sender === currentUser?.id
            ? 'Vous'
            : replyingToMessage.sender?.name || activeChatUser?.name || 'Contact',
        content: replyingToMessage.content
          ? getCleanMessageText(replyingToMessage.content).slice(0, 150)
          : '',
        imageUrl: replyingToMessage.imageUrl || '',
      }
      : null;

    let payloadContent = contentToSend;
    if (currentReply) {
      payloadContent = `@@REPLY:${JSON.stringify(currentReply)}@@\n${contentToSend}`;
    }

    setNewMsgText('');
    setReplyingToMessage(null);
    try {
      const res = await fetch(`${apiUrl}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: activeChatUser._id,
          content: payloadContent,
          replyTo: currentReply,
        }),
      });

      const data = await safeJsonFetch(res);
      if (res.ok && data) {
        const dataWithReply = {
          ...data,
          content: payloadContent,
          replyTo: data.replyTo || currentReply,
        };
        setMessages((prev) => deduplicateById([...prev, dataWithReply]));
        fetchConversations();
        scrollToBottomChat(true);
      } else {
        setNewMsgText(contentToSend);
        if (currentReply) setReplyingToMessage(replyingToMessage);
        showAlert('Erreur', data?.message || "Échec de l'envoi du message", [{ text: 'Fermer' }], { type: 'error' });
      }
    } catch (err) {
      setNewMsgText(contentToSend);
      if (currentReply) setReplyingToMessage(replyingToMessage);
      showAlert('Erreur', "Échec de l'envoi du message", [{ text: 'Fermer' }], { type: 'error' });
    } finally {
      setSendingMsg(false);
    }
  };

  // Sélection d'une image et téléchargement sur ImgBB
  const pickAndUploadImage = async (useCamera = false) => {
    if (!activeChatUser || uploadingImage) return;

    try {
      if (useCamera) {
        const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPerm.granted) {
          showAlert(
            'Autorisation requise',
            "L'autorisation de la caméra est requise pour prendre une photo.",
            [{ text: 'Compris' }],
            { type: 'warning' }
          );
          return;
        }
      } else {
        const libraryPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!libraryPerm.granted) {
          showAlert(
            'Autorisation requise',
            "L'autorisation d'accès aux photos est requise pour choisir une image.",
            [{ text: 'Compris' }],
            { type: 'warning' }
          );
          return;
        }
      }

      const pickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const captionText = newMsgText.trim();
      if (captionText) setNewMsgText('');

      // Activation de l'état de chargement
      setUploadingImage(true);
      setUploadingImageUri(asset.uri);
      setUploadingCaption(captionText);
      scrollToBottomChat(true);

      const formData = new FormData();
      if (asset.base64) {
        formData.append('image', asset.base64);
      } else {
        const uriParts = asset.uri.split('.');
        const fileType = uriParts[uriParts.length - 1] || 'jpg';
        const fileName = `upload_${Date.now()}.${fileType}`;
        try {
          const fileResp = await fetch(asset.uri);
          const imageBlob = await fileResp.blob();
          formData.append('image', imageBlob, fileName);
        } catch (blobErr) {
          formData.append('image', {
            uri: asset.uri,
            name: fileName,
            type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
          });
        }
      }

      const imgbbRes = await fetch(
        `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Origin: 'https://imgbb.com',
            Referer: 'https://imgbb.com/',
          },
          body: formData,
        }
      );

      const imgbbData = await imgbbRes.json();

      if (!imgbbData.success || !imgbbData.data?.url) {
        throw new Error(
          imgbbData.error?.message || "Échec du téléchargement de l'image"
        );
      }

      const uploadedUrl = imgbbData.data.display_url || imgbbData.data.url;

      const currentReply = replyingToMessage
        ? {
          messageId: replyingToMessage._id,
          senderName:
            replyingToMessage.sender?._id === currentUser?.id ||
              replyingToMessage.sender === currentUser?.id
              ? 'Vous'
              : replyingToMessage.sender?.name || activeChatUser?.name || 'Contact',
          content: replyingToMessage.content
            ? getCleanMessageText(replyingToMessage.content).slice(0, 150)
            : '',
          imageUrl: replyingToMessage.imageUrl || '',
        }
        : null;
      setReplyingToMessage(null);

      let payloadCaption = captionText;
      if (currentReply) {
        payloadCaption = `@@REPLY:${JSON.stringify(currentReply)}@@\n${captionText}`;
      }

      const res = await fetch(`${apiUrl}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: activeChatUser._id,
          content: payloadCaption,
          imageUrl: uploadedUrl,
          replyTo: currentReply,
        }),
      });

      const data = await safeJsonFetch(res);
      if (res.ok && data) {
        const dataWithReply = {
          ...data,
          content: payloadCaption,
          replyTo: data.replyTo || currentReply,
        };
        setMessages((prev) => deduplicateById([...prev, dataWithReply]));
        fetchConversations();
        scrollToBottomChat(true);
      } else {
        showAlert('Erreur', data?.message || "Échec de l'envoi de la photo", [{ text: 'Fermer' }], { type: 'error' });
      }
    } catch (err) {
      console.log('Upload error:', err);
      showAlert('Erreur', err.message || "Échec de l'envoi de la photo", [{ text: 'Fermer' }], { type: 'error' });
    } finally {
      setUploadingImage(false);
      setUploadingImageUri(null);
      setUploadingCaption('');
      scrollToBottomChat(true);
    }
  };

  // Sélection et téléversement d'une vidéo vers le serveur
  const pickAndUploadVideo = async (useCamera = false) => {
    if (!activeChatUser || uploadingImage || uploadingVideo) return;

    try {
      if (useCamera) {
        const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPerm.granted) {
          showAlert(
            'Autorisation requise',
            "L'autorisation de la caméra est requise pour enregistrer une vidéo.",
            [{ text: 'Compris' }],
            { type: 'warning' }
          );
          return;
        }
      } else {
        const libraryPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!libraryPerm.granted) {
          showAlert(
            'Autorisation requise',
            "L'autorisation d'accès aux médias est requise pour choisir une vidéo.",
            [{ text: 'Compris' }],
            { type: 'warning' }
          );
          return;
        }
      }

      const pickerOptions = {
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 0.7,
        videoExportPreset: ImagePicker.VideoExportPreset?.MediumQuality ?? 2,
        videoMaxDuration: 180,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const captionText = newMsgText.trim();
      if (captionText) setNewMsgText('');

      // Activation de l'état de chargement
      setUploadingVideo(true);
      setUploadingVideoUri(asset.uri);
      setUploadingCaption(captionText);
      scrollToBottomChat(true);

      const uriParts = asset.uri.split('.');
      const fileType = uriParts[uriParts.length - 1] || 'mp4';
      const fileName = `video_${Date.now()}.${fileType}`;

      const formData = new FormData();
      try {
        const fileResponse = await fetch(asset.uri);
        const videoBlob = await fileResponse.blob();
        formData.append('video', videoBlob, fileName);
      } catch (blobErr) {
        console.warn('Erreur conversion video blob:', blobErr);
        formData.append('video', {
          uri: asset.uri,
          name: fileName,
          type: `video/${fileType === 'mov' ? 'quicktime' : 'mp4'}`,
        });
      }

      const uploadRes = await fetch(`${apiUrl}/api/upload/video`, {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData?.message || "Échec du téléchargement de la vidéo");
      }

      const uploadedUrl = uploadData.url;

      const currentReply = replyingToMessage
        ? {
          messageId: replyingToMessage._id,
          senderName:
            replyingToMessage.sender?._id === currentUser?.id ||
              replyingToMessage.sender === currentUser?.id
              ? 'Vous'
              : replyingToMessage.sender?.name || activeChatUser?.name || 'Contact',
          content: replyingToMessage.content
            ? getCleanMessageText(replyingToMessage.content).slice(0, 150)
            : '',
          imageUrl: replyingToMessage.imageUrl || '',
          videoUrl: replyingToMessage.videoUrl || '',
        }
        : null;
      setReplyingToMessage(null);

      let payloadCaption = captionText;
      if (currentReply) {
        payloadCaption = `@@REPLY:${JSON.stringify(currentReply)}@@\n${captionText}`;
      }

      const res = await fetch(`${apiUrl}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: activeChatUser._id,
          content: payloadCaption,
          videoUrl: uploadedUrl,
          replyTo: currentReply,
        }),
      });

      const data = await safeJsonFetch(res);
      if (res.ok && data) {
        const dataWithReply = {
          ...data,
          content: payloadCaption,
          videoUrl: uploadedUrl,
          replyTo: data.replyTo || currentReply,
        };
        setMessages((prev) => deduplicateById([...prev, dataWithReply]));
        fetchConversations();
        scrollToBottomChat(true);
      } else {
        showAlert('Erreur', data?.message || "Échec de l'envoi de la vidéo", [{ text: 'Fermer' }], { type: 'error' });
      }
    } catch (err) {
      console.log('Video upload error:', err);
      showAlert('Erreur', err.message || "Échec de l'envoi de la vidéo", [{ text: 'Fermer' }], { type: 'error' });
    } finally {
      setUploadingVideo(false);
      setUploadingVideoUri(null);
      setUploadingCaption('');
      scrollToBottomChat(true);
    }
  };

  // Menu de sélection de la source de l'image ou de la vidéo
  const showImagePickerOptions = () => {
    if (uploadingImage || uploadingVideo) return;
    showAlert('Envoyer un média', 'Choisir la photo ou la vidéo à envoyer', [
      {
        text: 'Prendre une photo',
        icon: 'camera',
        onPress: () => pickAndUploadImage(true),
      },
      {
        text: 'Galerie photos',
        icon: 'gallery',
        onPress: () => pickAndUploadImage(false),
      },
      {
        text: 'Enregistrer une vidéo',
        icon: 'video_camera',
        onPress: () => pickAndUploadVideo(true),
      },
      {
        text: 'Galerie vidéos',
        icon: 'video_gallery',
        onPress: () => pickAndUploadVideo(false),
      },
      {
        text: 'Annuler',
        style: 'cancel',
      },
    ], { type: 'media_picker' });
  };

  // جلب جميع المستخدمين المسجلين لصفحة المحادثة الجديدة
  const fetchAllUsers = async () => {
    setLoadingAllUsers(true);
    try {
      const res = await fetch(`${apiUrl}/api/users`);
      const data = await safeJsonFetch(res);
      if (res.ok && Array.isArray(data)) {
        // استثناء المستخدم الحالي من القائمة
        const others = data.filter((u) => (u._id || u.id) !== currentUser.id);
        setAllRegisteredUsers(others);
      }
    } catch (err) {
      console.log('Error fetching all users:', err?.message);
    } finally {
      setLoadingAllUsers(false);
    }
  };

  // بدء محادثة مع مستخدم تم اختياره من صفحة المحادثة الجديدة
  const startChatWith = (user) => {
    setIsNewChatModalVisible(false);
    setNewChatSearch('');
    openChatWith(user);
  };

  // -------------------------------------------------------------
  // 0. شاشة بداية نظيفة وفورية بدون أي شعار
  // -------------------------------------------------------------
  if (isAppStarting) {
    return (
      <SafeAreaProvider>
        <View style={styles.splashContainer}>
          <StatusBar style="dark" />
        </View>
      </SafeAreaProvider>
    );
  }

  // -------------------------------------------------------------
  // 1. Écran d'authentification (Connexion / Inscription)
  // -------------------------------------------------------------
  if (!currentUser) {
    const AuthContainer = Platform.OS === 'ios' ? KeyboardAvoidingView : View;
    return (
      <SafeAreaProvider>
        <AuthContainer
          style={styles.authWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <StatusBar style="light" />
          <ScrollView
            ref={authScrollRef}
            contentContainerStyle={[
              styles.authScroll,
              isAuthKeyboardVisible && styles.authScrollKeyboard,
            ]}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.phoneMockup}>
              {/* En-tête graphique */}
              <View
                style={[
                  styles.headerGraphic,
                  isAuthKeyboardVisible && styles.headerGraphicKeyboard,
                ]}
                pointerEvents="box-none"
              >
                <View style={[styles.circleGold, isAuthKeyboardVisible && styles.circleGoldKeyboard]} pointerEvents="none" />
                <View style={[styles.circleMint, isAuthKeyboardVisible && styles.circleMintKeyboard]} pointerEvents="none" />
                <Text
                  style={[
                    styles.headerTitle,
                    isAuthKeyboardVisible && styles.headerTitleKeyboard,
                  ]}
                >
                  {isLogin
                    ? 'Connexion'
                    : isAuthKeyboardVisible
                      ? 'Créer un compte'
                      : 'Créer un\ncompte'}
                </Text>
              </View>

              {/* Formulaire */}
              <View
                style={[
                  styles.formCard,
                  isAuthKeyboardVisible && styles.formCardKeyboard,
                ]}
              >
                {/* مفتاح التبديل السلس العلوي بين تسجيل الدخول وإنشاء الحساب */}
                <View style={styles.authSegmentContainer}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.authSegmentTab,
                      isLogin && styles.authSegmentTabActive,
                    ]}
                    onPress={() => switchAuthMode(true)}
                  >
                    <Text
                      style={[
                        styles.authSegmentText,
                        isLogin && styles.authSegmentTextActive,
                      ]}
                    >
                      Connexion
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.authSegmentTab,
                      !isLogin && styles.authSegmentTabActive,
                    ]}
                    onPress={() => switchAuthMode(false)}
                  >
                    <Text
                      style={[
                        styles.authSegmentText,
                        !isLogin && styles.authSegmentTextActive,
                      ]}
                    >
                      Créer un compte
                    </Text>
                  </TouchableOpacity>
                </View>

                {!isLogin && (
                  <View style={styles.nameRow}>
                    <TextInput
                      style={[
                        styles.input,
                        styles.halfInput,
                        { marginRight: 8 },
                        isAuthKeyboardVisible && styles.inputCompact,
                      ]}
                      placeholder="Prénom"
                      placeholderTextColor="#9ca3af"
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                      returnKeyType="next"
                      onSubmitEditing={() => lastNameInputRef.current?.focus()}
                      blurOnSubmit={false}
                    />
                    <TextInput
                      ref={lastNameInputRef}
                      style={[
                        styles.input,
                        styles.halfInput,
                        { marginLeft: 8 },
                        isAuthKeyboardVisible && styles.inputCompact,
                      ]}
                      placeholder="Nom"
                      placeholderTextColor="#9ca3af"
                      value={lastName}
                      onChangeText={setLastName}
                      autoCapitalize="words"
                      returnKeyType="next"
                      onSubmitEditing={() => emailInputRef.current?.focus()}
                      blurOnSubmit={false}
                    />
                  </View>
                )}

                <TextInput
                  ref={emailInputRef}
                  style={[
                    styles.input,
                    !isLogin && { marginTop: 14 },
                    isAuthKeyboardVisible && styles.inputCompact,
                    isAuthKeyboardVisible && !isLogin && { marginTop: 12 },
                  ]}
                  placeholder="Adresse e-mail"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  blurOnSubmit={false}
                />

                <View style={[styles.passwordRow, isAuthKeyboardVisible && { marginTop: 12 }]}>
                  <TextInput
                    ref={passwordInputRef}
                    style={[
                      styles.input,
                      styles.passwordInput,
                      isAuthKeyboardVisible && styles.inputCompact,
                    ]}
                    placeholder="Mot de passe"
                    placeholderTextColor="#9ca3af"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType={isLogin ? 'go' : 'done'}
                    onSubmitEditing={handleAuthSubmit}
                  />
                  <TouchableOpacity
                    style={[styles.eyeBtn, isAuthKeyboardVisible && styles.eyeBtnCompact]}
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                  >
                    <EyeIcon visible={showPassword} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {authError ? (
                  <Text style={styles.authErrorText}>{authError}</Text>
                ) : null}

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[
                    styles.submitBtn,
                    isAuthKeyboardVisible && styles.submitBtnKeyboard,
                  ]}
                  onPress={handleAuthSubmit}
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {isLogin ? 'Se connecter' : 'Créer un compte'}
                    </Text>
                  )}
                </TouchableOpacity>

                {!isLogin ? (
                  <Text style={[styles.termsText, isAuthKeyboardVisible && { marginTop: 10 }]}>
                    En créant un compte, vous acceptez notre{' '}
                    <Text style={styles.linkText}>Politique de confidentialité</Text> et nos{' '}
                    <Text style={styles.linkText}>Conditions d'utilisation</Text>.
                  </Text>
                ) : (
                  <Pressable
                    style={[styles.forgotBtn, isAuthKeyboardVisible && { marginTop: 8 }]}
                    onPress={() =>
                      showAlert(
                        'Mot de passe oublié',
                        'Un lien de réinitialisation sera envoyé à votre adresse e-mail.',
                        [{ text: "D'accord" }],
                        { type: 'info' }
                      )
                    }
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.forgotText}>
                      Mot de passe oublié ? <Text style={styles.linkText}>Réinitialiser</Text>
                    </Text>
                  </Pressable>
                )}

                <View style={[styles.switchAuthRow, isAuthKeyboardVisible && { marginTop: 10 }]}>
                  <Text style={styles.switchPromptText}>
                    {isLogin ? 'Nouveau ici ? ' : 'Vous avez déjà un compte ? '}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => switchAuthMode(!isLogin)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={styles.switchActionBtn}
                  >
                    <Text style={styles.switchActionText}>
                      {isLogin ? 'Créer un compte' : 'Se connecter'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </AuthContainer>
        <CustomAlertModal alert={appAlert} onClose={closeAlert} />
      </SafeAreaProvider>
    );
  }

  // -------------------------------------------------------------
  // 2. الحسابات والإحصائيات لشاشات المهام والرسائل
  // -------------------------------------------------------------
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const totalUnreadCount = conversations.reduce(
    (sum, c) => sum + (c.unreadCount || 0),
    0
  );

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter !== 'All' && t.category !== taskFilter) return false;
    if (taskStatusFilter === 'pending' && t.completed) return false;
    if (taskStatusFilter === 'completed' && !t.completed) return false;
    return true;
  });

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <SafeAreaInsetsContext.Consumer>
        {(insets) => {
          const liveInsetsBottom = insets?.bottom || 0;
          // التحقق مما إذا كانت أزرار النظام السفلية (Back, Home, Recent) ظاهرة
          const isButtonNavPresent =
            hasBottomSystemButtons || liveInsetsBottom >= 36;
          // رفع شريط التنقل السفلي ليكون أعلى وأكثر وضوحاً وراحة عند الاستخدام
          const bottomNavOffset = isButtonNavPresent ? 38 : Math.max(liveInsetsBottom + 12, 28);
          const fabBtnOffset = bottomNavOffset + 76;
          const contentPaddingBottom = bottomNavOffset + 90;

          return (
            <SafeAreaView style={styles.mainAppContainer}>
              <StatusBar style="dark" />

              {activeScreen === 'tasks' ? (
                // ==========================================
                // 📋 1. شاشة إدارة المهام (Tasks Screen)
                // ==========================================
                <View style={styles.tasksContainer}>
                  {/* الرأس (Header) لشاشة المهام */}
                  <View style={styles.tasksHeader}>
                    {/* زر من الأعلى يحملني إلى صفحة profile */}
                    <TouchableOpacity
                      style={styles.profileHeaderBtn}
                      onPress={() => setIsProfileVisible(true)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.profileHeaderAvatar,
                          {
                            backgroundColor: getAvatarColor(
                              currentUser.name || currentUser.email
                            ),
                          },
                        ]}
                      >
                        <Text style={styles.profileHeaderAvatarLetter}>
                          {currentUser.name ? currentUser.name[0].toUpperCase() : '👤'}
                        </Text>
                      </View>
                      <View style={styles.profileHeaderTextWrap}>
                        <Text style={styles.profileHeaderGreeting}>Profil & Compte</Text>
                        <Text style={styles.profileHeaderName} numberOfLines={1}>
                          {currentUser.name || currentUser.email.split('@')[0]}
                        </Text>
                      </View>
                    </TouchableOpacity>


                  </View>

                  {/* محتوى شاشة المهام */}
                  <ScrollView
                    style={styles.tasksScrollArea}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                      styles.tasksScrollContent,
                      { paddingBottom: contentPaddingBottom },
                    ]}
                  >
                    {/* بطاقة الإحصائيات (Hero Productivity Card) */}
                    <View style={styles.heroCard}>
                      <View style={styles.heroCardTop}>
                        <View style={styles.heroCardTextCol}>
                          <View style={styles.heroCardBadgeRow}>
                            <View
                              style={[
                                styles.heroStatusDot,
                                progressPercent === 100 && totalTasks > 0 && styles.heroStatusDotSuccess,
                              ]}
                            />
                            <Text style={styles.heroCardBadge}>
                              {progressPercent === 100 && totalTasks > 0
                                ? 'Objectif atteint'
                                : 'Productivité du jour'}
                            </Text>
                          </View>
                          <Text style={styles.heroCardTitle} numberOfLines={2}>
                            {progressPercent === 100 && totalTasks > 0
                              ? 'Toutes les tâches terminées ! 🎉'
                              : `${pendingTasks} tâche${pendingTasks > 1 ? 's' : ''} en attente`}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.heroPercentCircle,
                            progressPercent === 100 && totalTasks > 0 && styles.heroPercentCircleSuccess,
                          ]}
                        >
                          <Text
                            style={[
                              styles.heroPercentText,
                              progressPercent === 100 && totalTasks > 0 && styles.heroPercentTextSuccess,
                            ]}
                          >
                            {progressPercent}%
                          </Text>
                          <Text style={styles.heroPercentLabel}>
                            {progressPercent === 100 && totalTasks > 0 ? 'Bravo' : 'Fait'}
                          </Text>
                        </View>
                      </View>

                      {/* شريط التقدم */}
                      <View style={styles.heroProgressBarBg}>
                        <View
                          style={[
                            styles.heroProgressBarFill,
                            progressPercent === 100 && totalTasks > 0 && styles.heroProgressBarFillSuccess,
                            {
                              width: `${Math.max(
                                progressPercent,
                                totalTasks > 0 ? 4 : 0
                              )}%`,
                            },
                          ]}
                        />
                      </View>

                      {/* الإحصائيات السريعة */}
                      <View style={styles.heroStatsRow}>
                        <View style={styles.heroStatItem}>
                          <Text style={styles.heroStatValue}>{totalTasks}</Text>
                          <Text style={styles.heroStatLabel}>Total</Text>
                        </View>
                        <View style={styles.heroStatDivider} />
                        <View style={styles.heroStatItem}>
                          <Text style={[styles.heroStatValue, pendingTasks > 0 && { color: '#f59e0b' }]}>
                            {pendingTasks}
                          </Text>
                          <Text style={styles.heroStatLabel}>En cours</Text>
                        </View>
                        <View style={styles.heroStatDivider} />
                        <View style={styles.heroStatItem}>
                          <Text style={[styles.heroStatValue, { color: '#10b981' }]}>
                            {completedTasks}
                          </Text>
                          <Text style={styles.heroStatLabel}>Terminées</Text>
                        </View>
                      </View>
                    </View>

                    {/* فئات المهام (Category Pills) */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.categoryPillsScroll}
                    >
                      {['All', 'Work', 'Personal', 'Design', 'Urgent'].map((cat) => {
                        const isSelected = taskFilter === cat;
                        return (
                          <TouchableOpacity
                            key={cat}
                            style={[
                              styles.categoryPill,
                              isSelected && styles.categoryPillActive,
                            ]}
                            onPress={() => setTaskFilter(cat)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.categoryPillText,
                                isSelected && styles.categoryPillTextActive,
                              ]}
                            >
                              {cat === 'All'
                                ? '⚡ Toutes'
                                : cat === 'Work'
                                  ? '💼 Travail'
                                  : cat === 'Personal'
                                    ? '👤 Personnel'
                                    : cat === 'Design'
                                      ? '🎨 Design'
                                      : '🔥 Urgent'}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* شريط تصفية الحالة: عنوان القسم والفلترة المنظمة */}
                    <View style={styles.sectionHeaderWrap}>
                      <View style={styles.sectionHeaderTitleRow}>
                        <Text style={styles.sectionHeaderTitle}>
                          {taskFilter === 'All'
                            ? 'Toutes les tâches'
                            : taskFilter === 'Work'
                              ? 'Tâches Travail'
                              : taskFilter === 'Personal'
                                ? 'Tâches Personnel'
                                : taskFilter === 'Design'
                                  ? 'Tâches Design'
                                  : 'Tâches Urgentes'}
                        </Text>
                        <View style={styles.taskCountBadge}>
                          <Text style={styles.taskCountBadgeText}>
                            {filteredTasks.length}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.segmentedControl}>
                        <TouchableOpacity
                          style={[
                            styles.segmentBtn,
                            taskStatusFilter === 'all' && styles.segmentBtnActive,
                          ]}
                          onPress={() => setTaskStatusFilter('all')}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.segmentBtnText,
                              taskStatusFilter === 'all' && styles.segmentBtnTextActive,
                            ]}
                          >
                            Toutes
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.segmentBtn,
                            taskStatusFilter === 'pending' && styles.segmentBtnActive,
                          ]}
                          onPress={() => setTaskStatusFilter('pending')}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.segmentBtnText,
                              taskStatusFilter === 'pending' && styles.segmentBtnTextActive,
                            ]}
                          >
                            En cours {pendingTasks > 0 ? `(${pendingTasks})` : ''}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.segmentBtn,
                            taskStatusFilter === 'completed' && styles.segmentBtnActive,
                          ]}
                          onPress={() => setTaskStatusFilter('completed')}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.segmentBtnText,
                              taskStatusFilter === 'completed' && styles.segmentBtnTextActive,
                            ]}
                          >
                            Terminées {completedTasks > 0 ? `(${completedTasks})` : ''}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* قائمة كروت المهام */}
                    {loadingTasks ? (
                      <ActivityIndicator
                        size="large"
                        color="#e11d48"
                        style={{ marginTop: 40 }}
                      />
                    ) : filteredTasks.length > 0 ? (
                      filteredTasks.map((item, index) => {
                        const categoryColors = {
                          Work: { bg: '#e0f2fe', text: '#0284c7' },
                          Personal: { bg: '#dcfce7', text: '#16a34a' },
                          Design: { bg: '#f3e8ff', text: '#9333ea' },
                          Urgent: { bg: '#ffe4e6', text: '#e11d48' },
                        }[item.category || 'Work'] || { bg: '#f1f5f9', text: '#64748b' };

                        const categoryLabel =
                          item.category === 'Work'
                            ? 'Travail'
                            : item.category === 'Personal'
                              ? 'Personnel'
                              : item.category === 'Design'
                                ? 'Design'
                                : item.category === 'Urgent'
                                  ? 'Urgent'
                                  : item.category || 'Travail';

                        const priorityLabel =
                          item.priority === 'High'
                            ? 'Haute'
                            : item.priority === 'Low'
                              ? 'Basse'
                              : 'Moyenne';

                        const priorityDotColor =
                          item.priority === 'High'
                            ? '#ef4444'
                            : item.priority === 'Low'
                              ? '#94a3b8'
                              : '#f59e0b';

                        return (
                          <View
                            key={item._id ? `${item._id}_${index}` : `task_${index}`}
                            style={[
                              styles.taskCard,
                              item.completed && styles.taskCardCompleted,
                            ]}
                          >
                            {/* زر تحديد المهمة (Checkbox) */}
                            <TouchableOpacity
                              style={[
                                styles.taskCheckBtn,
                                item.completed && styles.taskCheckBtnActive,
                              ]}
                              onPress={() => handleToggleTask(item)}
                              activeOpacity={0.7}
                            >
                              {item.completed && <CheckIcon color="#ffffff" size={13} />}
                            </TouchableOpacity>

                            {/* تفاصيل المهمة */}
                            <View style={styles.taskContentWrap}>
                              <Text
                                style={[
                                  styles.taskCardTitle,
                                  item.completed && styles.taskCardTitleDone,
                                ]}
                              >
                                {item.title}
                              </Text>

                              {item.description ? (
                                <Text
                                  style={[
                                    styles.taskCardDesc,
                                    item.completed && { color: '#cbd5e1' },
                                  ]}
                                  numberOfLines={2}
                                >
                                  {item.description}
                                </Text>
                              ) : null}

                              {/* شارات الفئة والأولوية والتاريخ */}
                              <View style={styles.taskMetaRow}>
                                <View
                                  style={[
                                    styles.taskTagPill,
                                    { backgroundColor: categoryColors.bg },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.taskTagText,
                                      { color: categoryColors.text },
                                    ]}
                                  >
                                    {categoryLabel}
                                  </Text>
                                </View>

                                <View style={styles.taskPriorityPill}>
                                  <View
                                    style={[
                                      styles.taskPriorityDot,
                                      { backgroundColor: priorityDotColor },
                                    ]}
                                  />
                                  <Text style={styles.taskPriorityText}>
                                    {priorityLabel}
                                  </Text>
                                </View>

                                {item.dueDate ? (
                                  <View style={styles.taskDueDatePill}>
                                    <CalendarIcon color="#94a3b8" size={12} />
                                    <Text style={styles.taskDueDateText}>
                                      {item.dueDate}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>

                            {/* أزرار الإجراءات (تعديل وحذف) */}
                            <View style={styles.taskActionsCol}>
                              <TouchableOpacity
                                style={styles.taskActionIconBtn}
                                onPress={() => openEditTaskModal(item)}
                                activeOpacity={0.7}
                              >
                                <EditIcon color="#64748b" size={15} />
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.taskActionIconBtn,
                                  { backgroundColor: '#fff1f2' },
                                ]}
                                onPress={() => handleDeleteTask(item)}
                                activeOpacity={0.7}
                              >
                                <TrashIcon color="#e11d48" size={15} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })
                    ) : (
                      <View style={styles.taskEmptyContainer}>
                        <View style={styles.taskEmptyCircle}>
                          <TaskIcon color="#e11d48" size={36} />
                        </View>
                        <Text style={styles.taskEmptyTitle}>Aucune tâche trouvée</Text>
                        <Text style={styles.taskEmptyDesc}>
                          {taskFilter !== 'All'
                            ? `Aucune tâche dans cette catégorie. Appuyez sur "+ Nouvelle tâche" pour en ajouter une !`
                            : 'Votre liste de tâches est vide. Restez organisé et créez votre première tâche !'}
                        </Text>
                        <TouchableOpacity
                          style={styles.taskEmptyAddBtn}
                          onPress={openNewTaskModal}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.taskEmptyAddText}>+ Créer une tâche</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </ScrollView>

                  {/* زر إضافة مهمة جديدة عائم (Floating Action Button) */}
                  <TouchableOpacity
                    style={[styles.fabBtn, { bottom: fabBtnOffset }]}
                    onPress={openNewTaskModal}
                    activeOpacity={0.85}
                  >
                    <PlusIcon color="#ffffff" />
                    <Text style={styles.fabBtnText}>Nouvelle tâche</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // ==========================================
                // 💬 2. شاشة الرسائل والمحادثات (Messages Screen)
                // ==========================================
                <View style={styles.messagesContainer}>
                  {/* الرأس (Header) مع زر الرجوع < إلى المهام وزر + لبدء محادثة جديدة */}
                  <View style={styles.messagesHeader}>
                    <TouchableOpacity
                      style={styles.headerCircleBtn}
                      onPress={() => setActiveScreen('tasks')}
                      activeOpacity={0.7}
                    >
                      <ChevronLeftIcon color="#111827" />
                    </TouchableOpacity>

                    <Text style={styles.headerMessagesTitle}>Messages</Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {isAdmin && (
                        <TouchableOpacity
                          style={styles.adminHeaderBadgeBtn}
                          onPress={() => {
                            setIsAdminModalVisible(true);
                            fetchAdminUsers();
                          }}
                          activeOpacity={0.8}
                        >
                          <ShieldIcon color="#ffffff" size={14} />
                          <Text style={styles.adminHeaderBadgeText}>Admin</Text>
                        </TouchableOpacity>
                      )}

                      {/* زر + لفتح صفحة البحث عن أشخاص جدد ومراسلتهم */}
                      <TouchableOpacity
                        style={styles.headerCircleBtn}
                        onPress={() => {
                          setIsNewChatModalVisible(true);
                          fetchAllUsers();
                        }}
                        activeOpacity={0.7}
                      >
                        <PlusIcon color="#111827" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* شريط البحث (Search..) في منتصف الصفحة بأناقة */}
                  <View style={styles.searchBarWrapper}>
                    <View style={styles.searchBarContainer}>
                      <SearchIcon color="#9ca3af" />
                      <TextInput
                        style={styles.searchBarInput}
                        placeholder="Rechercher..."
                        placeholderTextColor="#9ca3af"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                      />
                      {searchQuery ? (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                          <Text
                            style={{
                              fontSize: 14,
                              color: '#9ca3af',
                              paddingHorizontal: 4,
                            }}
                          >
                            ✕
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {/* نتائج البحث المباشرة كقائمة منسدلة عائمة */}
                    {searchQuery.trim().length > 0 && (
                      <View style={styles.searchResultsDropdown}>
                        <Text style={styles.searchDropdownTitle}>Utilisateurs inscrits :</Text>
                        {searchLoading ? (
                          <ActivityIndicator
                            size="small"
                            color="#e11d48"
                            style={{ margin: 10 }}
                          />
                        ) : searchResults.length > 0 ? (
                          <ScrollView
                            style={{ maxHeight: 240 }}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                          >
                            {searchResults.map((user) => (
                              <TouchableOpacity
                                key={user._id}
                                style={styles.searchDropdownItem}
                                onPress={() => {
                                  openChatWith(user);
                                  setSearchQuery('');
                                }}
                              >
                                <View
                                  style={[
                                    styles.avatarBadgeWrap,
                                    {
                                      backgroundColor: getAvatarColor(
                                        user.name || user.email
                                      ),
                                    },
                                  ]}
                                >
                                  <Text style={styles.avatarLetter}>
                                    {(user.name || user.email)[0].toUpperCase()}
                                  </Text>
                                  {Boolean(user.isOnline) && <View style={styles.onlineDot} />}
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                  <Text style={styles.contactItemName}>
                                    {user.name || user.email.split('@')[0]}
                                  </Text>
                                  <Text style={styles.contactItemMsg}>{user.email}</Text>
                                </View>
                                <View style={styles.chatActionPill}>
                                  <Text style={styles.chatActionPillText}>Discuter</Text>
                                </View>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        ) : (
                          <Text style={styles.noResultsText}>Aucun utilisateur trouvé</Text>
                        )}
                      </View>
                    )}
                  </View>

                  {/* قائمة المحادثات والرسائل الواردة مع دعم التمرير للأسفل للتحديث */}
                  <View style={styles.conversationsListWrap}>
                    {loadingConversations && conversations.length === 0 ? (
                      <ActivityIndicator
                        size="large"
                        color="#e11d48"
                        style={{ marginTop: 40 }}
                      />
                    ) : (
                      <FlatList
                        data={conversations}
                        keyExtractor={(item, index) => (item?.contact?._id ? `${item.contact._id}_${index}` : `conv_${index}`)}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={[
                          { paddingBottom: contentPaddingBottom },
                          conversations.length === 0 && { flexGrow: 1, justifyContent: 'center' },
                        ]}
                        refreshControl={
                          <RefreshControl
                            refreshing={refreshingConversations}
                            onRefresh={handleRefreshConversations}
                            colors={['#e11d48']}
                            tintColor="#e11d48"
                            progressBackgroundColor="#ffffff"
                          />
                        }
                        renderItem={({ item }) => {
                          const avatarBg = getAvatarColor(
                            item.contact.name || item.contact.email
                          );
                          const unreadCount = item.unreadCount || 0;

                          return (
                            <TouchableOpacity
                              style={styles.chatListItem}
                              onPress={() => openChatWith(item.contact)}
                              onLongPress={() => handleDeleteAllMessages(item.contact)}
                              delayLongPress={350}
                              activeOpacity={0.7}
                            >
                              {/* الأفاتار مع النقطة الخضراء */}
                              <View
                                style={[
                                  styles.avatarBadgeWrap,
                                  { backgroundColor: avatarBg },
                                ]}
                              >
                                <Text style={styles.avatarLetter}>
                                  {item.contact.name
                                    ? item.contact.name[0].toUpperCase()
                                    : '👤'}
                                </Text>
                                {Boolean(item.contact?.isOnline) && <View style={styles.onlineDot} />}
                              </View>

                              {/* الاسم وآخر رسالة */}
                              <View style={styles.chatItemCenter}>
                                <Text style={styles.contactItemName} numberOfLines={1}>
                                  {item.contact.name}
                                </Text>
                                <Text
                                  style={styles.contactItemMsg}
                                  numberOfLines={1}
                                  ellipsizeMode="tail"
                                >
                                  {formatConversationPreview(item, currentUser?.id || currentUser?._id)}
                                </Text>
                              </View>

                              {/* التوقيت والحالة */}
                              <View style={styles.chatItemRight}>
                                <Text style={styles.chatItemTime}>
                                  {new Date(item.lastMessageDate).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </Text>

                                <View style={styles.chatItemStatus}>
                                  {unreadCount > 0 ? (
                                    <View style={styles.unreadCountBadge}>
                                      <Text style={styles.unreadCountText}>
                                        {unreadCount}
                                      </Text>
                                    </View>
                                  ) : item.isLastMessageMine ? (
                                    item.lastMessageRead ? (
                                      <View style={styles.convReadBadge}>
                                        <DoubleCheckIcon size={14} color="#2563eb" />
                                      </View>
                                    ) : (
                                      <View style={styles.convUnreadBadge}>
                                        <SingleCheckIcon size={13} color="#94a3b8" />
                                      </View>
                                    )
                                  ) : null}
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        }}
                        ListEmptyComponent={
                          <View style={styles.emptyStateContainer}>
                            <View style={styles.emptyIconCircle}>
                              <EmptyMessagesIcon size={56} color="#0f1117" />
                            </View>
                            <Text style={styles.emptyStateTitle}>Aucun message pour le moment</Text>
                            <Text style={styles.emptyStateDesc}>
                              Recherchez un utilisateur dans la barre ci-dessus pour démarrer une discussion !
                            </Text>
                            <Text style={styles.emptyStatePullHint}>
                              ↓ Glissez vers le bas pour actualiser
                            </Text>
                          </View>
                        }
                      />
                    )}
                  </View>
                </View>
              )}

              {/* ==========================================
          🔘 شريط التنقل السفلي الفاخر (Bottom Bar)
          ========================================== */}
              {!activeChatUser && (
                <View style={[styles.bottomNavContainer, { bottom: bottomNavOffset }]}>
                  {/* زر المهام */}
                  <TouchableOpacity
                    style={[
                      styles.bottomNavItem,
                      activeScreen === 'tasks' &&
                      !isProfileVisible &&
                      styles.bottomNavItemActive,
                    ]}
                    onPress={() => {
                      setIsProfileVisible(false);
                      setActiveScreen('tasks');
                    }}
                    activeOpacity={0.7}
                  >
                    <TaskIcon
                      color={
                        activeScreen === 'tasks' && !isProfileVisible
                          ? '#e11d48'
                          : '#9ca3af'
                      }
                      size={22}
                    />
                    <Text
                      style={[
                        styles.bottomNavText,
                        activeScreen === 'tasks' &&
                        !isProfileVisible &&
                        styles.bottomNavTextActive,
                      ]}
                    >
                      Tâches
                    </Text>
                  </TouchableOpacity>



                  {/* زر الملف الشخصي */}
                  <TouchableOpacity
                    style={[
                      styles.bottomNavItem,
                      isProfileVisible && styles.bottomNavItemActive,
                    ]}
                    onPress={() => setIsProfileVisible(true)}
                    activeOpacity={0.7}
                  >
                    <UserIcon
                      color={isProfileVisible ? '#e11d48' : '#9ca3af'}
                      size={22}
                    />
                    <Text
                      style={[
                        styles.bottomNavText,
                        isProfileVisible && styles.bottomNavTextActive,
                      ]}
                    >
                      Profil
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ==========================================
          👤 3. صفحة الملف الشخصي (Profile Modal)
          ========================================== */}
              <Modal
                visible={isProfileVisible}
                animationType="slide"
                statusBarTranslucent={true}
                hardwareAccelerated={true}
                onRequestClose={() => setIsProfileVisible(false)}
              >
                <SafeAreaView style={styles.profileScreenContainer}>
                  <StatusBar style="dark" />

                  {/* رأس صفحة الملف الشخصي */}
                  <View style={styles.profileModalHeader}>
                    <TouchableOpacity
                      style={styles.headerCircleBtn}
                      onPress={() => setIsProfileVisible(false)}
                      activeOpacity={0.7}
                    >
                      <ChevronLeftIcon color="#111827" />
                    </TouchableOpacity>

                    <Text style={styles.profileModalTitle}>Mon Profil</Text>

                    <TouchableOpacity
                      style={styles.headerCircleBtn}
                      onPress={handleLogout}
                      activeOpacity={0.7}
                    >
                      <LogoutIcon color="#ef4444" size={18} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.profileScrollContent}
                  >
                    {/* بطاقة المستخدم الكبيرة والأفاتار */}
                    <View style={styles.profileHeroCard}>
                      <TouchableOpacity
                        style={[
                          styles.profileHeroAvatar,
                          {
                            backgroundColor: getAvatarColor(
                              currentUser.name || currentUser.email
                            ),
                          },
                        ]}
                        activeOpacity={0.8}
                        onPress={() => {
                          setIsProfileVisible(false);
                          setActiveScreen('messages');
                        }}
                      >
                        <Text style={styles.profileHeroAvatarText}>
                          {currentUser.name ? currentUser.name[0].toUpperCase() : '👤'}
                        </Text>
                        <View style={styles.profileOnlineDot} />
                        <View style={styles.profileAvatarChatBadge}>
                          <ChatPlusIcon color="#ffffff" size={13} />
                        </View>
                      </TouchableOpacity>

                      <Text style={styles.profileHeroName}>
                        {currentUser.name || 'Profil Utilisateur'}
                      </Text>
                      <Text style={styles.profileHeroEmail}>{currentUser.email}</Text>


                    </View>

                    {/* بطاقة معلومات الحساب التفصيلية */}
                    <View style={styles.profileInfoSection}>
                      <Text style={styles.profileSectionTitle}>
                        Informations du compte
                      </Text>

                      <View style={styles.profileInfoCard}>
                        <View style={styles.profileInfoRow}>
                          <Text style={styles.profileInfoLabel}>Nom complet</Text>
                          <Text style={styles.profileInfoValue}>
                            {currentUser.name || 'Non renseigné'}
                          </Text>
                        </View>

                        <View style={styles.profileInfoDivider} />

                        <View style={styles.profileInfoRow}>
                          <Text style={styles.profileInfoLabel}>Adresse e-mail</Text>
                          <Text style={styles.profileInfoValue}>
                            {currentUser.email}
                          </Text>
                        </View>




                      </View>
                    </View>

                    {/* أزرار الإجراءات */}
                    <View style={styles.profileActionsWrap}>
                      <TouchableOpacity
                        style={styles.profileLogoutBtn}
                        activeOpacity={0.8}
                        onPress={handleLogout}
                      >
                        <LogoutIcon color="#ef4444" size={18} />
                        <Text style={styles.profileLogoutText}>Se déconnecter</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </SafeAreaView>
              </Modal>

              {/* ==========================================
          📝 4. نافذة إنشاء / تعديل مهمة (Task Modal)
          ========================================== */}
              <Modal
                visible={isTaskModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsTaskModalVisible(false)}
              >
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                  style={styles.taskModalBackdrop}
                >
                  <View style={styles.taskModalCard}>
                    {/* رأس النافذة */}
                    <View style={styles.taskModalHeader}>
                      <Text style={styles.taskModalTitle}>
                        {editingTask ? 'Modifier la tâche' : 'Nouvelle tâche'}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setIsTaskModalVisible(false)}
                        style={styles.taskModalCloseBtn}
                      >
                        <Text
                          style={{ fontSize: 16, color: '#9ca3af', fontWeight: 'bold' }}
                        >
                          ✕
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                      {/* حقل العنوان */}
                      <Text style={styles.taskInputLabel}>Titre de la tâche *</Text>
                      <TextInput
                        style={styles.taskInputText}
                        placeholder="ex. Concevoir l'interface mobile"
                        placeholderTextColor="#9ca3af"
                        value={taskTitle}
                        onChangeText={setTaskTitle}
                      />

                      {/* حقل الوصف */}
                      <Text style={styles.taskInputLabel}>Description (facultatif)</Text>
                      <TextInput
                        style={[
                          styles.taskInputText,
                          { height: 75, textAlignVertical: 'top' },
                        ]}
                        placeholder="Ajouter des détails, notes ou liens..."
                        placeholderTextColor="#9ca3af"
                        value={taskDesc}
                        onChangeText={setTaskDesc}
                        multiline
                      />

                      {/* اختيار الفئة Category */}
                      <Text style={styles.taskInputLabel}>Catégorie</Text>
                      <View style={styles.taskOptionsRow}>
                        {[
                          { key: 'Work', label: 'Travail' },
                          { key: 'Personal', label: 'Personnel' },
                          { key: 'Design', label: 'Design' },
                          { key: 'Urgent', label: 'Urgent' },
                        ].map((cat) => (
                          <TouchableOpacity
                            key={cat.key}
                            style={[
                              styles.taskOptionPill,
                              taskCategory === cat.key && styles.taskOptionPillActive,
                            ]}
                            onPress={() => setTaskCategory(cat.key)}
                          >
                            <Text
                              style={[
                                styles.taskOptionPillText,
                                taskCategory === cat.key && styles.taskOptionPillTextActive,
                              ]}
                            >
                              {cat.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* اختيار الأولوية Priority */}
                      <Text style={styles.taskInputLabel}>Priorité</Text>
                      <View style={styles.taskOptionsRow}>
                        {[
                          { key: 'High', label: '🔴 Haute' },
                          { key: 'Medium', label: '🟡 Moyenne' },
                          { key: 'Low', label: '⚪ Basse' },
                        ].map((p) => (
                          <TouchableOpacity
                            key={p.key}
                            style={[
                              styles.taskOptionPill,
                              taskPriority === p.key && styles.taskOptionPillActive,
                            ]}
                            onPress={() => setTaskPriority(p.key)}
                          >
                            <Text
                              style={[
                                styles.taskOptionPillText,
                                taskPriority === p.key && styles.taskOptionPillTextActive,
                              ]}
                            >
                              {p.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* حقل تاريخ الاستحقاق Due Date */}
                      <Text style={styles.taskInputLabel}>Date d'échéance (facultatif)</Text>
                      <TextInput
                        style={styles.taskInputText}
                        placeholder="ex. Demain 17h, Vendredi..."
                        placeholderTextColor="#9ca3af"
                        value={taskDueDate}
                        onChangeText={setTaskDueDate}
                      />

                      {/* أزرار الحفظ والإلغاء */}
                      <View style={styles.taskModalBtnRow}>
                        <TouchableOpacity
                          style={styles.taskModalCancelBtn}
                          onPress={() => setIsTaskModalVisible(false)}
                        >
                          <Text style={styles.taskModalCancelText}>Annuler</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.taskModalSaveBtn}
                          onPress={handleSaveTask}
                          disabled={savingTask}
                          activeOpacity={0.8}
                        >
                          {savingTask ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Text style={styles.taskModalSaveText}>
                              {editingTask ? 'Enregistrer' : 'Créer la tâche'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </ScrollView>
                  </View>
                </KeyboardAvoidingView>
              </Modal>

              {/* ------------------------------------------------------------- */}
              {/* 3. نافذة المحادثة (الجهة اليمنى من الصورة - Chat View)         */}
              {/* ------------------------------------------------------------- */}
              <Modal
                visible={activeChatUser !== null}
                animationType="slide"
                statusBarTranslucent={false}
                hardwareAccelerated={true}
                onRequestClose={() => {
                  if (reactionTargetMessage) {
                    handleCloseReactionOverlay();
                    return;
                  }
                  setActiveChatUser(null);
                  setReplyingToMessage(null);
                  setVisibleTimeMessageIds(new Set());
                  fetchConversations();
                }}
              >
                <View style={styles.chatModalRoot}>
                  <SafeAreaView style={styles.chatScreenContainer} edges={['top', 'bottom', 'left', 'right']}>
                    <StatusBar style="dark" />

                    <KeyboardAvoidingView
                      style={styles.chatKeyboardAvoidingContainer}
                      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                    >

                      {/* رأس نافذة المحادثة (عادي أو شريط تحديد الرسائل) */}
                      {selectedMessageIds.length > 0 ? (
                        <View style={[styles.chatScreenHeader, styles.selectionHeader]}>
                          <TouchableOpacity
                            style={styles.headerCircleBtn}
                            onPress={() => {
                              setSelectedMessageIds([]);
                              setReactionTargetMessage(null);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.cancelSelectionIcon}>✕</Text>
                          </TouchableOpacity>

                          <View style={styles.chatHeaderCenter}>
                            <Text style={styles.selectionTitleText}>
                              {selectedMessageIds.length} sélectionné{selectedMessageIds.length > 1 ? 's' : ''}
                            </Text>

                          </View>

                          {/* أزرار الإجراءات للرسائل المحددة */}
                          <View style={styles.selectionActionsRow}>
                            {/* زر نسخ الرسالة يظهر فقط عند تحديد رسالة واحدة بتصميم ذهبي ملكي */}
                            {selectedMessageIds.length === 1 && (
                              <TouchableOpacity
                                style={styles.copySelectedHeaderBtn}
                                onPress={handleCopySelectedMessage}
                                activeOpacity={0.8}
                              >
                                <CopyIcon color="#0f1117" size={15} />
                                <Text style={styles.copySelectedHeaderBtnText}>Copier</Text>
                              </TouchableOpacity>
                            )}

                            {/* زر حذف الرسائل المحددة */}
                            <TouchableOpacity
                              style={styles.deleteSelectedHeaderBtn}
                              onPress={handleDeleteSelectedMessages}
                              activeOpacity={0.8}
                            >
                              <TrashIcon color="#ffffff" size={16} />
                              <Text style={styles.deleteSelectedHeaderBtnText}>Supprimer</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.chatScreenHeader}>
                          <TouchableOpacity
                            style={styles.headerCircleBtn}
                            onPress={() => {
                              setActiveChatUser(null);
                              setSelectedMessageIds([]);
                              setReplyingToMessage(null);
                              setVisibleTimeMessageIds(new Set());
                              fetchConversations();
                            }}
                            activeOpacity={0.7}
                          >
                            <ChevronLeftIcon color="#334155" />
                          </TouchableOpacity>

                          <View style={styles.chatHeaderProfileWrap}>
                            <View style={styles.chatHeaderAvatarWrap}>
                              <View
                                style={[
                                  styles.chatHeaderAvatar,
                                  {
                                    backgroundColor: getAvatarColor(
                                      activeChatUser?.name || 'User'
                                    ),
                                  },
                                ]}
                              >
                                <Text style={styles.chatHeaderAvatarLetter}>
                                  {activeChatUser?.name
                                    ? activeChatUser.name[0].toUpperCase()
                                    : '👤'}
                                </Text>
                              </View>
                              {Boolean(activeChatUser?.isOnline) && (
                                <View style={styles.chatHeaderOnlineDot} />
                              )}
                            </View>
                            <View style={styles.chatHeaderMetaWrap}>
                              <Text style={styles.chatHeaderName} numberOfLines={1}>
                                {activeChatUser?.name || 'Messages'}
                              </Text>
                              <View style={styles.chatHeaderStatusRow}>
                                {Boolean(activeChatUser?.isOnline) && (
                                  <View style={styles.chatHeaderStatusMiniDot} />
                                )}
                                <Text
                                  style={[
                                    styles.chatHeaderStatus,
                                    activeChatUser?.isOnline && styles.chatHeaderStatusOnline,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {activeChatUser?.isOnline ? 'En ligne' : 'Hors ligne'}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* زر في القسم العلوي لحذف المحادثة بتصميم متناسق وأنيق */}
                          <TouchableOpacity
                            style={styles.deleteChatHeaderBtn}
                            onPress={() => handleDeleteAllMessages(activeChatUser)}
                            activeOpacity={0.7}
                          >
                            <TrashIcon color="#64748b" size={18} />
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* شريط الرسائل */}
                      {loadingMessages ? (
                        <ActivityIndicator
                          size="large"
                          color="#0f1117"
                          style={{ flex: 1, justifyContent: 'center' }}
                        />
                      ) : (
                        <FlatList
                          ref={chatFlatListRef}
                          data={messages}
                          keyExtractor={(item, index) => (item?._id ? `${item._id}_${index}` : `msg_${index}`)}
                          style={styles.chatMessagesFlatList}
                          contentContainerStyle={styles.messagesStream}
                          showsVerticalScrollIndicator={false}
                          keyboardShouldPersistTaps="always"
                          keyboardDismissMode="none"
                          onTouchEnd={() => {
                            longPressGestureActiveRef.current = false;
                            longPressReleasedAtRef.current = Date.now();
                          }}
                          onScrollBeginDrag={() => {
                            isScrollingChatRef.current = true;
                            if (reactionTargetMessage) {
                              setReactionTargetMessage(null);
                            }
                          }}
                          onScrollEndDrag={() => {
                            setTimeout(() => {
                              isScrollingChatRef.current = false;
                            }, 100);
                          }}
                          onMomentumScrollEnd={() => {
                            isScrollingChatRef.current = false;
                          }}
                          refreshControl={
                            <RefreshControl
                              refreshing={refreshingMessages}
                              onRefresh={handleRefreshMessages}
                              colors={['#0f1117']}
                              tintColor="#0f1117"
                            />
                          }
                          onScroll={({ nativeEvent }) => {
                            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                            const paddingToBottom = 80;
                            const isAtBottom =
                              layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
                            shouldAutoScrollRef.current = isAtBottom;
                          }}
                          scrollEventThrottle={32}
                          onLayout={() => {
                            if (selectedMessageIds.length > 0) return;
                            if (!hasDoneInitialChatScrollRef.current) {
                              hasDoneInitialChatScrollRef.current = true;
                              chatFlatListRef.current?.scrollToEnd({ animated: false });
                            }
                          }}
                          onContentSizeChange={() => {
                            if (selectedMessageIds.length > 0) return;
                            if (shouldAutoScrollRef.current) {
                              chatFlatListRef.current?.scrollToEnd({ animated: true });
                            }
                          }}
                          onScrollToIndexFailed={(info) => {
                            try {
                              chatFlatListRef.current?.scrollToOffset({
                                offset: Math.max(0, info.averageItemLength * info.index - 80),
                                animated: true,
                              });
                            } catch (e) { }
                            setTimeout(() => {
                              if (messages && messages.length > info.index) {
                                try {
                                  chatFlatListRef.current?.scrollToIndex({
                                    index: info.index,
                                    animated: true,
                                    viewPosition: 0.5,
                                  });
                                } catch (e) { }
                              }
                            }, 120);
                          }}
                          renderItem={({ item, index }) => {
                            const isMe =
                              item.sender._id === currentUser.id ||
                              item.sender === currentUser.id;

                            const timeStr = new Date(item.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            });

                            // استخراج النص النظيف والرسالة المردود عليها بذكاء تام
                            const { cleanContent, replyTo: replyData } = parseMessageData(item);
                            const hasImage = Boolean(item.imageUrl);
                            const hasVideo = Boolean(item.videoUrl);
                            const hasMedia = hasImage || hasVideo;
                            const hasText = Boolean(cleanContent && cleanContent.trim().length > 0);
                            const isSelected = selectedMessageIds.some(
                              (id) => String(id) === String(item._id)
                            );
                            const isTimeVisible = visibleTimeMessageIds.has(item._id);

                            return (
                              <SwipeableMessageRow
                                key={item?._id ? `${item._id}_${index}` : `row_${index}`}
                                onSwipeReply={() => handleInitiateReply(item)}
                                disabled={selectedMessageIds.length > 0 || Boolean(reactionTargetMessage)}
                                isHighlighted={highlightedMessageId === item._id}
                              >
                                {isMe ? (
                                  // رسالتي باللون الوردي المائل للأحمر (Crimson / Coral Red)
                                  <TouchableOpacity
                                    activeOpacity={0.85}
                                    delayLongPress={220}
                                    onLongPress={(e) => handleLongPressMessage(item, e)}
                                    onPressOut={() => {
                                      longPressGestureActiveRef.current = false;
                                      longPressReleasedAtRef.current = Date.now();
                                    }}
                                    onPress={() => {
                                      lastMessageTappedAtRef.current = Date.now();
                                      if (selectedMessageIds.length > 0) {
                                        // حماية الرسالة الحالية فقط من نقرة رفع الإصبع
                                        if (
                                          reactionTargetMessage &&
                                          String(reactionTargetMessage._id || reactionTargetMessage.id) === String(item._id) &&
                                          (justTriggeredLongPressRef.current || Date.now() - overlayMountedAtRef.current < 450)
                                        ) {
                                          justTriggeredLongPressRef.current = false;
                                          return;
                                        }
                                        justTriggeredLongPressRef.current = false;
                                        handleToggleSelectMessage(item._id);
                                        return;
                                      }
                                      if (Date.now() - lastLinkPressTimeRef.current < 600) {
                                        return;
                                      }
                                      toggleMessageTime(item._id);
                                    }}
                                    style={[
                                      styles.myMessageBlock,
                                      isSelected && styles.messageBlockSelected,
                                      Boolean(messageReactions[item._id]) && styles.messageBlockWithReaction,
                                    ]}
                                  >
                                    <View style={styles.messageWithCheckboxRow}>
                                      {selectedMessageIds.length > 0 && (
                                        <View
                                          style={[
                                            styles.messageSelectCheckbox,
                                            isSelected && styles.messageSelectCheckboxActive,
                                          ]}
                                        >
                                          {isSelected && <CheckIcon color="#ffffff" size={12} />}
                                        </View>
                                      )}
                                      {/* شارة حالة القراءة الفاخرة أمام الرسالة مباشرة */}
                                      <View style={styles.statusReceiptOuter}>
                                        {item.read ? (
                                          <View style={styles.receiptBadgeRead}>
                                            <DoubleCheckIcon size={12} color="#2563eb" />
                                          </View>
                                        ) : (
                                          <View style={styles.receiptBadgeUnread}>
                                            <SingleCheckIcon size={11} color="#94a3b8" />
                                          </View>
                                        )}
                                      </View>
                                      <View
                                        style={[
                                          styles.myBubble,
                                          hasMedia && !hasText && !replyData && styles.bubbleImageOnly,
                                          hasMedia && hasText && !replyData && styles.bubbleImageWithCaption,
                                          Boolean(replyData) && styles.bubbleWithReply,
                                          isSelected && styles.myBubbleSelected,
                                          Boolean(messageReactions[item._id]) && styles.bubbleWithReaction,
                                        ]}
                                      >
                                        {/* اقتباس الرسالة المردود عليها بتصميم احترافي فخم فوق الإجابة بدون اسم الشخص */}
                                        {replyData && (
                                          <TouchableOpacity
                                            activeOpacity={0.75}
                                            onPress={() => {
                                              lastMessageTappedAtRef.current = Date.now();
                                              if (selectedMessageIds.length > 0) {
                                                handleToggleSelectMessage(item._id);
                                                return;
                                              }
                                              handlePressReplyQuote(replyData, item._id);
                                            }}
                                            style={styles.myBubbleReplyQuote}
                                          >
                                            <View style={styles.myBubbleReplyQuoteLine} />
                                            <View style={styles.bubbleReplyQuoteContent}>
                                              <Text style={styles.myBubbleReplyQuoteSnippet} numberOfLines={2}>
                                                {replyData.imageUrl
                                                  ? (replyData.content ? `📷 ${replyData.content}` : '📷 Photo')
                                                  : replyData.videoUrl
                                                    ? (replyData.content ? `🎥 ${replyData.content}` : '🎥 Vidéo')
                                                    : replyData.content}
                                              </Text>
                                            </View>
                                            {Boolean(replyData.imageUrl) ? (
                                              <Image
                                                source={{ uri: replyData.imageUrl }}
                                                style={styles.bubbleReplyQuoteThumb}
                                                resizeMode="cover"
                                              />
                                            ) : Boolean(replyData.videoUrl) ? (
                                              <View style={[styles.bubbleReplyQuoteThumb, styles.bubbleReplyQuoteVideoThumb]}>
                                                <Text style={{ fontSize: 13 }}>🎥</Text>
                                              </View>
                                            ) : null}
                                          </TouchableOpacity>
                                        )}
                                        {hasImage && (
                                          <ChatImage
                                            uri={item.imageUrl}
                                            onPress={() => {
                                              lastMessageTappedAtRef.current = Date.now();
                                              if (selectedMessageIds.length > 0) {
                                                handleToggleSelectMessage(item._id);
                                                return;
                                              }
                                              setPreviewImage(item.imageUrl);
                                            }}
                                            onLongPress={(e) => handleLongPressMessage(item, e)}
                                            hasText={hasText}
                                          />
                                        )}
                                        {hasVideo && (
                                          <View style={styles.bubbleMediaWrapper}>
                                            <ChatVideo uri={item.videoUrl} hasText={hasText} />
                                            {selectedMessageIds.length > 0 && (
                                              <TouchableOpacity
                                                style={StyleSheet.absoluteFillObject}
                                                onPress={() => handleToggleSelectMessage(item._id)}
                                                activeOpacity={0.7}
                                              />
                                            )}
                                          </View>
                                        )}
                                        {hasText && (
                                          <MessageContentWithLinks
                                            content={cleanContent}
                                            baseStyle={
                                              hasMedia
                                                ? styles.bubbleCaptionText
                                                : replyData
                                                  ? styles.bubbleReplyAnswerText
                                                  : styles.myBubbleText
                                            }
                                            linkStyle={styles.myBubbleLink}
                                            onPressUrl={(url) => {
                                              lastMessageTappedAtRef.current = Date.now();
                                              if (selectedMessageIds.length > 0) {
                                                handleToggleSelectMessage(item._id);
                                                return;
                                              }
                                              handleOpenUrl(url);
                                            }}
                                          />
                                        )}
                                        {/* شارة تفاعل الإيموجي الأنيقة على الرسالة */}
                                        {Boolean(messageReactions[item._id]) && (
                                          <TouchableOpacity
                                            activeOpacity={0.8}
                                            delayLongPress={220}
                                            onLongPress={(e) => handleLongPressMessage(item, e)}
                                            onPress={(e) => {
                                              lastMessageTappedAtRef.current = Date.now();
                                              if (selectedMessageIds.length > 0) {
                                                handleToggleSelectMessage(item._id);
                                                return;
                                              }
                                              handleLongPressMessage(item, e);
                                            }}
                                            style={[styles.bubbleReactionBadge, styles.myBubbleReactionBadge]}
                                          >
                                            <Text style={styles.bubbleReactionBadgeEmoji}>
                                              {messageReactions[item._id]}
                                            </Text>
                                          </TouchableOpacity>
                                        )}
                                      </View>
                                    </View>
                                    {/* يظهر الوقت وحالة القراءة عند النقر على الرسالة */}
                                    {isTimeVisible && (
                                      <View style={styles.myMessageTimeRow}>
                                        <Text style={styles.myMessageTime}>{timeStr}</Text>
                                        <View style={styles.myMessageTimeDot} />
                                        <View
                                          style={[
                                            styles.myMessageTimePill,
                                            item.read ? styles.timePillRead : styles.timePillUnread,
                                          ]}
                                        >
                                          {item.read ? (
                                            <>
                                              <DoubleCheckIcon size={11} color="#2563eb" />
                                              <Text style={styles.timePillTextRead}>Vu</Text>
                                            </>
                                          ) : (
                                            <>
                                              <SingleCheckIcon size={10} color="#64748b" />
                                              <Text style={styles.timePillTextUnread}>Envoyé</Text>
                                            </>
                                          )}
                                        </View>
                                      </View>
                                    )}
                                  </TouchableOpacity>
                                ) : (
                                  // رسالة الطرف الآخر باللون الأبيض وبجانبها صورته
                                  <TouchableOpacity
                                    activeOpacity={0.85}
                                    delayLongPress={220}
                                    onLongPress={(e) => handleLongPressMessage(item, e)}
                                    onPressOut={() => {
                                      longPressGestureActiveRef.current = false;
                                      longPressReleasedAtRef.current = Date.now();
                                    }}
                                    onPress={() => {
                                      lastMessageTappedAtRef.current = Date.now();
                                      if (selectedMessageIds.length > 0) {
                                        // حماية الرسالة الحالية فقط من نقرة رفع الإصبع
                                        if (
                                          reactionTargetMessage &&
                                          String(reactionTargetMessage._id || reactionTargetMessage.id) === String(item._id) &&
                                          (justTriggeredLongPressRef.current || Date.now() - overlayMountedAtRef.current < 450)
                                        ) {
                                          justTriggeredLongPressRef.current = false;
                                          return;
                                        }
                                        justTriggeredLongPressRef.current = false;
                                        handleToggleSelectMessage(item._id);
                                        return;
                                      }
                                      if (Date.now() - lastLinkPressTimeRef.current < 600) {
                                        return;
                                      }
                                      toggleMessageTime(item._id);
                                    }}
                                    style={[
                                      styles.otherMessageBlock,
                                      isSelected && styles.messageBlockSelected,
                                      Boolean(messageReactions[item._id]) && styles.messageBlockWithReaction,
                                    ]}
                                  >
                                    <View style={styles.otherMessageRow}>
                                      {selectedMessageIds.length > 0 && (
                                        <View
                                          style={[
                                            styles.messageSelectCheckbox,
                                            styles.otherCheckboxMargin,
                                            isSelected && styles.messageSelectCheckboxActive,
                                          ]}
                                        >
                                          {isSelected && <CheckIcon color="#ffffff" size={12} />}
                                        </View>
                                      )}
                                      <View
                                        style={[
                                          styles.otherAvatar,
                                          {
                                            backgroundColor: getAvatarColor(
                                              activeChatUser?.name || 'User'
                                            ),
                                          },
                                        ]}
                                      >
                                        <Text style={styles.otherAvatarLetter}>
                                          {activeChatUser?.name
                                            ? activeChatUser.name[0].toUpperCase()
                                            : '👤'}
                                        </Text>
                                      </View>
                                      <View
                                        style={[
                                          styles.otherBubble,
                                          hasMedia && !hasText && !replyData && styles.otherBubbleImageOnly,
                                          hasMedia && hasText && !replyData && styles.otherBubbleImageWithCaption,
                                          Boolean(replyData) && styles.otherBubbleWithReply,
                                          isSelected && styles.otherBubbleSelected,
                                          Boolean(messageReactions[item._id]) && styles.bubbleWithReaction,
                                        ]}
                                      >
                                        {/* اقتباس الرسالة المردود عليها بتصميم احترافي فخم فوق الإجابة بدون اسم الشخص */}
                                        {replyData && (
                                          <TouchableOpacity
                                            activeOpacity={0.75}
                                            onPress={() => {
                                              lastMessageTappedAtRef.current = Date.now();
                                              if (selectedMessageIds.length > 0) {
                                                handleToggleSelectMessage(item._id);
                                                return;
                                              }
                                              handlePressReplyQuote(replyData, item._id);
                                            }}
                                            style={styles.otherBubbleReplyQuote}
                                          >
                                            <View style={styles.otherBubbleReplyQuoteLine} />
                                            <View style={styles.bubbleReplyQuoteContent}>
                                              <Text style={styles.otherBubbleReplyQuoteSnippet} numberOfLines={2}>
                                                {replyData.imageUrl
                                                  ? (replyData.content ? `📷 ${replyData.content}` : '📷 Photo')
                                                  : replyData.videoUrl
                                                    ? (replyData.content ? `🎥 ${replyData.content}` : '🎥 Vidéo')
                                                    : replyData.content}
                                              </Text>
                                            </View>
                                            {Boolean(replyData.imageUrl) ? (
                                              <Image
                                                source={{ uri: replyData.imageUrl }}
                                                style={styles.bubbleReplyQuoteThumb}
                                                resizeMode="cover"
                                              />
                                            ) : Boolean(replyData.videoUrl) ? (
                                              <View style={[styles.bubbleReplyQuoteThumb, styles.bubbleReplyQuoteVideoThumb]}>
                                                <Text style={{ fontSize: 13 }}>🎥</Text>
                                              </View>
                                            ) : null}
                                          </TouchableOpacity>
                                        )}
                                        {hasImage && (
                                          <ChatImage
                                            uri={item.imageUrl}
                                            onPress={() => {
                                              lastMessageTappedAtRef.current = Date.now();
                                              if (selectedMessageIds.length > 0) {
                                                handleToggleSelectMessage(item._id);
                                                return;
                                              }
                                              setPreviewImage(item.imageUrl);
                                            }}
                                            onLongPress={(e) => handleLongPressMessage(item, e)}
                                            hasText={hasText}
                                          />
                                        )}
                                        {hasVideo && (
                                          <View style={styles.bubbleMediaWrapper}>
                                            <ChatVideo uri={item.videoUrl} hasText={hasText} />
                                            {selectedMessageIds.length > 0 && (
                                              <TouchableOpacity
                                                style={StyleSheet.absoluteFillObject}
                                                onPress={() => handleToggleSelectMessage(item._id)}
                                                activeOpacity={0.7}
                                              />
                                            )}
                                          </View>
                                        )}
                                        {hasText && (
                                          <MessageContentWithLinks
                                            content={cleanContent}
                                            baseStyle={
                                              hasMedia
                                                ? styles.otherBubbleCaptionText
                                                : replyData
                                                  ? styles.otherBubbleReplyAnswerText
                                                  : styles.otherBubbleText
                                            }
                                            linkStyle={styles.otherBubbleLink}
                                            onPressUrl={(url) => {
                                              lastMessageTappedAtRef.current = Date.now();
                                              if (selectedMessageIds.length > 0) {
                                                handleToggleSelectMessage(item._id);
                                                return;
                                              }
                                              handleOpenUrl(url);
                                            }}
                                          />
                                        )}
                                        {/* شارة تفاعل الإيموجي الأنيقة على الرسالة */}
                                        {Boolean(messageReactions[item._id]) && (
                                          <TouchableOpacity
                                            activeOpacity={0.8}
                                            delayLongPress={220}
                                            onLongPress={(e) => handleLongPressMessage(item, e)}
                                            onPress={(e) => {
                                              lastMessageTappedAtRef.current = Date.now();
                                              if (selectedMessageIds.length > 0) {
                                                handleToggleSelectMessage(item._id);
                                                return;
                                              }
                                              handleLongPressMessage(item, e);
                                            }}
                                            style={[styles.bubbleReactionBadge, styles.otherBubbleReactionBadge]}
                                          >
                                            <Text style={styles.bubbleReactionBadgeEmoji}>
                                              {messageReactions[item._id]}
                                            </Text>
                                          </TouchableOpacity>
                                        )}
                                      </View>
                                    </View>
                                    {/* يظهر الوقت فقط عند النقر على الرسالة */}
                                    {isTimeVisible && (
                                      <Text style={styles.otherMessageTime}>{timeStr}</Text>
                                    )}
                                  </TouchableOpacity>
                                )}
                              </SwipeableMessageRow>
                            );
                          }}
                          ListFooterComponent={
                            uploadingImage && uploadingImageUri ? (
                              <View style={styles.myMessageBlock}>
                                <View
                                  style={[
                                    styles.myBubble,
                                    !uploadingCaption && styles.bubbleImageOnly,
                                    Boolean(uploadingCaption) && styles.bubbleImageWithCaption,
                                  ]}
                                >
                                  <View
                                    style={[
                                      styles.bubbleImageWrap,
                                      Boolean(uploadingCaption) && styles.bubbleImageWrapWithMargin,
                                    ]}
                                  >
                                    <Image
                                      source={{ uri: uploadingImageUri }}
                                      style={styles.bubbleImage}
                                      resizeMode="cover"
                                    />
                                    {/* أيقونة الانتظار في منتصف الكارد بالضبط بدون أي رسائل */}
                                    <View style={styles.imageWaitingOverlay}>
                                      <View style={styles.imageWaitingSpinnerCircle}>
                                        <ActivityIndicator size="large" color="#ffffff" />
                                      </View>
                                    </View>
                                  </View>
                                  {Boolean(uploadingCaption) && (
                                    <Text style={styles.bubbleCaptionText}>{uploadingCaption}</Text>
                                  )}
                                </View>
                              </View>
                            ) : uploadingVideo && uploadingVideoUri ? (
                              <View style={styles.myMessageBlock}>
                                <View
                                  style={[
                                    styles.myBubble,
                                    !uploadingCaption && styles.bubbleImageOnly,
                                    Boolean(uploadingCaption) && styles.bubbleImageWithCaption,
                                  ]}
                                >
                                  <View
                                    style={[
                                      styles.bubbleVideoWrap,
                                      Boolean(uploadingCaption) && styles.bubbleImageWrapWithMargin,
                                    ]}
                                  >
                                    <View style={styles.videoPlaceholderBackground}>
                                      <ActivityIndicator size="large" color="#ffffff" />
                                      <Text style={styles.videoUploadingText}>Envoi de la vidéo en cours...</Text>
                                    </View>
                                  </View>
                                  {Boolean(uploadingCaption) && (
                                    <Text style={styles.bubbleCaptionText}>{uploadingCaption}</Text>
                                  )}
                                </View>
                              </View>
                            ) : null
                          }
                          ListEmptyComponent={
                            <View style={styles.emptyChatPrompt}>
                              <View style={styles.emptyChatIconCircle}>
                                <EmptyMessagesIcon size={46} color="#0f1117" />
                              </View>
                              <Text style={styles.emptyChatPromptTitle}>
                                Dites bonjour à {activeChatUser?.name} !
                              </Text>
                              <Text style={styles.emptyChatPromptText}>
                                Envoyez votre premier message ci-dessous.
                              </Text>
                            </View>
                          }
                        />
                      )}

                      {/* الشريط السفلي لإرسال الرسالة */}
                      {/* شريط معاينة الرد على الرسالة المحددة بالسحب */}
                      {replyingToMessage && (
                        <View style={styles.replyPreviewBar}>
                          <View style={styles.replyPreviewLeftBar} />
                          <View style={styles.replyPreviewContent}>
                            <View style={styles.replyPreviewHeader}>
                              <ReplyIcon size={13} color="#0f1117" />
                              <Text style={styles.replyPreviewSender} numberOfLines={1}>
                                {replyingToMessage.sender?._id === currentUser?.id ||
                                  replyingToMessage.sender === currentUser?.id
                                  ? 'Vous'
                                  : replyingToMessage.sender?.name || activeChatUser?.name || 'Contact'}
                              </Text>
                            </View>
                            <Text style={styles.replyPreviewSnippet} numberOfLines={1}>
                              {replyingToMessage.imageUrl
                                ? (replyingToMessage.content ? `📷 ${getCleanMessageText(replyingToMessage.content)}` : '📷 Photo')
                                : replyingToMessage.videoUrl
                                  ? (replyingTocontent => `🎥 ${getCleanMessageText(replyingToMessage.content)}`)(replyingToMessage.content)
                                  : getCleanMessageText(replyingToMessage.content)}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.replyPreviewCloseBtn}
                            onPress={() => setReplyingToMessage(null)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={styles.replyPreviewCloseText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      <View style={styles.bottomBarContainer}>
                        {/* زر + بتصميم ناعم وعصري لرفع الصور والفيديوهات */}
                        <TouchableOpacity
                          style={styles.plusCircleBtn}
                          activeOpacity={0.8}
                          onPress={() => {
                            if (reactionTargetMessage) handleCloseReactionOverlay();
                            if (selectedMessageIds.length > 0) setSelectedMessageIds([]);
                            showImagePickerOptions();
                          }}
                          disabled={uploadingImage || uploadingVideo}
                        >
                          {uploadingImage || uploadingVideo ? (
                            <ActivityIndicator size="small" color="#0f1117" />
                          ) : (
                            <PlusIcon color="#475569" />
                          )}
                        </TouchableOpacity>

                        {/* حقل الإدخال المستدير مع أيقونة الميكروفون */}
                        <TouchableOpacity
                          activeOpacity={1}
                          onPress={() => {
                            if (reactionTargetMessage) handleCloseReactionOverlay();
                            if (selectedMessageIds.length > 0) setSelectedMessageIds([]);
                            chatInputRef.current?.focus();
                          }}
                          style={styles.chatInputCapsule}
                        >
                          <TextInput
                            ref={chatInputRef}
                            style={styles.chatInputActual}
                            placeholder="Écrivez un message..."
                            placeholderTextColor="#94a3b8"
                            value={newMsgText}
                            onChangeText={setNewMsgText}
                            multiline={true}
                            blurOnSubmit={false}
                            returnKeyType="default"
                            showSoftInputOnFocus={true}
                            onFocus={() => {
                              if (reactionTargetMessage) handleCloseReactionOverlay();
                              if (selectedMessageIds.length > 0) setSelectedMessageIds([]);
                            }}
                            onPressIn={() => {
                              if (reactionTargetMessage) handleCloseReactionOverlay();
                              if (selectedMessageIds.length > 0) setSelectedMessageIds([]);
                            }}
                          />
                          <TouchableOpacity
                            activeOpacity={0.7}
                            style={styles.micBtnWrap}
                            onPress={() => {
                              if (reactionTargetMessage) handleCloseReactionOverlay();
                              if (selectedMessageIds.length > 0) setSelectedMessageIds([]);
                              showAlert('Message vocal', 'La messagerie vocale sera bientôt disponible dans une prochaine mise à jour.', [{ text: "D'accord" }], { type: 'info' });
                            }}
                          >
                            <MicIcon color="#64748b" />
                          </TouchableOpacity>
                        </TouchableOpacity>

                        {/* زر الإرسال المتناسق مع تدرجات الأبيض */}
                        <TouchableOpacity
                          style={[
                            styles.sendCircleBtn,
                            newMsgText.trim() ? styles.sendCircleBtnActive : styles.sendCircleBtnIdle,
                          ]}
                          onPress={handleSendMessage}
                          disabled={!newMsgText.trim() || sendingMsg}
                          activeOpacity={0.8}
                        >
                          {sendingMsg ? (
                            <ActivityIndicator size="small" color={newMsgText.trim() ? '#ffffff' : '#64748b'} />
                          ) : (
                            <SendIcon color={newMsgText.trim() ? '#ffffff' : '#94a3b8'} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </KeyboardAvoidingView>
                  </SafeAreaView>

                  {/* ------------------------------------------------------------- */}
                  {/* نافذة وضع التفاعلات والإيموجي والخيارات السريعة (Emoji Reaction Overlay) */}
                  {/* ------------------------------------------------------------- */}
                  {Boolean(reactionTargetMessage) && selectedMessageIds.length <= 1 && (
                    <View style={styles.reactionOverlayContainer} pointerEvents="box-none">

                      {/* 1. نافذة الإيموجي الفاخرة فوق الرسالة مباشرة */}
                      <View
                        style={[
                          styles.floatingReactionEmojisWrapper,
                          {
                            top:
                              reactionPosition?.top && !isNaN(reactionPosition.top)
                                ? reactionPosition.top
                                : 220,
                          },
                        ]}
                        pointerEvents="box-none"
                      >
                        <Animated.View
                          style={[
                            styles.floatingReactionEmojisCapsule,
                            {
                              opacity: reactionAnim,
                              transform: [
                                {
                                  scale: reactionAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.75, 1],
                                  }),
                                },
                              ],
                            },
                          ]}
                        >
                          {REACTION_EMOJIS.map((emoji) => {
                            const targetMsgId = reactionTargetMessage
                              ? String(reactionTargetMessage._id || reactionTargetMessage.id || '')
                              : '';
                            const isCurrentReacted = Boolean(
                              targetMsgId && messageReactions[targetMsgId] === emoji
                            );
                            return (
                              <TouchableOpacity
                                key={emoji}
                                activeOpacity={0.65}
                                onPress={() => {
                                  if (targetMsgId) {
                                    handleSelectReaction(targetMsgId, emoji);
                                  }
                                }}
                                style={[
                                  styles.reactionEmojiBtn,
                                  isCurrentReacted && styles.reactionEmojiBtnActive,
                                ]}
                              >
                                <Text style={styles.reactionEmojiText}>{emoji}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </Animated.View>
                      </View>

                      {/* 2. نافذة الخيارات السريعة في الأسفل بجانب بعض وبالأيقونات فقط وبدون زر selectionner */}
                      <View style={styles.bottomReactionActionsWrapper} pointerEvents="box-none">
                        <Animated.View
                          style={[
                            styles.bottomReactionActionsBar,
                            {
                              opacity: reactionAnim,
                              transform: [
                                {
                                  translateY: reactionAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [20, 0],
                                  }),
                                },
                                {
                                  scale: reactionAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.85, 1],
                                  }),
                                },
                              ],
                            },
                          ]}
                        >
                          {/* أيقونة الرد */}
                          <TouchableOpacity
                            style={styles.bottomReactionActionBtn}
                            activeOpacity={0.7}
                            onPress={() => {
                              const target = reactionTargetMessage;
                              handleCloseReactionOverlay(true);
                              setSelectedMessageIds([]);
                              if (target) handleInitiateReply(target);
                            }}
                          >
                            <View style={[styles.bottomReactionIconCircle, { backgroundColor: '#f0fdf4' }]}>
                              <ReplyIcon color="#16a34a" size={19} />
                            </View>
                          </TouchableOpacity>

                          {/* أيقونة النسخ */}
                          <TouchableOpacity
                            style={styles.bottomReactionActionBtn}
                            activeOpacity={0.7}
                            onPress={async () => {
                              const target = reactionTargetMessage;
                              handleCloseReactionOverlay(true);
                              setSelectedMessageIds([]);
                              if (target) {
                                const text =
                                  parseMessageData(target).cleanContent || target.imageUrl || '';
                                if (text) {
                                  try {
                                    await Clipboard.setStringAsync(text);
                                  } catch (e) { }
                                }
                              }
                            }}
                          >
                            <View style={[styles.bottomReactionIconCircle, { backgroundColor: '#eff6ff' }]}>
                              <CopyIcon color="#2563eb" size={19} />
                            </View>
                          </TouchableOpacity>

                          {/* أيقونة الحذف المباشر */}
                          <TouchableOpacity
                            style={styles.bottomReactionActionBtn}
                            activeOpacity={0.7}
                            onPress={() => {
                              const target = reactionTargetMessage;
                              handleCloseReactionOverlay(true);
                              const targetId = target ? (target._id || target.id) : null;
                              if (targetId) {
                                handleDeleteSingleMessageDirect(targetId);
                              }
                            }}
                          >
                            <View style={[styles.bottomReactionIconCircle, { backgroundColor: '#fef2f2' }]}>
                              <TrashIcon color="#dc2626" size={19} />
                            </View>
                          </TouchableOpacity>
                        </Animated.View>
                      </View>
                    </View>
                  )}
                </View>
              </Modal>

              {/* ------------------------------------------------------------- */}
              {/* مشغل عرض الصورة بحجمها الكامل (Fullscreen Image Viewer)        */}
              {/* ------------------------------------------------------------- */}
              <Modal
                visible={previewImage !== null}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setPreviewImage(null)}
              >
                <SafeAreaView style={styles.imageViewerBackdrop}>
                  <TouchableOpacity
                    style={styles.imageViewerCloseBtn}
                    onPress={() => setPreviewImage(null)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.imageViewerCloseText}>✕</Text>
                  </TouchableOpacity>
                  {previewImage && (
                    <Image
                      source={{ uri: previewImage }}
                      style={styles.imageViewerFullImage}
                      resizeMode="contain"
                    />
                  )}
                </SafeAreaView>
              </Modal>

              {/* ------------------------------------------------------------- */}
              {/* 4. صفحة بدء محادثة جديدة والبحث عن أشخاص (New Chat Screen)     */}
              {/* ------------------------------------------------------------- */}
              <Modal
                visible={isNewChatModalVisible}
                animationType="slide"
                statusBarTranslucent={true}
                hardwareAccelerated={true}
                onRequestClose={() => {
                  setIsNewChatModalVisible(false);
                  setNewChatSearch('');
                }}
              >
                <SafeAreaView style={styles.newChatContainer}>
                  <StatusBar style="dark" />

                  {/* رأس صفحة بدء المحادثة الجديدة */}
                  <View style={styles.newChatHeader}>
                    <TouchableOpacity
                      style={styles.headerCircleBtn}
                      onPress={() => {
                        setIsNewChatModalVisible(false);
                        setNewChatSearch('');
                      }}
                      activeOpacity={0.7}
                    >
                      <ChevronLeftIcon color="#111827" />
                    </TouchableOpacity>

                    <Text style={styles.newChatHeaderTitle}>Nouveau message</Text>

                    <View style={{ width: 42 }} />
                  </View>

                  {/* حقل البحث في صفحة الأشخاص الجدد */}
                  <View style={styles.newChatSearchWrap}>
                    <View style={styles.searchBarContainer}>
                      <SearchIcon color="#9ca3af" />
                      <TextInput
                        style={styles.searchBarInput}
                        placeholder="Rechercher par nom ou e-mail..."
                        placeholderTextColor="#9ca3af"
                        value={newChatSearch}
                        onChangeText={setNewChatSearch}
                        autoFocus={false}
                      />
                      {newChatSearch ? (
                        <TouchableOpacity onPress={() => setNewChatSearch('')}>
                          <Text style={{ fontSize: 14, color: '#9ca3af', paddingHorizontal: 4 }}>
                            ✕
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>

                  {/* قائمة الأشخاص المسجلين في التطبيق */}
                  <View style={styles.newChatListWrap}>
                    <Text style={styles.newChatSectionTitle}>Contacts suggérés</Text>

                    {loadingAllUsers ? (
                      <ActivityIndicator size="large" color="#e11d48" style={{ marginTop: 40 }} />
                    ) : (
                      <FlatList
                        data={allRegisteredUsers.filter((u) => {
                          if (!newChatSearch.trim()) return true;
                          const term = newChatSearch.toLowerCase();
                          return (
                            (u.name || '').toLowerCase().includes(term) ||
                            (u.email || '').toLowerCase().includes(term)
                          );
                        })}
                        keyExtractor={(item, index) => (item?._id ? `${item._id}_${index}` : `user_${index}`)}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => {
                          const avatarBg = getAvatarColor(item.name || item.email);
                          return (
                            <TouchableOpacity
                              style={styles.newChatUserItem}
                              onPress={() => startChatWith(item)}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.avatarBadgeWrap, { backgroundColor: avatarBg }]}>
                                <Text style={styles.avatarLetter}>
                                  {(item.name || item.email)[0].toUpperCase()}
                                </Text>
                                {Boolean(item.isOnline) && <View style={styles.onlineDot} />}
                              </View>

                              <View style={styles.newChatUserInfo}>
                                <Text style={styles.newChatUserName}>
                                  {item.name || item.email.split('@')[0]}
                                </Text>
                                <Text style={styles.newChatUserEmail}>{item.email}</Text>
                              </View>

                              <View style={styles.newChatActionBtn}>
                                <Text style={styles.newChatActionText}>Écrire</Text>
                              </View>
                            </TouchableOpacity>
                          );
                        }}
                        ListEmptyComponent={
                          <View style={styles.noUserFoundBox}>
                            <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
                            <Text style={styles.noUserFoundTitle}>Aucun contact trouvé</Text>
                            <Text style={styles.noUserFoundDesc}>
                              Aucun utilisateur correspondant à "{newChatSearch}".
                            </Text>
                          </View>
                        }
                      />
                    )}
                  </View>
                </SafeAreaView>
              </Modal>

              {/* ============================================================= */}
              {/* 👑 5. نافذة إدارة الحسابات للأدمن (Admin Accounts Modal)       */}
              {/* ============================================================= */}
              <Modal
                visible={isAdminModalVisible}
                animationType="slide"
                onRequestClose={() => setIsAdminModalVisible(false)}
              >
                <SafeAreaView style={styles.adminModalContainer}>
                  <StatusBar style="dark" />

                  {/* الرأس (Header) */}
                  <View style={styles.adminModalHeader}>
                    <TouchableOpacity
                      style={styles.headerCircleBtn}
                      onPress={() => setIsAdminModalVisible(false)}
                      activeOpacity={0.7}
                    >
                      <ChevronLeftIcon color="#111827" />
                    </TouchableOpacity>

                    <View style={styles.adminModalHeaderTitleWrap}>
                      <View style={styles.adminTitleRow}>
                        <ShieldIcon color="#e11d48" size={18} />
                        <Text style={styles.adminModalTitle}>Panneau Administrateur</Text>
                      </View>
                      <Text style={styles.adminModalSubtitle}>
                        {adminUsers.filter((u) => {
                          if (!adminSearchQuery.trim()) return true;
                          const q = adminSearchQuery.toLowerCase();
                          return (
                            (u.name && u.name.toLowerCase().includes(q)) ||
                            (u.email && u.email.toLowerCase().includes(q))
                          );
                        }).length} compte(s) trouvé(s)
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.adminRefreshBtn}
                      onPress={fetchAdminUsers}
                      activeOpacity={0.7}
                      disabled={loadingAdminUsers}
                    >
                      {loadingAdminUsers ? (
                        <ActivityIndicator size="small" color="#e11d48" />
                      ) : (
                        <Text style={styles.adminRefreshBtnText}>🔄</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* شريط البحث في الحسابات */}
                  <View style={styles.adminSearchWrap}>
                    <View style={styles.adminSearchContainer}>
                      <SearchIcon color="#9ca3af" />
                      <TextInput
                        style={styles.adminSearchInput}
                        placeholder="Rechercher par email ou nom..."
                        placeholderTextColor="#9ca3af"
                        value={adminSearchQuery}
                        onChangeText={setAdminSearchQuery}
                      />
                      {Boolean(adminSearchQuery) && (
                        <TouchableOpacity onPress={() => setAdminSearchQuery('')}>
                          <Text style={{ color: '#9ca3af', fontSize: 14, fontWeight: 'bold' }}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* قائمة كاردات الحسابات */}
                  {loadingAdminUsers && adminUsers.length === 0 ? (
                    <ActivityIndicator size="large" color="#e11d48" style={{ marginTop: 60 }} />
                  ) : (
                    <FlatList
                      data={adminUsers.filter((u) => {
                        if (!adminSearchQuery.trim()) return true;
                        const q = adminSearchQuery.toLowerCase();
                        return (
                          (u.name && u.name.toLowerCase().includes(q)) ||
                          (u.email && u.email.toLowerCase().includes(q))
                        );
                      })}
                      keyExtractor={(item, index) => (item?._id ? `${item._id}_${index}` : `admin_${index}`)}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 60 }}
                      renderItem={({ item }) => {
                        const isMainAdmin = item.email === 'admin@admin.com';
                        const isDeletingUser = deletingUserId === item._id;
                        const isDeletingMsgs = deletingMessagesUserId === item._id;

                        return (
                          <View style={styles.adminUserCard}>
                            {/* رأس الكارد مع الأفاتار ومعلومات المستخدم */}
                            <View style={styles.adminCardHeader}>
                              <View style={[styles.adminAvatar, { backgroundColor: getAvatarColor(item.name || item.email) }]}>
                                <Text style={styles.adminAvatarLetter}>
                                  {(item.name || item.email)[0].toUpperCase()}
                                </Text>
                              </View>
                              <View style={styles.adminCardInfo}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={styles.adminCardName} numberOfLines={1}>
                                    {item.name || 'Sans nom'}
                                  </Text>
                                  {isMainAdmin && (
                                    <View style={styles.adminBadge}>
                                      <Text style={styles.adminBadgeText}>ADMIN</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={styles.adminCardEmail} numberOfLines={1}>
                                  📧 {item.email}
                                </Text>
                              </View>
                            </View>

                            {/* كبسولة كلمة السر */}
                            <View style={styles.adminPasswordBadge}>
                              <Text style={styles.adminPasswordLabel}>🔑 Mot de passe :</Text>
                              <Text style={styles.adminPasswordValue} selectTextOnFocus={true}>
                                {item.password}
                              </Text>
                            </View>

                            {/* صف إحصائيات الرسائل */}
                            <View style={styles.adminStatsRow}>
                              <View style={styles.adminStatChip}>
                                <Text style={styles.adminStatNumber}>{item.sentCount || 0}</Text>
                                <Text style={styles.adminStatLabel}>📤 Envoyés</Text>
                              </View>
                              <View style={styles.adminStatChip}>
                                <Text style={styles.adminStatNumber}>{item.receivedCount || 0}</Text>
                                <Text style={styles.adminStatLabel}>📥 Reçus</Text>
                              </View>
                              <View style={[styles.adminStatChip, styles.adminStatChipTotal]}>
                                <Text style={[styles.adminStatNumber, { color: '#e11d48' }]}>
                                  {item.totalMessages || 0}
                                </Text>
                                <Text style={[styles.adminStatLabel, { color: '#e11d48' }]}>💬 Total</Text>
                              </View>
                            </View>

                            {/* أزرار الإجراءات */}
                            <View style={styles.adminCardActions}>
                              {/* زر حذف جميع رسائل المستخدم بصمت */}
                              <TouchableOpacity
                                style={[
                                  styles.adminDeleteMsgsBtn,
                                  item.totalMessages === 0 && { opacity: 0.5 },
                                ]}
                                onPress={() => handleDeleteUserMessages(item)}
                                disabled={item.totalMessages === 0 || isDeletingMsgs}
                                activeOpacity={0.7}
                              >
                                {isDeletingMsgs ? (
                                  <ActivityIndicator size="small" color="#e11d48" />
                                ) : (
                                  <>
                                    <TrashIcon color="#e11d48" size={14} />
                                    <Text style={styles.adminDeleteMsgsBtnText}>
                                      Supprimer ses messages
                                    </Text>
                                  </>
                                )}
                              </TouchableOpacity>

                              {/* زر حذف الحساب بالكامل */}
                              {!isMainAdmin && (
                                <TouchableOpacity
                                  style={styles.adminDeleteAccountBtn}
                                  onPress={() => handleDeleteUserAccount(item)}
                                  disabled={isDeletingUser}
                                  activeOpacity={0.7}
                                >
                                  {isDeletingUser ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                  ) : (
                                    <>
                                      <TrashIcon color="#ffffff" size={14} />
                                      <Text style={styles.adminDeleteAccountBtnText}>
                                        Supprimer compte
                                      </Text>
                                    </>
                                  )}
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      }}
                      ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 50 }}>
                          <Text style={{ fontSize: 16, color: '#6b7280', fontWeight: '600' }}>
                            Aucun compte correspondant.
                          </Text>
                        </View>
                      }
                    />
                  )}
                </SafeAreaView>
              </Modal>
              <CustomAlertModal alert={appAlert} onClose={closeAlert} />
            </SafeAreaView>
          );
        }}
      </SafeAreaInsetsContext.Consumer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // ----------------- ستايل شاشة تسجيل الدخول والمصادقة -----------------
  authWrapper: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  authScroll: {
    flexGrow: 1,
    backgroundColor: '#ffffff',
  },
  authScrollKeyboard: {
    paddingBottom: 24,
  },
  phoneMockup: {
    width: '100%',
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerGraphic: {
    height: 195,
    backgroundColor: '#df6a44',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  headerGraphicKeyboard: {
    height: Platform.OS === 'ios' ? 145 : 130,
    paddingTop: Platform.OS === 'ios' ? 35 : 15,
    paddingBottom: 15,
  },
  circleGold: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#cfb45d',
    top: -25,
    left: -45,
  },
  circleGoldKeyboard: {
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -25,
    left: -35,
  },
  circleMint: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#5bbd97',
    bottom: -35,
    right: -35,
  },
  circleMintKeyboard: {
    width: 140,
    height: 140,
    borderRadius: 70,
    bottom: -30,
    right: -25,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 36,
  },
  headerTitleKeyboard: {
    fontSize: 26,
    lineHeight: 32,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    marginTop: -38,
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 40,
    flex: 1,
  },
  formCardKeyboard: {
    marginTop: -24,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#111827',
  },
  halfInput: {
    flex: 1,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  passwordInput: {
    flex: 1,
    marginRight: 10,
  },
  inputCompact: {
    paddingVertical: 13,
    borderRadius: 16,
    fontSize: 14,
  },
  eyeBtn: {
    width: 52,
    height: 52,
    backgroundColor: '#f3f4f6',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeBtnCompact: {
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  authErrorText: {
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  submitBtn: {
    backgroundColor: '#0a0a0a',
    borderRadius: 26,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 22,
  },
  submitBtnKeyboard: {
    marginTop: 20,
    paddingVertical: 15,
    borderRadius: 24,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  termsText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 18,
    lineHeight: 18,
  },
  forgotBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotText: {
    fontSize: 13,
    color: '#4b5563',
  },
  linkText: {
    textDecorationLine: 'underline',
    fontWeight: '600',
    color: '#111827',
  },
  authSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    padding: 4,
    marginBottom: 20,
  },
  authSegmentTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  authSegmentTabActive: {
    backgroundColor: '#ffffff',
  },
  authSegmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  authSegmentTextActive: {
    color: '#df6a44',
    fontWeight: '700',
  },
  switchAuthRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  switchPromptText: {
    fontSize: 13,
    color: '#374151',
  },
  switchActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  switchActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    textDecorationLine: 'underline',
  },

  // ----------------- ستايل قائمة الرسائل (Screen 1) -----------------
  messagesContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  messagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
  },
  headerCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerMessagesTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  searchBarWrapper: {
    paddingHorizontal: 20,
    marginTop: 12,
    position: 'relative',
    zIndex: 999,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f5f7',
    borderRadius: 22,
    height: 46,
    paddingHorizontal: 16,
  },
  searchBarInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#111827',
  },
  searchResultsDropdown: {
    position: 'absolute',
    top: 54,
    left: 20,
    right: 20,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 12,
    zIndex: 1000,
  },
  searchDropdownTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    marginBottom: 8,
  },
  searchDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  searchDropdownEmpty: {
    textAlign: 'center',
    color: '#9ca3af',
    paddingVertical: 8,
    fontSize: 13,
  },
  chatActionPill: {
    backgroundColor: '#ffe4e6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  chatActionPillText: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: '700',
  },

  conversationsListWrap: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  chatListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  avatarBadgeWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarLetter: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  chatItemCenter: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  contactItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  contactItemMsg: {
    fontSize: 13,
    color: '#6b7280',
  },
  chatItemRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  chatItemTime: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 6,
  },
  chatItemStatus: {
    height: 20,
    justifyContent: 'center',
  },
  unreadCountBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0f1117',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadCountText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 60,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  emptyStateDesc: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  emptyStatePullHint: {
    fontSize: 12,
    color: '#0f1117',
    fontWeight: '700',
    marginTop: 14,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  // ----------------- ستايل شاشة المحادثة بين الطرفين (Chat Screen) -----------------
  chatModalRoot: {
    flex: 1,
    backgroundColor: '#ffffff',
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  chatScreenContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    width: '100%',
  },
  chatKeyboardAvoidingContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    width: '100%',
  },
  chatMessagesFlatList: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  chatScreenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    zIndex: 10,
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatHeaderProfileWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  chatHeaderAvatarWrap: {
    position: 'relative',
    marginRight: 9,
  },
  chatHeaderAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatHeaderAvatarLetter: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  chatHeaderOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  chatHeaderMetaWrap: {
    alignItems: 'flex-start',
    maxWidth: '65%',
  },
  chatHeaderName: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  chatHeaderStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  chatHeaderStatusMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    marginRight: 4,
  },
  chatHeaderStatus: {
    fontSize: 11.5,
    color: '#94a3b8',
    fontWeight: '500',
  },
  chatHeaderStatusOnline: {
    color: '#16a34a',
    fontWeight: '600',
  },
  deleteChatHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionHeader: {
    backgroundColor: '#ffffff',
    borderBottomColor: '#f1f5f9',
    borderBottomWidth: 1,
  },
  cancelSelectionIcon: {
    fontSize: 18,
    color: '#0f1117',
    fontWeight: '800',
  },
  selectionTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f1117',
  },
  selectionSubtitleText: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  selectionActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copySelectedHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    gap: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  copySelectedHeaderBtnText: {
    color: '#0f1117',
    fontSize: 13,
    fontWeight: '800',
  },
  deleteSelectedHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1117',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 18,
    gap: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteSelectedHeaderBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  messageWithCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  messageSelectCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  otherCheckboxMargin: {
    marginRight: 8,
    alignSelf: 'center',
  },
  messageSelectCheckboxActive: {
    backgroundColor: '#5046e5',
    borderColor: '#5046e5',
  },
  myBubbleSelected: {
    backgroundColor: '#4338ca',
  },
  otherBubbleSelected: {
    backgroundColor: '#e2e8f0',
  },
  messageBlockSelected: {
    opacity: 0.95,
  },
  messagesStream: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    flexGrow: 1,
    backgroundColor: '#ffffff',
  },
  // ستايلات سحب الرسالة للرد
  swipeableMessageContainer: {
    position: 'relative',
    width: '100%',
    justifyContent: 'center',
  },
  messageRowHighlighted: {
    backgroundColor: 'transparent',
  },
  swipeReplyBadge: {
    position: 'absolute',
    left: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  // رسائل الطرف الآخر (Received)
  otherMessageBlock: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    maxWidth: '82%',
  },
  otherMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  otherAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  otherAvatarLetter: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  otherBubble: {
    backgroundColor: '#f0f2f5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    minWidth: 54,
  },
  otherBubbleText: {
    fontSize: 15,
    color: '#0f172a',
    lineHeight: 21,
  },
  otherBubbleLink: {
    color: '#2563eb',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  // الفقاعات التي تحتوي على رد (مع minWidth متناسق ومظهر احترافي لا ينهار)
  bubbleWithReply: {
    minWidth: 165,
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 7,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  otherBubbleWithReply: {
    minWidth: 165,
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 7,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  // اقتباس الرد داخل الفقاعة فوق الإجابة (تصميم انسيابي مطابق للصورة)
  myBubbleReplyQuote: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 9,
    marginBottom: 5,
    overflow: 'hidden',
  },
  otherBubbleReplyQuote: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e4e7eb',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 9,
    marginBottom: 5,
    overflow: 'hidden',
  },
  myBubbleReplyQuoteLine: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 1.5,
    backgroundColor: '#ffffff',
    marginRight: 8,
  },
  otherBubbleReplyQuoteLine: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 1.5,
    backgroundColor: '#5046e5',
    marginRight: 8,
  },
  bubbleReplyQuoteContent: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 4,
  },
  myBubbleReplyQuoteSnippet: {
    fontSize: 12.5,
    color: '#ffffff',
    lineHeight: 17,
    fontWeight: '500',
  },
  otherBubbleReplyQuoteSnippet: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 17,
    fontWeight: '500',
  },
  bubbleReplyQuoteThumb: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginLeft: 6,
    backgroundColor: '#e2e8f0',
  },
  bubbleReplyQuoteVideoThumb: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleReplyAnswerText: {
    fontSize: 15,
    color: '#ffffff',
    lineHeight: 21,
    paddingHorizontal: 5,
    paddingTop: 2,
    paddingBottom: 1,
    fontWeight: '400',
  },
  otherBubbleReplyAnswerText: {
    fontSize: 15,
    color: '#0f172a',
    lineHeight: 21,
    paddingHorizontal: 5,
    paddingTop: 2,
    paddingBottom: 1,
  },
  otherMessageTime: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 3,
    marginLeft: 40,
    fontWeight: '500',
  },
  // رسائلي (Sent - النيلي الملكي الفاخر بدون أي إطار أو ظل)
  myMessageBlock: {
    alignSelf: 'flex-end',
    marginBottom: 10,
    maxWidth: '82%',
    alignItems: 'flex-end',
  },
  myBubble: {
    backgroundColor: '#5046e5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderBottomRightRadius: 6,
    minWidth: 54,
  },
  myBubbleText: {
    fontSize: 15,
    color: '#ffffff',
    lineHeight: 21,
    fontWeight: '400',
  },
  myBubbleLink: {
    color: '#93c5fd',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  myMessageTime: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  statusReceiptOuter: {
    marginRight: 6,
    marginBottom: 4,
    alignSelf: 'flex-end',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptBadgeUnread: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptBadgeRead: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.16,
    shadowRadius: 2,
    elevation: 1,
  },
  myMessageTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginRight: 4,
  },
  myMessageTimeDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 6,
  },
  myMessageTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  timePillUnread: {
    backgroundColor: '#f1f5f9',
  },
  timePillRead: {
    backgroundColor: '#eff6ff',
  },
  timePillTextUnread: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginLeft: 3,
  },
  timePillTextRead: {
    fontSize: 10,
    color: '#2563eb',
    fontWeight: '700',
    marginLeft: 3,
  },
  convReadBadge: {
    padding: 2,
  },
  convUnreadBadge: {
    padding: 2,
  },
  // شريط معاينة الرد فوق حقل الكتابة
  replyPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f0f2f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  replyPreviewLeftBar: {
    width: 3.5,
    height: '100%',
    minHeight: 28,
    backgroundColor: '#5046e5',
    borderRadius: 2,
    marginRight: 10,
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  replyPreviewSender: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5046e5',
    marginLeft: 4,
  },
  replyPreviewSnippet: {
    fontSize: 12,
    color: '#64748b',
  },
  replyPreviewCloseBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  replyPreviewCloseText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
  },
  // الحالة الفارغة للمحادثة
  emptyChatPrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 70,
  },
  emptyChatIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyChatPromptTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  emptyChatPromptText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  // الشريط السفلي للإدخال
  bottomBarContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f0f2f5',
  },
  plusCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
  },
  chatInputCapsule: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#f0f2f5',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    marginHorizontal: 8,
  },
  chatInputActual: {
    flex: 1,
    fontSize: 14.5,
    color: '#0f172a',
    marginRight: 8,
    maxHeight: 105,
    paddingTop: Platform.OS === 'ios' ? 4 : 6,
    paddingBottom: Platform.OS === 'ios' ? 4 : 6,
    textAlignVertical: 'center',
  },
  micBtnWrap: {
    paddingBottom: Platform.OS === 'ios' ? 4 : 7,
    paddingTop: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
  },
  sendCircleBtnIdle: {
    backgroundColor: '#f0f2f5',
  },
  sendCircleBtnActive: {
    backgroundColor: '#5046e5',
    shadowColor: '#5046e5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },

  // ----------------- ستايل صفحة بدء محادثة جديدة (New Chat Screen) -----------------
  newChatContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  newChatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  newChatHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  newChatSearchWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  newChatListWrap: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  newChatSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9ca3af',
    marginBottom: 12,
  },
  newChatUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  newChatUserInfo: {
    flex: 1,
    marginLeft: 14,
  },
  newChatUserName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  newChatUserEmail: {
    fontSize: 13,
    color: '#6b7280',
  },
  newChatActionBtn: {
    backgroundColor: '#ffe4e6',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
  },
  newChatActionText: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: '700',
  },
  noUserFoundBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  noUserFoundTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  noUserFoundDesc: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
  // ستايلات عرض ورفع الصور
  bubbleImageWrap: {
    width: 220,
    height: 185,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleImageWrapWithMargin: {
    marginBottom: 6,
  },
  bubbleImage: {
    width: 220,
    height: 185,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  bubbleImageOnly: {
    padding: 2.5,
    paddingHorizontal: 2.5,
    paddingVertical: 2.5,
    backgroundColor: '#5046e5',
    borderRadius: 20,
    borderBottomRightRadius: 6,
    overflow: 'hidden',
  },
  otherBubbleImageOnly: {
    padding: 2.5,
    paddingHorizontal: 2.5,
    paddingVertical: 2.5,
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    overflow: 'hidden',
  },
  bubbleImageWithCaption: {
    padding: 3,
    paddingHorizontal: 3,
    paddingTop: 3,
    paddingBottom: 10,
    backgroundColor: '#5046e5',
    borderRadius: 20,
    borderBottomRightRadius: 6,
  },
  otherBubbleImageWithCaption: {
    padding: 3,
    paddingHorizontal: 3,
    paddingTop: 3,
    paddingBottom: 10,
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
    borderBottomLeftRadius: 6,
  },
  // ستايلات عرض ورفع الفيديو داخل فقاعة المحادثة
  bubbleVideoWrap: {
    width: 224,
    height: 190,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#090d16',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleVideo: {
    width: 224,
    height: 190,
    borderRadius: 16,
    backgroundColor: '#090d16',
  },
  bubbleMediaWrapper: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  videoPlaceholderBackground: {
    width: 224,
    height: 190,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  videoUploadingText: {
    marginTop: 10,
    color: '#f8fafc',
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  bubbleCaptionText: {
    fontSize: 14.5,
    color: '#ffffff',
    lineHeight: 20,
    paddingHorizontal: 9,
    paddingTop: 4,
    fontWeight: '500',
  },
  otherBubbleCaptionText: {
    fontSize: 14.5,
    color: '#111827',
    lineHeight: 20,
    paddingHorizontal: 9,
    paddingTop: 4,
  },
  imageWaitingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 220,
    height: 185,
    backgroundColor: 'rgba(0, 0, 0, 0.40)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  imageWaitingSpinnerCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  imageWaitingBadge: {
    backgroundColor: 'rgba(17, 24, 39, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  imageWaitingBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  pendingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  imageInlineLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  imageViewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 24,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  imageViewerCloseText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  imageViewerFullImage: {
    width: '92%',
    height: '80%',
  },
  // ----------------- ستايل شاشة إدارة المهام والملف الشخصي وشريط التنقل -----------------
  mainAppContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  tasksContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  profileHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  profileHeaderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeaderAvatarLetter: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  profileHeaderTextWrap: {
    marginLeft: 10,
  },
  profileHeaderGreeting: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  profileHeaderName: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '700',
    maxWidth: 120,
  },
  tasksHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messagesHeaderPlusBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  chatPlusIconWrap: {
    position: 'relative',
  },
  messagesHeaderBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#e11d48',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  messagesHeaderBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  tasksScrollArea: {
    flex: 1,
  },
  tasksScrollContent: {
    paddingBottom: 116,
  },
  heroCard: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: '#0f172a',
    padding: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  heroCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroCardTextCol: {
    flex: 1,
    marginRight: 14,
  },
  heroCardBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  heroStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#e11d48',
    marginRight: 6,
  },
  heroStatusDotSuccess: {
    backgroundColor: '#10b981',
  },
  heroCardBadge: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroCardTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  heroPercentCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(225, 29, 72, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e11d48',
    flexShrink: 0,
  },
  heroPercentCircleSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  heroPercentText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  heroPercentTextSuccess: {
    color: '#34d399',
  },
  heroPercentLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
  heroProgressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  heroProgressBarFill: {
    height: '100%',
    backgroundColor: '#e11d48',
    borderRadius: 4,
  },
  heroProgressBarFillSuccess: {
    backgroundColor: '#10b981',
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  heroStatLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  categoryPillsScroll: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    marginBottom: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: '#f8fafc',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryPillText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  categoryPillTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  sectionHeaderWrap: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 12,
  },
  sectionHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  taskCountBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  taskCountBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  segmentBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  segmentBtnTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  taskCard: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  taskCardCompleted: {
    backgroundColor: '#fcfcfd',
    opacity: 0.75,
  },
  taskCheckBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  taskCheckBtnActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  taskContentWrap: {
    flex: 1,
  },
  taskCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  taskCardTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  taskCardDesc: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  taskTagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  taskTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  taskPriorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  taskPriorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  taskPriorityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  taskDueDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  taskDueDateText: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 4,
    fontWeight: '500',
  },
  taskActionsCol: {
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  taskActionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 50,
  },
  taskEmptyCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#fff1f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  taskEmptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  taskEmptyDesc: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 280,
  },
  taskEmptyAddBtn: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 22,
  },
  taskEmptyAddText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  fabBtn: {
    position: 'absolute',
    bottom: 98,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e11d48',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 10,
  },
  fabBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 28,
    left: 20,
    right: 20,
    height: 64,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  bottomNavItemActive: {},
  bottomNavText: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
    marginTop: 4,
  },
  bottomNavTextActive: {
    color: '#e11d48',
    fontWeight: '800',
  },
  bottomNavBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#e11d48',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  bottomNavBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  profileScreenContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  profileModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  profileModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  profileScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 60,
  },
  profileHeroCard: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  profileHeroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  profileHeroAvatarText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
  },
  profileOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22c55e',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  profileAvatarChatBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#e11d48',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#ffffff',
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  profileAvatarHintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fecdd3',
    marginTop: 10,
    gap: 6,
  },
  profileAvatarHintText: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: '700',
  },
  profileHeroName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  profileHeroEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  profileVerifiedBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  profileVerifiedText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  profileStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  profileStatCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  profileStatCardValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  profileStatCardLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
  },
  profileInfoSection: {
    marginBottom: 24,
  },
  profileSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  profileInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  profileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  profileInfoLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  profileInfoValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
    maxWidth: '60%',
    textAlign: 'right',
  },
  profileInfoDivider: {
    height: 1,
    backgroundColor: '#f8fafc',
  },
  profileActionsWrap: {
    gap: 12,
  },
  profileActionPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    paddingVertical: 15,
    borderRadius: 20,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  profileActionPrimaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  profileTestNotificationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    paddingVertical: 15,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  profileTestNotificationText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  profileLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff1f2',
    paddingVertical: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  profileLogoutText: {
    color: '#e11d48',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  taskModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  taskModalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '88%',
  },
  taskModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  taskModalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
  },
  taskModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    marginTop: 10,
  },
  taskInputText: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14.5,
    color: '#111827',
  },
  taskOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  taskOptionPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  taskOptionPillActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  taskOptionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  taskOptionPillTextActive: {
    color: '#ffffff',
  },
  taskModalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    gap: 12,
  },
  taskModalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  taskModalCancelText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '700',
  },
  taskModalSaveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  taskModalSaveText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  splashCenterContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogoImage: {
    width: 140,
    height: 140,
    marginBottom: 20,
  },
  splashBrandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  splashBrandSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  splashFooter: {
    position: 'absolute',
    bottom: 50,
  },
  // ----------------- ستايلات لوحة تحكم الأدمن (Admin Panel Styles) -----------------
  adminHeaderBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  adminHeaderBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  adminModalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  adminModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  adminModalHeaderTitleWrap: {
    alignItems: 'center',
  },
  adminTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  adminModalSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginTop: 2,
  },
  adminRefreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminRefreshBtnText: {
    fontSize: 16,
  },
  adminSearchWrap: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  adminSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  adminSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#111827',
  },
  adminUserCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  adminCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  adminAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  adminAvatarLetter: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  adminCardInfo: {
    flex: 1,
  },
  adminCardName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  adminCardEmail: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  adminBadge: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  adminBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  adminPasswordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  adminPasswordLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991b1b',
    marginRight: 8,
  },
  adminPasswordValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#dc2626',
    letterSpacing: 0.5,
  },
  adminStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  adminStatChip: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  adminStatChipTotal: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  adminStatNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  adminStatLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    marginTop: 2,
  },
  adminCardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  adminDeleteMsgsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff1f2',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecdd3',
    gap: 6,
  },
  adminDeleteMsgsBtnText: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: '700',
  },
  adminDeleteAccountBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e11d48',
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  adminDeleteAccountBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  // ----------------- ستايل النافذة المنبثقة المخصصة (Custom Alert Modal) -----------------
  customAlertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  customAlertContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 26,
    paddingTop: 26,
    paddingBottom: 22,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 24,
  },
  customAlertBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
  },
  customAlertTag: {
    paddingHorizontal: 12,
    paddingVertical: 3.5,
    borderRadius: 20,
    marginBottom: 10,
  },
  customAlertTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  customAlertTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  customAlertMessage: {
    fontSize: 14,
    fontWeight: '400',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 22,
    paddingHorizontal: 6,
  },
  customAlertBtnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  customAlertBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customAlertCancelBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  customAlertCancelBtnText: {
    color: '#475569',
    fontSize: 14.5,
    fontWeight: '600',
  },
  customAlertDestructiveBtn: {
    backgroundColor: '#e11d48',
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  customAlertPrimaryBtn: {
    backgroundColor: '#0f172a',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  customAlertSuccessBtn: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  customAlertActionBtnText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '700',
  },
  customAlertSingleBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  customAlertSingleBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  customAlertOptionList: {
    width: '100%',
    flexDirection: 'column',
    gap: 8,
  },
  customAlertOptionBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  customAlertOptionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customAlertOptionText: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#1e293b',
  },
  customAlertCancelFullBtn: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },

  // -------------------------------------------------------------
  // ستايلات ميزة التفاعل بالإيموجي الفاخرة (Emoji Reaction & Quick Actions)
  // -------------------------------------------------------------
  messageBlockWithReaction: {
    marginBottom: 14,
  },
  bubbleWithReaction: {
    minWidth: 50,
    paddingBottom: 8,
  },
  bubbleReactionBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 5,
    paddingVertical: 0,
    minWidth: 24,
    height: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  myBubbleReactionBadge: {
    right: 6,
  },
  otherBubbleReactionBadge: {
    left: 6,
  },
  bubbleReactionBadgeEmoji: {
    fontSize: 12.5,
    textAlign: 'center',
    includeFontPadding: false,
  },
  reactionOverlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 99999,
  },
  reactionOverlayBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  floatingReactionEmojisWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100005,
    elevation: 25,
  },
  floatingReactionEmojisCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    maxWidth: '96%',
    backgroundColor: '#ffffff',
    borderRadius: 35,
    paddingVertical: 6,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 25,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bottomReactionActionsWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100005,
    elevation: 35,
  },
  bottomReactionActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bottomReactionActionBtn: {
    marginHorizontal: 8,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomReactionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionEmojiBtn: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 1.5,
  },
  reactionEmojiBtnActive: {
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
  },
  reactionEmojiText: {
    fontSize: 20,
    textAlign: 'center',
    includeFontPadding: false,
  },
});