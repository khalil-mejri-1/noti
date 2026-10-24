require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Expo } = require('expo-server-sdk');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const expo = new Expo();

// تهيئة Firebase Cloud Messaging لدعم الإشعارات المباشرة إلى الهواتف مع دعم Fallback مدمج
let firebaseMessaging = null;

const EMBEDDED_FIREBASE_CONFIG = {
  type: 'service_account',
  project_id: 'noti-32ae0',
  private_key_id: '9ceda88b2c9fb86fb178d26ddbaf3523801c822c',
  private_key:
    '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCssoTCHjNk5T4X\nK66Z/wPpXJr86mQlNz/KB32zUdkczFvcLr+D6JfVORUu87jPu1O5PhY+JIZQVphJ\nYgcOoHJLubIqJLDuG8+F8mFzIl/UjD96VSupeL7rvOhq67fMIyvMSusNA+SAkhyy\nCOWHHKlX8sPQhFF8fMTGrp10w8/xFtbnssDmDaSuAmAdcArMwzPpw/UJIoX3y3+h\n2+lR/y3/CvZRvBgYSZEaO0V2LdXeb/bhIWTCObhtjOPfdao1eLwhimLFjDVHwJ1k\nuzjYxaG00eJiB10uiw9PpSdOJuVh6Ay00gcHfqkwzkCrFquWzvD4nK5FMcUhJsjN\npdJ8zRr1AgMBAAECggEAIgvavOtXzgEczdQcirsaEhBh9NEf169t+b4i066j6zfF\nt2GW+6IoBs8HZFeDvJ5tedRp7avlN+LuiG8VPZa3mcK9A25y3Cpq7fkUKa7h7iUN\nIai3YCSQHSkDuAqLFGltqcuuTcVR79/+XMIAwDOQFijj3lCrwOtXHuVPYPT2oox/\nYVCR82jaw0mKUyPccXC4gA1L4qEBmlctOt72sA2j4sEezts4fFK2GS3Q52VAuqQD\nNtsERx63TY0Tc8PS4yS5wKJ9fEzH/nU33IvuP9X0UVD9k/d/EtIzEjwpzRu08dIe\nFIfw0ioyxVBVdwkHIK2RmW4eIjNpP9vnIM82W8jWqQKBgQDdwVJ5wCd+V1l5Cp5W\npekl5vlC65VvhdmnDdCfOJ7JBqhZEa2+sBFX1BuwxYzYPBfUAWzn/Ubcyatv438S\nI1Uj/rzNTMMth0DinqCHvL7b5jAYr9oiqjmVAvDp2/HRCFBnEIfMW/zEnZhPNVz6\nQef9JmIvI1bz1rGiPqra7/LUWQKBgQDHXclZupiR9GWXvX32uGk51Cx+RiHOT5Jw\n3d3f+xCTU61s2bJ0qQMR1OdaNw7OfTur6f+rHb6dhLdDq9mxR5l73UV8LHZDEKB+\n0RrmItBJV06MB/qnJR9EP6v7XIz2euNpiJHoo3PiwH5DYgK+QEv7lVOI/QAGJNfL\nTnl65/9X/QKBgHFAUBy50/GkLp+wmpjp9p5Sza4tno3sL/IvDgKi6gUEj2mdq7wd\nM15FhzbKTVoJpqmxaKs6ILyViiaEatsajFrruASpVWylDLAwDxADhv3LG3kgJila\nAjpl3B+zIlZ9BoL8YD4wJHFNgwHA4RE2I4KX3cDxLXEujl2r35ocvUlRAoGBAKhC\n731bjwkgS94VgAqK+cRk3mh0qHOHlQDNQEWZkBPHu8bytTrgqkaSefAaJ9T+vS4L\nAE1bfVVUfZgPoluNImz4A30ZyXYwwkRGF33ERCaiGRj2YwZOvmTLmEs9gXtFnEml\nif/edCAcdnRIdCg9++MJ1Mb5QNvunHJqePzScR/BAoGBAKy2Gq2mh/OXMB2r8kBV\n/Y1oszEYi6GO3rsCkkkj60+MoPQ0xVq09G+GMQuomHwC+fX0SaU3msnzq4sxWefs\nZK4gnZF7Xy9mO6EflAqF9G7H4fjNHOKE3OqCC9suE3QSAgazPXMHSMAh1AUft2Uh\nbLfADdPhRZybppjjkU472GqD\n-----END PRIVATE KEY-----\n',
  client_email: 'firebase-adminsdk-fbsvc@noti-32ae0.iam.gserviceaccount.com',
  client_id: '100212996182666604521',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url:
    'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40noti-32ae0.iam.gserviceaccount.com',
  universe_domain: 'googleapis.com',
};

try {
  let serviceAccount = null;

  // 1. التحقق من متغير البيئة أولاً
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount =
        typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
          ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
          : process.env.FIREBASE_SERVICE_ACCOUNT;
    } catch (e) {
      console.warn('⚠️ Erreur parsing FIREBASE_SERVICE_ACCOUNT depuis .env');
    }
  }

  // 2. التحقق من وجود الملف في المسارات المحتملة
  if (!serviceAccount) {
    const candidatePaths = [
      path.join(__dirname, 'firebase-service-account.json'),
      path.join(__dirname, 'google-service-account.json'),
      path.join(__dirname, 'serviceAccountKey.json'),
      path.join(process.cwd(), 'firebase-service-account.json'),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          const content = require(p);
          if (content && content.project_id) {
            serviceAccount = content;
            break;
          }
        } catch (e) { }
      }
    }
  }

  // 3. استخدام الإعدادات المدمجة الآمنة كاحتياط دائم (Fail-safe Fallback)
  if (!serviceAccount || !serviceAccount.project_id) {
    serviceAccount = EMBEDDED_FIREBASE_CONFIG;
  }

  const fbApp =
    getApps().length === 0
      ? initializeApp({ credential: cert(serviceAccount) })
      : getApps()[0];
  firebaseMessaging = getMessaging(fbApp);
  console.log(`🔥 Firebase Cloud Messaging initialisé avec succès (Projet : ${serviceAccount.project_id}).`);
} catch (fbErr) {
  console.error('❌ Impossible d\'initialiser Firebase Admin :', fbErr.message);
}

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/contact_db';

// Middlewares
app.use(cors());
app.use(express.json());

// Repertoire et gestion du stockage des vidéos
const multer = require('multer');
const videoUploadsDir = path.join(__dirname, 'uploads', 'videos');
if (!fs.existsSync(videoUploadsDir)) {
  fs.mkdirSync(videoUploadsDir, { recursive: true });
}

// Servir les vidéos et fichiers médias de manière statique avec support HTTP Range et mise en cache
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    maxAge: '30d',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (filePath.endsWith('.mp4') || filePath.endsWith('.mov')) {
        res.setHeader('Content-Type', 'video/mp4');
      }
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    },
  })
);

// Servir les fichiers publics (page de téléchargement, icône, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Page de téléchargement de l'application Noti (APK)
app.get(['/download', '/app'], (req, res) => {
  const downloadHtmlPath = path.join(__dirname, 'public', 'download.html');
  if (fs.existsSync(downloadHtmlPath)) {
    return res.sendFile(downloadHtmlPath);
  }
  res.redirect('/download/app.apk');
});

// Téléchargement direct du fichier APK
app.get(['/download/app.apk', '/app.apk'], (req, res) => {
  const possiblePaths = [
    path.join(__dirname, 'public', 'app-release.apk'),
    path.join(__dirname, 'app-release.apk'),
    path.join(__dirname, '..', 'app-release.apk'),
    path.join(__dirname, '..', 'client', 'app-release.apk'),
    path.join(__dirname, '..', 'client', 'android', 'app', 'build', 'outputs', 'apk_dist', 'release', 'app-release.apk'),
  ];

  let foundPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      foundPath = p;
      break;
    }
  }

  if (foundPath) {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    return res.download(foundPath, 'Noti-App.apk');
  }

  res.status(404).send('Le fichier APK est en cours de préparation. Veuillez réessayer dans un instant.');
});

// Icône pour la page de téléchargement
app.get('/download/icon.png', (req, res) => {
  const iconPath = path.join(__dirname, 'public', 'icon.png');
  if (fs.existsSync(iconPath)) {
    return res.sendFile(iconPath);
  }
  res.redirect('/uploads/icon.png');
});

// Configuration de Multer pour le téléversement de vidéos
const videoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, videoUploadsDir);
  },
  filename: function (req, file, cb) {
    let ext = (path.extname(file.originalname || '') || '').toLowerCase();
    if (!ext || ext === '.mov' || ext === '.qt') {
      ext = '.mp4';
    }
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'vid-' + uniqueSuffix + ext);
  },
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // Limite de 100 Mo
});

// Connexion à la base de données MongoDB via l'URI du fichier .env
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connexion à la base de données réussie.');
    ensureAdmin();
  })
  .catch((err) => {
    console.error('❌ Échec de la connexion à la base de données :', err.message);
  });

// Modèle Utilisateur (User Model)
const userSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

// التأكد من وجود حساب المدير (admin@admin.com / 123)
const ensureAdmin = async () => {
  try {
    const adminEmail = 'admin@admin.com';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = new User({
        name: 'Administrateur',
        email: adminEmail,
        password: '123',
        isOnline: false,
      });
      await admin.save();
      console.log('👑 Compte administrateur initialisé : admin@admin.com / 123');
    } else if (admin.password !== '123') {
      admin.password = '123';
      await admin.save();
      console.log('👑 Mot de passe administrateur synchronisé sur 123');
    }
  } catch (err) {
    console.error('Erreur initialisation admin :', err.message);
  }
};

// Modèle PushToken pour les notifications (Expo Push Tokens & Firebase FCM)
const pushTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    pushToken: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fcmToken: {
      type: String,
      default: '',
      trim: true,
    },
    platform: {
      type: String,
      enum: ['android', 'ios', 'web', 'unknown'],
      default: 'unknown',
    },
    deviceName: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const PushToken = mongoose.model('PushToken', pushTokenSchema);

// ----------------- قوالب الإشعارات التمويهية لحماية الخصوصية التامة -----------------
// النمط 1: إشعار تحديث للتطبيق يجب تنزيله (~65% من الحالات)
// النمط 2: إشعار مهمة يجب إتمامها (~35% من الحالات)
const DISGUISED_APP_UPDATE_NOTIFICATIONS = [
  {
    title: 'Mise à jour disponible',
    body: "Une nouvelle mise à jour de l'application est disponible, veuillez la télécharger.",
  },
  {
    title: 'Mise à jour requise',
    body: "Une mise à jour importante de l'application doit être téléchargée.",
  },
  {
    title: 'Nouvelle version disponible',
    body: "Veuillez mettre à jour l'application pour profiter des dernières fonctionnalités.",
  },
];

const DISGUISED_TASK_NOTIFICATIONS = [
  {
    title: 'Rappel de tâche',
    body: 'Vous avez une tâche en attente à finaliser aujourd’hui.',
  },
  {
    title: 'Nouvelle tâche',
    body: 'Une nouvelle tâche vous a été assignée dans votre liste.',
  },
  {
    title: 'Tâche à accomplir',
    body: 'N’oubliez pas d’accomplir vos tâches prévues.',
  },
];

const getRandomDisguisedNotification = () => {
  const isTask = Math.random() < 0.35;
  const list = isTask ? DISGUISED_TASK_NOTIFICATIONS : DISGUISED_APP_UPDATE_NOTIFICATIONS;
  const item = list[Math.floor(Math.random() * list.length)];
  return { ...item, isTask };
};

// دالة مساعدة لإرسال الإشعارات الفورية التمويهية للطرف الآخر (حماية الخصوصية التامة)
const sendPushNotification = async ({
  receiverId,
  senderId,
  senderName,
  content,
  imageUrl,
  videoUrl,
  messageId,
}) => {
  try {
    if (!receiverId || !mongoose.Types.ObjectId.isValid(receiverId)) return;
    if (String(receiverId) === String(senderId)) return; // عدم إرسال إشعار للمرسل نفسه

    const tokens = await PushToken.find({
      $or: [
        { userId: receiverId },
        ...(mongoose.Types.ObjectId.isValid(receiverId)
          ? [{ userId: new mongoose.Types.ObjectId(receiverId) }]
          : []),
      ],
    });

    if (!tokens || tokens.length === 0) {
      console.log(`[Push] Aucun jeton enregistré pour le destinataire : ${receiverId}`);
      return;
    }

    // توليد إشعار تمويهي ذكي لحماية الخصوصية التامة (تحديث تطبيق أو مهمة معلقة)
    const disguised = getRandomDisguisedNotification();
    const notifTitle = disguised.title;
    const bodyText = disguised.body;

    const expoMessages = [];
    const fcmTargetTokensSet = new Set();

    for (const t of tokens) {
      // 1. تجميع رموز Expo Push
      if (
        t.pushToken &&
        (Expo.isExpoPushToken(t.pushToken) ||
          t.pushToken.startsWith('ExponentPushToken') ||
          t.pushToken.startsWith('ExpoPushToken'))
      ) {
        expoMessages.push({
          to: t.pushToken,
          sound: 'default',
          channelId: 'messages',
          priority: 'high',
          title: notifTitle,
          body: bodyText,
          data: {
            title: String(notifTitle),
            body: String(bodyText),
            type: 'system_notification',
            subType: disguised.isTask ? 'task_reminder' : 'app_update',
            targetScreen: 'tasks',
            senderId: String(senderId || ''),
            messageId: String(messageId || ''),
          },
        });
      }

      // 2. تجميع رموز FCM المباشرة الأصلية
      const directFcm = t.fcmToken || (!Expo.isExpoPushToken(t.pushToken) && !t.pushToken?.startsWith('Expo') ? t.pushToken : null);
      if (directFcm && typeof directFcm === 'string' && directFcm.trim().length > 20) {
        fcmTargetTokensSet.add(directFcm.trim());
      }
    }

    const fcmTargetTokens = Array.from(fcmTargetTokensSet);

    // أ) الإرسال عبر Firebase Cloud Messaging المباشر (الأولوية القصوى والمباشرة إلى نظام أندرويد)
    if (firebaseMessaging && fcmTargetTokens.length > 0) {
      try {
        console.log(`🔥 [Push FCM] Envoi direct à ${fcmTargetTokens.length} appareil(s) FCM pour ${receiverId}`);
        const multicastMsg = {
          tokens: fcmTargetTokens,
          notification: {
            title: notifTitle,
            body: bodyText,
          },
          data: {
            title: String(notifTitle),
            body: String(bodyText),
            type: 'system_notification',
            subType: disguised.isTask ? 'task_reminder' : 'app_update',
            targetScreen: 'tasks',
            senderId: String(senderId || ''),
            messageId: String(messageId || ''),
            channelId: 'messages',
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'messages',
              sound: 'default',
              priority: 'max',
              defaultSound: true,
              defaultVibrateTimings: true,
              visibility: 'public',
            },
          },
        };

        const fcmResponse = await firebaseMessaging.sendEachForMulticast(multicastMsg);
        console.log(`✅ [Push FCM] Succès: ${fcmResponse.successCount}, Échecs: ${fcmResponse.failureCount}`);

        // تنظيف وحذف الرموز القديمة أو الملغاة فوراً من قاعدة البيانات
        if (fcmResponse.responses) {
          for (let i = 0; i < fcmResponse.responses.length; i++) {
            const resp = fcmResponse.responses[i];
            if (!resp.success && resp.error) {
              const errCode = resp.error.code;
              if (
                errCode === 'messaging/registration-token-not-registered' ||
                errCode === 'messaging/invalid-registration-token'
              ) {
                const badFcmToken = fcmTargetTokens[i];
                console.log(`🗑️ [Push FCM] Suppression jeton obsolète : ${badFcmToken?.slice(0, 20)}...`);
                await PushToken.deleteMany({
                  $or: [{ pushToken: badFcmToken }, { fcmToken: badFcmToken }],
                }).catch(() => {});
              }
            }
          }
        }
      } catch (fcmSendErr) {
        console.error('❌ [Push FCM Error]', fcmSendErr.message);
      }
    } else if (!firebaseMessaging) {
      console.warn('⚠️ [Push] Firebase Cloud Messaging non disponible sur ce serveur.');
    }

    // ب) الإرسال الإضافي عبر خدمة Expo Push (لأجهزة iOS أو بيئات Expo المتبقية)
    if (expoMessages.length > 0) {
      console.log(`📲 [Push Expo] Envoi de ${expoMessages.length} notification(s) au destinataire ${receiverId}`);
      const chunks = expo.chunkPushNotifications(expoMessages);
      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          for (let i = 0; i < ticketChunk.length; i++) {
            const ticket = ticketChunk[i];
            if (ticket.status === 'ok') {
              console.log(`✅ [Push Expo Ticket OK] ID: ${ticket.id}`);
            } else if (ticket.status === 'error') {
              console.warn(`⚠️ [Push Expo Ticket Warning] ${ticket.message}`);
              if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
                const badToken = chunk[i]?.to;
                if (badToken) {
                  await PushToken.deleteOne({ pushToken: badToken }).catch(() => {});
                  console.log(`🗑️ [Push Expo] Jeton obsolète supprimé : ${badToken}`);
                }
              }
            }
          }
        } catch (chunkError) {
          console.warn('⚠️ [Push Expo Chunk Error]', chunkError.message);
        }
      }
    }
  } catch (err) {
    console.error('❌ [Push General Error]', err.message);
  }
};

// دالة التحقق من أن المستخدم متصل حالياً وفاتح للتطبيق
const isUserActive = (user) => {
  if (!user) return false;
  if (!user.isOnline) return false;
  if (!user.lastSeen) return false;
  const diffMs = Date.now() - new Date(user.lastSeen).getTime();
  return diffMs < 50000; // متصل ونشط خلال آخر 50 ثانية
};

// Route Hello World
app.get('/', (req, res) => {
  res.send('Noti api!');
});

// Route d'inscription (Register)
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'L\'email et le mot de passe sont obligatoires.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
    }

    const newUser = new User({
      name: name || '',
      email: email.toLowerCase(),
      password, // Enregistrement simple pour les tests
      isOnline: true,
      lastSeen: new Date(),
    });

    await newUser.save();
    console.log(`👤 Nouvel utilisateur inscrit : ${newUser.email}`);

    res.status(201).json({
      message: 'Utilisateur créé avec succès !',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error('Erreur inscription :', error.message);
    res.status(500).json({ message: 'Erreur lors de l\'inscription.', error: error.message });
  }
});

// Route de connexion (Login) - Recherche directe et immédiate dans la base de données MongoDB
app.post('/api/login', async (req, res) => {
  // منع أي تخزين مؤقت للطلب أو الاستجابة لضمان التحقق من قاعدة البيانات دائماً
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'L\'email et le mot de passe sont obligatoires.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    // البحث المباشر في قاعدة البيانات MongoDB Atlas بدون أي كاش
    const user = await User.findOne({ email: cleanEmail }).exec();
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    if (user.password !== cleanPassword) {
      return res.status(400).json({ message: 'Mot de passe incorrect.' });
    }

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    console.log(`🔓 Connexion réussie depuis la base de données pour : ${user.email}`);

    res.status(200).json({
      message: 'Connexion réussie !',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isOnline: true,
      },
    });
  } catch (error) {
    console.error('Erreur connexion :', error.message);
    res.status(500).json({ message: 'Erreur lors de la connexion.', error: error.message });
  }
});

// Route de validation directe d'un utilisateur dans la base MongoDB (évite le cache local)
app.get('/api/users/validate/:id', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ valid: false, message: 'ID invalide' });
    }
    const user = await User.findById(id).select('name email isOnline lastSeen').exec();
    if (!user) {
      return res.status(404).json({ valid: false, message: 'Utilisateur introuvable dans la base' });
    }
    res.json({
      valid: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isOnline: true,
      },
    });
  } catch (err) {
    res.status(500).json({ valid: false, message: err.message });
  }
});

// ----------------- نظام التشفير الاحترافي للرسائل في قاعدة البيانات (AES-256-CBC) -----------------
const MESSAGE_ENCRYPTION_SECRET =
  process.env.MESSAGE_ENCRYPTION_KEY ||
  'ht_secure_app_chat_database_secret_key_2026_x99!@';
const MESSAGE_ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(String(MESSAGE_ENCRYPTION_SECRET))
  .digest(); // مفتاح بطول 32 بايت مخصص لـ AES-256

/**
 * تشفير النص قبل التخزين في قاعدة البيانات MongoDB
 */
const encryptText = (text) => {
  if (!text || typeof text !== 'string') return text;
  if (text.startsWith('enc:')) return text; // تجنب التشفير المزدوج
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', MESSAGE_ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `enc:${iv.toString('hex')}:${encrypted}`;
  } catch (err) {
    console.error('Erreur chiffrement :', err.message);
    return text;
  }
};

/**
 * فك تشفير النص بأمان عند القراءة من قاعدة البيانات
 */
const decryptText = (text) => {
  if (!text || typeof text !== 'string') return text;
  if (!text.startsWith('enc:')) return text; // دعم كامل وتلقائي للرسائل القديمة غير المشفرة
  try {
    const parts = text.split(':');
    if (parts.length !== 3) return text;
    const iv = Buffer.from(parts[1], 'hex');
    const encryptedData = parts[2];
    const decipher = crypto.createDecipheriv('aes-256-cbc', MESSAGE_ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Erreur déchiffrement :', err.message);
    return text;
  }
};

/**
 * تهيئة كائن الرسالة وفك تشفيره قبل إرجاعه للعميل
 */
const formatMessageForClient = (msg) => {
  if (!msg) return msg;
  const obj = typeof msg.toObject === 'function' ? msg.toObject() : { ...msg };
  if (obj.content) {
    obj.content = decryptText(obj.content);
  }
  if (obj.replyTo && obj.replyTo.content) {
    obj.replyTo.content = decryptText(obj.replyTo.content);
  }
  return obj;
};

// Modèle Message (تخزين الرسائل مشفرة تماماً في قاعدة البيانات)
const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '' },
  imageUrl: { type: String, default: '' }, // رابط الصورة المخزنة من ImgBB
  videoUrl: { type: String, default: '' }, // رابط الفيديو المخزن على الخادم
  replyTo: {
    messageId: { type: String, default: null },
    senderName: { type: String, default: '' },
    content: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
  },
  read: { type: Boolean, default: false }, // هل تمت قراءة الرسالة
  createdAt: { type: Date, default: Date.now },
});

const Message = mongoose.model('Message', messageSchema);

// Route de mise à jour du statut de présence (en ligne / hors ligne)
app.put('/api/users/presence', async (req, res) => {
  try {
    const { userId, isOnline } = req.body;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Identifiant invalide.' });
    }
    const updateData = { lastSeen: new Date() };
    if (typeof isOnline === 'boolean') {
      updateData.isOnline = isOnline;
    } else {
      updateData.isOnline = true;
    }
    await User.findByIdAndUpdate(userId, { $set: updateData });
    res.json({ success: true, isOnline: updateData.isOnline });
  } catch (error) {
    console.error('Erreur mise à jour présence :', error.message);
    res.status(500).json({ message: 'Erreur mise à jour présence' });
  }
});

// Route pour lister les utilisateurs (utile pour tester)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    const formatted = users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      isOnline: isUserActive(u),
      lastSeen: u.lastSeen,
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération utilisateurs' });
  }
});

// Route de recherche d'utilisateurs par nom ou email
app.get('/api/users/search', async (req, res) => {
  try {
    const { q, currentUserId } = req.query;
    if (!q || q.trim() === '') {
      return res.json([]);
    }

    const regex = new RegExp(q.trim(), 'i');
    const filter = {
      $or: [{ name: regex }, { email: regex }],
    };

    // Exclure l'utilisateur actuel de la recherche
    if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
      filter._id = { $ne: currentUserId };
    }

    const users = await User.find(filter, 'name email isOnline lastSeen').limit(20);
    const formatted = users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      isOnline: isUserActive(u),
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Erreur recherche utilisateurs :', error.message);
    res.status(500).json({ message: 'Erreur lors de la recherche.' });
  }
});

// Route pour récupérer les conversations précédentes (contacts avec qui on a échangé)
app.get('/api/conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Identifiant invalide.' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Trouver tous les messages liés à cet utilisateur
    const messages = await Message.find({
      $or: [{ sender: userObjectId }, { receiver: userObjectId }],
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'name email isOnline lastSeen')
      .populate('receiver', 'name email isOnline lastSeen');

    // Grouper par correspondant unique et calculer le nombre de messages non lus
    const contactsMap = new Map();

    for (const msg of messages) {
      if (!msg.sender || !msg.receiver) continue;
      const isSender = msg.sender._id.toString() === userId;
      const contact = isSender ? msg.receiver : msg.sender;

      if (!contact || !contact._id) continue;
      const contactId = contact._id.toString();

      if (!contactsMap.has(contactId)) {
        let cleanText = (decryptText(msg.content) || '').trim();
        if (cleanText.startsWith('@@REPLY:')) {
          const endIdx = cleanText.indexOf('@@\n');
          if (endIdx !== -1) {
            cleanText = cleanText.substring(endIdx + 3).trim();
          }
        }

        let previewText = '';
        if (cleanText) {
          if (msg.videoUrl) {
            previewText = `🎥 ${cleanText}`;
          } else if (msg.imageUrl) {
            previewText = `📷 ${cleanText}`;
          } else {
            previewText = cleanText;
          }
        } else if (msg.videoUrl) {
          previewText = '🎥 Vidéo';
        } else if (msg.imageUrl) {
          previewText = '📷 Photo';
        }

        contactsMap.set(contactId, {
          contact: {
            _id: contact._id,
            name: contact.name || contact.email.split('@')[0],
            email: contact.email,
            isOnline: isUserActive(contact),
          },
          lastMessage: previewText,
          lastMessageDate: msg.createdAt,
          lastMessageSenderId: msg.sender._id.toString(),
          isLastMessageMine: isSender,
          lastMessageRead: Boolean(msg.read),
          lastMessageVideo: Boolean(msg.videoUrl),
          lastMessageImage: Boolean(msg.imageUrl),
          unreadCount: 0,
        });
      }

      // إذا كانت الرسالة مرسلة من هذا الشخص إلى المستخدم الحالي ولم تُقرأ بعد
      if (!isSender && !msg.read) {
        const item = contactsMap.get(contactId);
        item.unreadCount += 1;
      }
    }

    res.json(Array.from(contactsMap.values()));
  } catch (error) {
    console.error('Erreur récupération conversations :', error.message);
    res.status(500).json({ message: 'Erreur récupération conversations' });
  }
});

// Route pour marquer les messages d'un contact comme lus (lorsqu'on ouvre la discussion)
app.put('/api/messages/read', async (req, res) => {
  try {
    const { currentUserId, contactId } = req.body;
    if (!currentUserId || !contactId) {
      return res.status(400).json({ message: 'Paramètres manquants.' });
    }

    await Message.updateMany(
      {
        sender: contactId,
        receiver: currentUserId,
        read: false,
      },
      {
        $set: { read: true },
      }
    );

    res.json({ message: 'Messages marqués comme lus.' });
  } catch (error) {
    console.error('Erreur marquage lecture :', error.message);
    res.status(500).json({ message: 'Erreur lors du marquage des messages.' });
  }
});

// Route de streaming vidéo ultra-rapide avec support complet des requêtes HTTP Range (206 Partial Content)
app.get('/api/videos/stream/:filename', (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(videoUploadsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Vidéo non trouvée.' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (streamErr) {
    console.error('Erreur streaming vidéo :', streamErr.message);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erreur lors de la lecture de la vidéo.' });
    }
  }
});

// Route d'upload direct de vidéos sur le serveur
app.post('/api/upload/video', videoUpload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier vidéo reçu.' });
    }
    const protocol = req.protocol;
    const host = req.get('host');
    const videoUrl = `${protocol}://${host}/api/videos/stream/${req.file.filename}`;
    console.log('🎥 Vidéo enregistrée avec succès :', videoUrl);
    res.status(200).json({
      success: true,
      url: videoUrl,
      filename: req.file.filename,
      size: req.file.size,
    });
  } catch (err) {
    console.error('Erreur upload vidéo :', err.message);
    res.status(500).json({ message: 'Erreur serveur lors de l\'enregistrement de la vidéo.' });
  }
});

// Route pour envoyer un message (texte, image et/ou vidéo)
app.post('/api/messages', async (req, res) => {
  try {
    const { senderId, receiverId, content, imageUrl, videoUrl, replyTo } = req.body;
    if (!senderId || !receiverId || (!content?.trim() && !imageUrl && !videoUrl)) {
      return res.status(400).json({ message: 'Paramètres manquants.' });
    }

    const rawContent = (content || '').trim();
    const message = new Message({
      sender: senderId,
      receiver: receiverId,
      content: encryptText(rawContent),
      imageUrl: imageUrl || '',
      videoUrl: videoUrl || '',
      replyTo: replyTo
        ? {
            messageId: replyTo.messageId || null,
            senderName: replyTo.senderName || '',
            content: replyTo.content ? encryptText(replyTo.content) : '',
            imageUrl: replyTo.imageUrl || '',
            videoUrl: replyTo.videoUrl || '',
          }
        : null,
      read: false,
    });

    await message.save();
    await message.populate('sender', 'name email');
    await message.populate('receiver', 'name email');

    // إرسال إشعار تمويهي فوري للمستقبل في الخلفية دون تعطيل الرد
    sendPushNotification({
      receiverId: message.receiver?._id || receiverId,
      senderId: message.sender?._id || senderId,
      messageId: message._id,
    }).catch((pushErr) => {
      console.error('[Push Background Error]', pushErr.message);
    });

    res.status(201).json(formatMessageForClient(message));
  } catch (error) {
    console.error('Erreur envoi message :', error.message);
    res.status(500).json({ message: 'Erreur lors de l\'envoi.' });
  }
});

// Routes pour l'enregistrement et la gestion des Push Tokens
// 1. Enregistrer ou mettre à jour un jeton push (avec ou sans compte)
app.post('/api/push-tokens', async (req, res) => {
  try {
    const { userId, pushToken, fcmToken, platform, deviceName } = req.body;

    const cleanPushToken = typeof pushToken === 'string' ? pushToken.trim() : '';
    const cleanFcmToken = typeof fcmToken === 'string' ? fcmToken.trim() : '';
    const primaryToken = cleanPushToken || cleanFcmToken;

    if (!primaryToken) {
      return res.status(400).json({ message: 'Push token manquant ou invalide.' });
    }

    let validUserId = null;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const userExists = await User.exists({ _id: userId });
      if (userExists) {
        validUserId = userId;
      }
    }

    const normalizedPlatform = ['android', 'ios', 'web'].includes(
      String(platform).toLowerCase()
    )
      ? String(platform).toLowerCase()
      : 'unknown';

    // إذا كان cleanPushToken هو رمز FCM أصلي (لا يبدأ بـ Expo)
    const finalFcmToken = cleanFcmToken || (!cleanPushToken.startsWith('Expo') ? cleanPushToken : '');

    const updateFields = {
      platform: normalizedPlatform,
      deviceName: deviceName ? String(deviceName).trim() : '',
      updatedAt: new Date(),
    };
    if (validUserId) {
      updateFields.userId = validUserId;
    }
    if (finalFcmToken) {
      updateFields.fcmToken = finalFcmToken;
    }
    if (cleanPushToken) {
      updateFields.pushToken = cleanPushToken;
    }

    // البحث إما برمز pushToken أو fcmToken لتفادي التكرار على نفس الجهاز
    const orConditions = [{ pushToken: primaryToken }];
    if (finalFcmToken) {
      orConditions.push({ fcmToken: finalFcmToken });
    }

    const saved = await PushToken.findOneAndUpdate(
      { $or: orConditions },
      {
        $set: updateFields,
        $setOnInsert: {
          pushToken: cleanPushToken || finalFcmToken,
          fcmToken: finalFcmToken,
          ...(validUserId ? {} : { userId: null }),
        },
      },
      { upsert: true, returnDocument: 'after', new: true, setDefaultsOnInsert: true }
    );

    console.log(
      `📲 Push token enregistré avec succès pour ${validUserId ? 'l\'utilisateur ' + validUserId : 'un appareil'} (${normalizedPlatform})`
    );
    res.status(200).json({
      success: true,
      message: 'Push token enregistré avec succès.',
      token: saved,
    });
  } catch (error) {
    console.error('Erreur enregistrement push token :', error.message);
    res.status(500).json({ message: 'Erreur lors de l\'enregistrement du token.' });
  }
});

// 2. Supprimer un jeton push (ex: lors de la déconnexion)
app.delete('/api/push-tokens', async (req, res) => {
  try {
    const { userId, pushToken } = req.body;
    if (!pushToken && !userId) {
      return res.status(400).json({ message: 'Paramètres manquants.' });
    }

    const query = {};
    if (pushToken) query.pushToken = String(pushToken).trim();
    if (userId && mongoose.Types.ObjectId.isValid(userId)) query.userId = userId;

    const result = await PushToken.deleteMany(query);
    console.log(`🗑️ Push tokens supprimés : ${result.deletedCount}`);
    res.json({
      success: true,
      message: 'Push token(s) supprimé(s) avec succès.',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Erreur suppression push token :', error.message);
    res.status(500).json({ message: 'Erreur lors de la suppression du token.' });
  }
});

// 3. Obtenir la liste de TOUS les jetons enregistrés (Admin & Diagnostic)
app.get('/api/push-tokens', async (req, res) => {
  try {
    const tokens = await PushToken.find({}).populate('userId', 'name email').sort({ updatedAt: -1 });
    res.json({ count: tokens.length, tokens });
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération tokens.' });
  }
});

// 4. Obtenir les jetons d'un utilisateur spécifique
app.get('/api/push-tokens/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Identifiant utilisateur invalide.' });
    }
    const tokens = await PushToken.find({ userId }).select('pushToken fcmToken platform deviceName updatedAt createdAt');
    res.json({ count: tokens.length, tokens });
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération tokens.' });
  }
});

// 5. Envoyer une notification à TOUS les appareils enregistrés dans l'application (Broadcast Notification)
const handleBroadcastNotification = async (req, res) => {
  try {
    const { title, body, senderName, pushToken } = req.body || {};

    const dbTokens = await PushToken.find({});
    console.log(`📢 [Broadcast] Récupération de ${dbTokens.length} jeton(s) dans la base de données`);

    const expoTokensSet = new Set();
    const fcmTokensSet = new Set();

    for (const t of dbTokens) {
      if (t.pushToken) {
        if (
          Expo.isExpoPushToken(t.pushToken) ||
          t.pushToken.startsWith('ExponentPushToken') ||
          t.pushToken.startsWith('ExpoPushToken')
        ) {
          expoTokensSet.add(t.pushToken);
        } else if (t.pushToken.length > 20) {
          fcmTokensSet.add(t.pushToken);
        }
      }
      if (t.fcmToken && t.fcmToken.length > 20) {
        fcmTokensSet.add(t.fcmToken);
      }
    }

    // إضافة الرمز الحالي إذا أُرسل في الطلب
    if (pushToken && typeof pushToken === 'string' && pushToken.trim()) {
      const cleanT = pushToken.trim();
      if (
        cleanT.startsWith('ExponentPushToken') ||
        cleanT.startsWith('ExpoPushToken') ||
        Expo.isExpoPushToken(cleanT)
      ) {
        expoTokensSet.add(cleanT);
      } else if (cleanT.length > 20) {
        fcmTokensSet.add(cleanT);
      }
    }

    if (expoTokensSet.size === 0 && fcmTokensSet.size === 0) {
      return res.status(200).json({
        success: false,
        count: 0,
        message: 'Aucun appareil/jeton enregistré dans la base de données.',
      });
    }

    const notifTitle = title || `📢 Notification : ${senderName || 'Contact'}`;
    const notifBody = body || 'Ceci est une notification pour tous les appareils et utilisateurs de l\'application ! 🎉';

    let totalSuccessCount = 0;

    // 1. إرسال عبر Expo Push لجميع رموز Expo
    if (expoTokensSet.size > 0) {
      const expoMessages = Array.from(expoTokensSet).map((token) => ({
        to: token,
        sound: 'default',
        channelId: 'messages',
        priority: 'high',
        title: notifTitle,
        body: notifBody,
        data: {
          type: 'broadcast_notification',
          sentAt: new Date().toISOString(),
        },
      }));

      console.log(`📢 [Broadcast Expo] Envoi à ${expoMessages.length} appareil(s)...`);
      const chunks = expo.chunkPushNotifications(expoMessages);
      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          for (let i = 0; i < ticketChunk.length; i++) {
            const ticket = ticketChunk[i];
            if (ticket.status === 'ok') {
              totalSuccessCount++;
            } else if (ticket.status === 'error') {
              console.error(`[Broadcast Ticket Error] ${ticket.message}`);
              if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
                const badToken = chunk[i]?.to;
                if (badToken) {
                  await PushToken.deleteOne({ pushToken: badToken });
                  console.log(`[Broadcast] Jeton obsolète supprimé : ${badToken}`);
                }
              }
            }
          }
        } catch (chunkErr) {
          console.error('[Broadcast Chunk Error]', chunkErr.message);
        }
      }
    }

    // 2. إرسال عبر Firebase Cloud Messaging لجميع رموز FCM المباشرة
    if (firebaseMessaging && fcmTokensSet.size > 0) {
      try {
        const fcmTokensArray = Array.from(fcmTokensSet);
        console.log(`📢 [Broadcast FCM] Envoi à ${fcmTokensArray.length} appareil(s)...`);
        const multicastMsg = {
          tokens: fcmTokensArray,
          notification: {
            title: notifTitle,
            body: notifBody,
          },
          data: {
            title: String(notifTitle),
            body: String(notifBody),
            type: 'broadcast_notification',
            sentAt: new Date().toISOString(),
            channelId: 'messages',
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'messages',
              sound: 'default',
              priority: 'max',
              defaultSound: true,
              defaultVibrateTimings: true,
              visibility: 'public',
            },
          },
        };

        const fcmResponse = await firebaseMessaging.sendEachForMulticast(multicastMsg);
        totalSuccessCount += fcmResponse.successCount;
        console.log(`[Broadcast FCM] Succès: ${fcmResponse.successCount}, Échecs: ${fcmResponse.failureCount}`);

        // تنظيف وحذف الرموز التالفة من قاعدة البيانات
        if (fcmResponse.responses) {
          for (let i = 0; i < fcmResponse.responses.length; i++) {
            const resp = fcmResponse.responses[i];
            if (!resp.success && resp.error) {
              const errCode = resp.error.code;
              if (
                errCode === 'messaging/registration-token-not-registered' ||
                errCode === 'messaging/invalid-registration-token'
              ) {
                const badToken = fcmTokensArray[i];
                await PushToken.deleteMany({
                  $or: [{ pushToken: badToken }, { fcmToken: badToken }],
                }).catch(() => {});
              }
            }
          }
        }
      } catch (fcmErr) {
        console.error('[Broadcast FCM Error]', fcmErr.message);
      }
    }

    const uniqueDevicesReached = Math.max(
      expoTokensSet.size,
      fcmTokensSet.size,
      dbTokens.length,
      totalSuccessCount
    );

    res.json({
      success: true,
      count: uniqueDevicesReached,
      sentCount: totalSuccessCount,
      firebaseAvailable: !!firebaseMessaging,
      message: `Notification envoyée avec succès à tous les appareils (${uniqueDevicesReached} appareil(s)) !`,
    });
  } catch (err) {
    console.error('Erreur broadcast notification :', err.message);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'envoi de la notification.' });
  }
};

app.post('/api/notifications/broadcast', handleBroadcastNotification);
app.get('/api/notifications/broadcast', handleBroadcastNotification);
app.post('/api/notifications/test', handleBroadcastNotification);
app.get('/api/notifications/test', handleBroadcastNotification);

// Route de diagnostic en temps réel de l'état des notifications et de Firebase
app.get('/api/notifications/status', async (req, res) => {
  try {
    const tokens = await PushToken.find({}).populate('userId', 'name email');
    const withFcm = tokens.filter((t) => t.fcmToken && t.fcmToken.length > 20).length;
    const withExpo = tokens.filter(
      (t) => t.pushToken && (t.pushToken.startsWith('ExponentPushToken') || t.pushToken.startsWith('ExpoPushToken'))
    ).length;

    res.json({
      success: true,
      firebaseInitialized: !!firebaseMessaging,
      totalTokens: tokens.length,
      tokensWithFcm: withFcm,
      tokensWithExpo: withExpo,
      tokensList: tokens.map((t) => ({
        id: t._id,
        user: t.userId ? { id: t.userId._id, name: t.userId.name, email: t.userId.email } : null,
        platform: t.platform,
        deviceName: t.deviceName,
        hasExpo: !!(t.pushToken && t.pushToken.startsWith('Expo')),
        hasFcm: !!(t.fcmToken && t.fcmToken.length > 20),
        updatedAt: t.updatedAt,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    firebase: !!firebaseMessaging,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});



// Route pour récupérer les messages entre deux utilisateurs
app.get('/api/messages/:user1/:user2', async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const messages = await Message.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'name email')
      .populate('receiver', 'name email');

    const formattedMessages = messages.map(formatMessageForClient);
    res.json(formattedMessages);
  } catch (error) {
    console.error('Erreur récupération messages :', error.message);
    res.status(500).json({ message: 'Erreur récupération messages' });
  }
});

// Route pour supprimer toute la conversation entre deux utilisateurs
app.delete('/api/messages/conversation/:user1/:user2', async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    if (!user1 || !user2) {
      return res.status(400).json({ message: 'Paramètres manquants.' });
    }
    const result = await Message.deleteMany({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 },
      ],
    });
    res.json({
      message: 'Conversation supprimée avec succès',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Erreur suppression conversation :', error.message);
    res.status(500).json({ message: 'Erreur suppression conversation' });
  }
});

// Route pour supprimer un groupe de messages spécifiques (batch delete)
app.delete('/api/messages/batch', async (req, res) => {
  try {
    const { messageIds } = req.body;
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ message: 'Tableau d\'identifiants manquant.' });
    }
    const result = await Message.deleteMany({
      _id: { $in: messageIds },
    });
    res.json({
      message: 'Messages supprimés avec succès',
      deletedCount: result.deletedCount,
      deletedIds: messageIds,
    });
  } catch (error) {
    console.error('Erreur suppression messages :', error.message);
    res.status(500).json({ message: 'Erreur suppression messages' });
  }
});

// Modèle Tâche (Task Model)
const taskSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  category: { type: String, default: 'Work' }, // Work, Personal, Design, Urgent
  priority: { type: String, default: 'Medium' }, // High, Medium, Low
  dueDate: { type: String, default: '' },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Task = mongoose.model('Task', taskSchema);

// Routes pour les tâches (Tasks CRUD)
// 1. Récupérer toutes les tâches de l'utilisateur
app.get('/api/tasks/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Identifiant invalide.' });
    }
    const tasks = await Task.find({ user: userId }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    console.error('Erreur récupération tâches :', error.message);
    res.status(500).json({ message: 'Erreur récupération tâches' });
  }
});

// 2. Créer une nouvelle tâche
app.post('/api/tasks', async (req, res) => {
  try {
    const { userId, title, description, category, priority, dueDate } = req.body;
    if (!userId || !title?.trim()) {
      return res.status(400).json({ message: 'Titre et utilisateur obligatoires.' });
    }

    const newTask = new Task({
      user: userId,
      title: title.trim(),
      description: (description || '').trim(),
      category: category || 'Work',
      priority: priority || 'Medium',
      dueDate: dueDate || '',
      completed: false,
    });

    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Erreur création tâche :', error.message);
    res.status(500).json({ message: 'Erreur création tâche' });
  }
});

// 3. Mettre à jour une tâche (modifier titre, description, statut, etc.)
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, priority, dueDate, completed } = req.body;

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description.trim() }),
        ...(category !== undefined && { category }),
        ...(priority !== undefined && { priority }),
        ...(dueDate !== undefined && { dueDate }),
        ...(completed !== undefined && { completed }),
      },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: 'Tâche introuvable.' });
    }

    res.json(updatedTask);
  } catch (error) {
    console.error('Erreur mise à jour tâche :', error.message);
    res.status(500).json({ message: 'Erreur mise à jour tâche' });
  }
});

// 4. Supprimer une tâche
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTask = await Task.findByIdAndDelete(id);
    if (!deletedTask) {
      return res.status(404).json({ message: 'Tâche introuvable.' });
    }
    res.json({ message: 'Tâche supprimée avec succès', id });
  } catch (error) {
    console.error('Erreur suppression tâche :', error.message);
    res.status(500).json({ message: 'Erreur suppression tâche' });
  }
});

// ----------------- Routes Administrateur (Admin API) -----------------
// 1. Obtenir la liste de tous les comptes avec mot de passe et statistiques de messages
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    const usersWithStats = await Promise.all(
      users.map(async (u) => {
        const sentCount = await Message.countDocuments({ sender: u._id });
        const receivedCount = await Message.countDocuments({ receiver: u._id });
        return {
          _id: u._id,
          name: u.name,
          email: u.email,
          password: u.password,
          isOnline: u.isOnline,
          createdAt: u.createdAt,
          sentCount,
          receivedCount,
          totalMessages: sentCount + receivedCount,
        };
      })
    );

    res.json({
      success: true,
      count: usersWithStats.length,
      users: usersWithStats,
    });
  } catch (error) {
    console.error('Erreur admin get users :', error.message);
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs.' });
  }
});

// 2. حذف جميع رسائل المستخدم تماماً وبصمت (المرسلة والمستقبلة)
app.delete('/api/admin/users/:userId/messages', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Identifiant invalide.' });
    }

    const result = await Message.deleteMany({
      $or: [{ sender: userId }, { receiver: userId }],
    });

    console.log(`👑 [Admin] ${result.deletedCount} messages supprimés pour l'utilisateur ${userId}`);
    res.json({
      success: true,
      message: 'Tous les messages ont été supprimés avec succès.',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Erreur admin delete messages :', error.message);
    res.status(500).json({ message: 'Erreur lors de la suppression des messages.' });
  }
});

// 3. حذف حساب المستخدم بالكامل مع رسائله ومهامه ورموزه دون إشعار
app.delete('/api/admin/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Identifiant invalide.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    if (user.email === 'admin@admin.com') {
      return res.status(400).json({ message: 'Impossible de supprimer le compte administrateur principal.' });
    }

    // حذف الرسائل
    await Message.deleteMany({
      $or: [{ sender: userId }, { receiver: userId }],
    });

    // حذف المهام
    await Task.deleteMany({ userId });

    // حذف رموز الإشعارات
    await PushToken.deleteMany({ userId });

    // حذف المستخدم نفسه
    await User.findByIdAndDelete(userId);

    console.log(`👑 [Admin] Compte ${user.email} supprimé définitivement`);
    res.json({
      success: true,
      message: 'Compte supprimé définitivement avec toutes ses données.',
    });
  } catch (error) {
    console.error('Erreur admin delete user :', error.message);
    res.status(500).json({ message: 'Erreur lors de la suppression du compte.' });
  }
});

// Démarrage du serveur
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Serveur en cours d'exécution sur : http://localhost:${PORT}`);
  });
}

module.exports = app;


