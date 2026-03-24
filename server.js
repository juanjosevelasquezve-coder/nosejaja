require('dotenv').config();

const express = require('express');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const multer = require('multer');
const sharp = require('sharp');
const archiver = require('archiver');
const JSZip = require('jszip');
const admin = require('firebase-admin');
const { MulterError } = require('multer');
const pkg = require('./package.json');

const execFileAsync = promisify(execFile);

const app = express();
const port = process.env.PORT || 3000;
const TARGET_WIDTH = 2550;
const TARGET_HEIGHT = 3300;
const TARGET_FIT = 'cover';
const VISOR_TARGET_WIDTH = 1080;
const VISOR_TARGET_HEIGHT = 1080;
const VISOR_TARGET_FIT = 'cover';
const MAX_FILE_SIZE_MB = Number.parseInt(process.env.MAX_FILE_SIZE_MB || '300', 10);
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const JPEG_QUALITY = Number.parseInt(process.env.JPEG_QUALITY || '96', 10);
const AI_MIN_LONG_SIDE = Number.parseInt(process.env.AI_MIN_LONG_SIDE || '1800', 10);
const AI_SCALE = Number.parseInt(process.env.AI_SCALE || '4', 10);
const AI_MODEL_STRONG = process.env.AI_MODEL_STRONG || 'realesrgan-x4plus';
const AI_MODEL_NORMAL = process.env.AI_MODEL_NORMAL || 'realesrnet-x4plus';
const AI_TIMEOUT_MS = Number.parseInt(process.env.AI_TIMEOUT_MS || '120000', 10);
const AI_PRE_DENOISE_RADIUS = Number.parseInt(process.env.AI_PRE_DENOISE_RADIUS || '1', 10);
const AI_REPORT_ENABLED = /^(1|true|on|yes)$/i.test(String(process.env.AI_REPORT_ENABLED || '0'));
const DEFAULT_AI_BIN = process.platform === 'win32' ? 'realesrgan-ncnn-vulkan.exe' : 'realesrgan-ncnn-vulkan';
const AI_BIN = process.env.REAL_ESRGAN_BIN || DEFAULT_AI_BIN;
const AI_PROFILE_PRODUCT = 'product';
const AI_PROFILE_PERSON = 'person';
const AI_PROFILE_TEXT = 'text';
const AI_PROFILES = new Set([AI_PROFILE_PRODUCT, AI_PROFILE_PERSON, AI_PROFILE_TEXT]);
const FIREBASE_AUTH_ENABLED = /^(1|true|on|yes)$/i.test(String(process.env.FIREBASE_AUTH_ENABLED || '0'));
const FIREBASE_SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
const FIREBASE_SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyC405bPdMqCH-FRBBPsC02svTyp_AcMpWc';
const FIREBASE_AUTH_DOMAIN = process.env.FIREBASE_AUTH_DOMAIN || 'proyecjo.firebaseapp.com';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'proyecjo';
const FIREBASE_APP_ID = process.env.FIREBASE_APP_ID || '1:1045350135204:web:ba02e836375436f399fd31';
const FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'proyecjo.firebasestorage.app';
const FIREBASE_MESSAGING_SENDER_ID = process.env.FIREBASE_MESSAGING_SENDER_ID || '1045350135204';
const FIREBASE_VAPID_KEY = process.env.FIREBASE_VAPID_KEY || '';

function loadFirebaseServiceAccount() {
  if (FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON);
  }
  if (FIREBASE_SERVICE_ACCOUNT_PATH) {
    const content = fsSync.readFileSync(FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8');
    return JSON.parse(content);
  }
  return null;
}

let firebaseAdminReady = false;
let firebaseInitError = '';
if (FIREBASE_AUTH_ENABLED) {
  try {
    const serviceAccount = loadFirebaseServiceAccount();
    if (!serviceAccount) {
      throw new Error('No hay credenciales de servicio en FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH');
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseAdminReady = true;
  } catch (error) {
    firebaseInitError = error.message;
  }
}

const firebaseWebConfig =
  FIREBASE_API_KEY && FIREBASE_AUTH_DOMAIN && FIREBASE_PROJECT_ID && FIREBASE_APP_ID
    ? {
        apiKey: FIREBASE_API_KEY,
        authDomain: FIREBASE_AUTH_DOMAIN,
        projectId: FIREBASE_PROJECT_ID,
        appId: FIREBASE_APP_ID,
        storageBucket: FIREBASE_STORAGE_BUCKET || undefined,
        messagingSenderId: FIREBASE_MESSAGING_SENDER_ID || undefined,
      }
    : null;
const FIREBASE_AUTH_REQUIRED = FIREBASE_AUTH_ENABLED && firebaseAdminReady && Boolean(firebaseWebConfig);
const FIREBASE_PUSH_ENABLED = FIREBASE_AUTH_REQUIRED && Boolean(FIREBASE_VAPID_KEY);
const pushTokensByUid = new Map();
const activeUsersByUid = new Map();
const knownUsersByUid = new Map();
const ACTIVE_WINDOW_MS = 90 * 1000;
const processedHistoryByUid = new Map();
const MAX_HISTORY_ITEMS = 25;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 2000,
  },
  fileFilter: (_req, file, cb) => {
    const isImage = file.mimetype && file.mimetype.startsWith('image/');
    const isZip =
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      file.originalname.toLowerCase().endsWith('.zip');
    const isExcel =
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.xlsx') ||
      file.originalname.toLowerCase().endsWith('.xls') ||
      file.originalname.toLowerCase().endsWith('.csv');
    if (isImage || isZip || isExcel) {
      cb(null, true);
      return;
    }
    cb(new Error(`Archivo no soportado: ${file.originalname}`));
  },
});

app.use(express.json({ limit: '256kb' }));

app.get('/firebase-messaging-sw.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (!FIREBASE_PUSH_ENABLED || !firebaseWebConfig) {
    res.send("self.addEventListener('install', () => self.skipWaiting());");
    return;
  }

  const swCode = `
self.addEventListener('install', () => self.skipWaiting());

try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

  firebase.initializeApp(${JSON.stringify(firebaseWebConfig)});
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = (payload && payload.notification && payload.notification.title) || 'Adaptador SALES';
    const body = (payload && payload.notification && payload.notification.body) || 'Tienes una notificacion nueva';
    const icon = (payload && payload.notification && payload.notification.icon) || '';
    self.registration.showNotification(title, {
      body,
      icon,
      data: (payload && payload.data) || {},
    });
  });
} catch (error) {
  // Keep SW alive even if Firebase scripts fail to load.
  console.error('Firebase messaging SW init error:', error);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
      return Promise.resolve();
    })
  );
});
`;

  res.send(swCode);
});

app.use(express.static('public'));

app.get('/principal', (_req, res) => {
  res.redirect(302, '/index.html');
});

app.get('/principal.html', (_req, res) => {
  res.redirect(302, '/index.html');
});

app.get('/AdaptadorSALES', (_req, res) => {
  res.redirect(302, '/AdaptadorSALES.html');
});

app.get('/adaptadorsales', (_req, res) => {
  res.redirect(302, '/AdaptadorSALES.html');
});

app.get('/InformesHACKY', (_req, res) => {
  res.redirect(302, '/InformesHACKY.html');
});

app.get('/informeshacky', (_req, res) => {
  res.redirect(302, '/InformesHACKY.html');
});

app.get('/EntregasSALES', (_req, res) => {
  res.redirect(302, '/EntregaSALES.html');
});

app.get('/entregassales', (_req, res) => {
  res.redirect(302, '/EntregaSALES.html');
});

app.get('/EntregaSALES', (_req, res) => {
  res.redirect(302, '/EntregaSALES.html');
});

app.get('/entregasales', (_req, res) => {
  res.redirect(302, '/EntregaSALES.html');
});

app.get('/EnviarvideosHACKY', (_req, res) => {
  res.redirect(302, '/enviarvideosHACKY.html');
});

app.get('/enviarvideoshacky', (_req, res) => {
  res.redirect(302, '/enviarvideosHACKY.html');
});

app.get('/api/firebase-config', (_req, res) => {
  res.json({
    enabled: FIREBASE_AUTH_REQUIRED,
    webConfig: FIREBASE_AUTH_REQUIRED ? firebaseWebConfig : null,
    pushEnabled: FIREBASE_PUSH_ENABLED,
    vapidKey: FIREBASE_PUSH_ENABLED ? FIREBASE_VAPID_KEY : null,
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    app: pkg.name,
    version: pkg.version,
    cwd: process.cwd(),
    uploadMode: 'multer.any',
    resize: {
      width: TARGET_WIDTH,
      height: TARGET_HEIGHT,
      fit: TARGET_FIT,
    },
    maxFileSizeMb: MAX_FILE_SIZE_MB,
    jpegQuality: JPEG_QUALITY,
    ai: {
      engine: 'Real-ESRGAN local',
      bin: AI_BIN,
      minLongSide: AI_MIN_LONG_SIDE,
      scale: AI_SCALE,
      models: {
        strong: AI_MODEL_STRONG,
        normal: AI_MODEL_NORMAL,
      },
      preDenoiseRadius: AI_PRE_DENOISE_RADIUS,
      profiles: [AI_PROFILE_PRODUCT, AI_PROFILE_PERSON, AI_PROFILE_TEXT],
    },
    auth: {
      enabled: FIREBASE_AUTH_REQUIRED,
      requested: FIREBASE_AUTH_ENABLED,
      adminReady: firebaseAdminReady,
      webConfigReady: Boolean(firebaseWebConfig),
      initError: firebaseInitError || null,
      pushEnabled: FIREBASE_PUSH_ENABLED,
      registeredPushUsers: pushTokensByUid.size,
    },
  });
});

function isImagePath(pathname) {
  return /\.(jpe?g|png|webp|tiff?|gif|avif|bmp)$/i.test(pathname);
}

function isAiEnabled(req) {
  const value = String(req.body.aiMode || '').toLowerCase();
  return value === '1' || value === 'true' || value === 'on' || value === 'yes';
}

function resolveTargetPreset(req) {
  const headerTarget = String(req.headers['x-target-mode'] || '').toLowerCase();
  const bodyTarget = String(req.body?.target || '').toLowerCase();
  const referer = String(req.headers.referer || '').toLowerCase();
  const isVisor =
    headerTarget === 'visor' ||
    bodyTarget === 'visor' ||
    referer.includes('/adaptadorvisor') ||
    referer.includes('adaptadorvisor.html');

  if (isVisor) {
    return { mode: 'visor', width: VISOR_TARGET_WIDTH, height: VISOR_TARGET_HEIGHT, fit: VISOR_TARGET_FIT };
  }
  return { mode: 'sales', width: TARGET_WIDTH, height: TARGET_HEIGHT, fit: TARGET_FIT };
}

async function requireFirebaseAuth(req, res, next) {
  if (!FIREBASE_AUTH_REQUIRED) {
    next();
    return;
  }

  const authHeader = String(req.headers.authorization || '');
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ error: 'Debes iniciar sesion para usar esta accion.' });
    return;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(match[1], true);
    const userEmail = String(decoded.email || '').trim();
    if (!/@gmail\.com$/i.test(userEmail)) {
      res.status(403).json({ error: 'Solo se permite acceso con cuentas @gmail.com.' });
      return;
    }
    req.user = decoded;
    next();
  } catch (_error) {
    res.status(401).json({ error: 'Token de sesion invalido o expirado.' });
  }
}

function getUserPushTokens(uid) {
  const raw = pushTokensByUid.get(uid);
  if (!raw || raw.size === 0) {
    return [];
  }
  return Array.from(raw);
}

function cleanupStaleActiveUsers() {
  const now = Date.now();
  for (const [uid, entry] of activeUsersByUid.entries()) {
    if (!entry?.lastSeen || now - entry.lastSeen > ACTIVE_WINDOW_MS) {
      activeUsersByUid.delete(uid);
    }
  }
}

function addProcessedHistory(uid, entry) {
  if (!uid) {
    return;
  }
  if (!processedHistoryByUid.has(uid)) {
    processedHistoryByUid.set(uid, []);
  }
  const list = processedHistoryByUid.get(uid);
  list.unshift(entry);
  if (list.length > MAX_HISTORY_ITEMS) {
    list.length = MAX_HISTORY_ITEMS;
  }
}

function registerPushToken(uid, token) {
  if (!pushTokensByUid.has(uid)) {
    pushTokensByUid.set(uid, new Set());
  }
  pushTokensByUid.get(uid).add(token);
}

function unregisterPushToken(uid, token) {
  if (!pushTokensByUid.has(uid)) {
    return;
  }
  const bucket = pushTokensByUid.get(uid);
  bucket.delete(token);
  if (bucket.size === 0) {
    pushTokensByUid.delete(uid);
  }
}

async function notifyUser(uid, title, body, data = {}) {
  if (!FIREBASE_PUSH_ENABLED || !firebaseAdminReady || !uid) {
    return;
  }
  const tokens = getUserPushTokens(uid);
  if (tokens.length === 0) {
    return;
  }

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
  });

  if (response.failureCount > 0) {
    response.responses.forEach((item, index) => {
      if (item.success) {
        return;
      }
      const code = item.error?.code || '';
      if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token')) {
        unregisterPushToken(uid, tokens[index]);
      }
    });
  }
}

app.post('/api/push/register', requireFirebaseAuth, (req, res) => {
  if (!FIREBASE_PUSH_ENABLED) {
    res.status(400).json({ error: 'Push notifications no estan activas en el servidor.' });
    return;
  }
  const token = String(req.body?.token || '').trim();
  if (!token) {
    res.status(400).json({ error: 'Token de push invalido.' });
    return;
  }
  registerPushToken(req.user.uid, token);
  res.json({ ok: true });
});

app.post('/api/presence', requireFirebaseAuth, (req, res) => {
  cleanupStaleActiveUsers();
  const user = req.user || {};
  const uid = String(user.uid || '').trim();
  if (!uid) {
    res.status(400).json({ error: 'UID no disponible.' });
    return;
  }
  const presenceEntry = {
    uid,
    email: String(user.email || '').trim(),
    name: String(user.name || '').trim(),
    picture: String(user.picture || '').trim(),
    lastSeen: Date.now(),
  };
  activeUsersByUid.set(uid, presenceEntry);
  knownUsersByUid.set(uid, presenceEntry);
  res.json({ ok: true });
});

app.get('/api/active-users', requireFirebaseAuth, (_req, res) => {
  cleanupStaleActiveUsers();
  const now = Date.now();
  const users = Array.from(activeUsersByUid.values())
    .map((user) => ({
      uid: user.uid,
      name: user.name || (user.email ? user.email.split('@')[0] : 'Usuario'),
      email: user.email || '',
      picture: user.picture || '',
      agoSec: Math.max(0, Math.round((now - user.lastSeen) / 1000)),
    }))
    .sort((a, b) => a.agoSec - b.agoSec)
    .slice(0, 12);

  res.json({ ok: true, users });
});

app.get('/api/users-presence', requireFirebaseAuth, (_req, res) => {
  cleanupStaleActiveUsers();
  const now = Date.now();

  const activeUsers = Array.from(activeUsersByUid.values())
    .map((user) => ({
      uid: user.uid,
      name: user.name || (user.email ? user.email.split('@')[0] : 'Usuario'),
      email: user.email || '',
      picture: user.picture || '',
      agoSec: Math.max(0, Math.round((now - user.lastSeen) / 1000)),
      isActive: true,
    }))
    .sort((a, b) => a.agoSec - b.agoSec)
    .slice(0, 20);

  const activeUidSet = new Set(activeUsers.map((item) => item.uid));
  const inactiveUsers = Array.from(knownUsersByUid.values())
    .filter((user) => user?.uid && !activeUidSet.has(user.uid))
    .map((user) => ({
      uid: user.uid,
      name: user.name || (user.email ? user.email.split('@')[0] : 'Usuario'),
      email: user.email || '',
      picture: user.picture || '',
      agoSec: Math.max(0, Math.round((now - user.lastSeen) / 1000)),
      isActive: false,
    }))
    .sort((a, b) => a.agoSec - b.agoSec)
    .slice(0, 40);

  res.json({ ok: true, activeUsers, inactiveUsers });
});

app.get('/api/processed-history', requireFirebaseAuth, (req, res) => {
  const uid = String(req.user?.uid || '').trim();
  if (!uid) {
    res.json({ ok: true, items: [] });
    return;
  }
  const items = processedHistoryByUid.get(uid) || [];
  res.json({ ok: true, items });
});

app.post('/api/push/unregister', requireFirebaseAuth, (req, res) => {
  const token = String(req.body?.token || '').trim();
  if (token) {
    unregisterPushToken(req.user.uid, token);
  }
  res.json({ ok: true });
});

async function runAiUpscale(inputBuffer, model) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'visor-ai-'));
  const inputPath = path.join(tempRoot, 'input.png');
  const outputPath = path.join(tempRoot, 'output.png');

  try {
    await sharp(inputBuffer).rotate().png().toFile(inputPath);

    const args = ['-i', inputPath, '-o', outputPath, '-n', model, '-s', String(AI_SCALE)];
    await execFileAsync(AI_BIN, args, { timeout: AI_TIMEOUT_MS, windowsHide: true });
    return await fs.readFile(outputPath);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => {});
  }
}

async function preprocessForAi(inputBuffer, strength, profile) {
  let pipeline = sharp(inputBuffer).rotate().normalise();

  if (profile === AI_PROFILE_TEXT) {
    pipeline = pipeline
      .median(1)
      .sharpen({ sigma: 1.45, m1: 1.25, m2: 1.2, x1: 2, y2: 12, y3: 24 })
      .modulate({ brightness: 1.02, saturation: 1.01 });
    return pipeline.png().toBuffer();
  }

  if (profile === AI_PROFILE_PERSON) {
    pipeline = pipeline
      .median(AI_PRE_DENOISE_RADIUS)
      .sharpen({ sigma: strength === 'strong' ? 1.08 : 1, m1: 1, m2: 1, x1: 1, y2: 8, y3: 14 })
      .modulate({ brightness: 1.01, saturation: 1.02 });
    return pipeline.png().toBuffer();
  }

  if (strength === 'strong') {
    pipeline = pipeline
      .median(AI_PRE_DENOISE_RADIUS)
      .sharpen({ sigma: 1.3, m1: 1.2, m2: 1.1, x1: 2, y2: 10, y3: 20 })
      .modulate({ brightness: 1.01, saturation: 1.04 });
  } else {
    pipeline = pipeline.sharpen({ sigma: 1.05, m1: 1, m2: 1, x1: 1, y2: 8, y3: 12 });
  }

  return pipeline.png().toBuffer();
}

async function postprocessAiResult(inputBuffer, strength, profile) {
  if (profile === AI_PROFILE_PERSON) {
    return sharp(inputBuffer)
      .sharpen({ sigma: strength === 'strong' ? 0.95 : 0.85, m1: 1, m2: 1, x1: 1, y2: 7, y3: 12 })
      .toBuffer();
  }
  if (profile === AI_PROFILE_TEXT) {
    return sharp(inputBuffer)
      .sharpen({ sigma: 1.35, m1: 1.25, m2: 1.2, x1: 2, y2: 12, y3: 24 })
      .toBuffer();
  }
  if (strength !== 'strong') {
    return inputBuffer;
  }
  return sharp(inputBuffer)
    .sharpen({ sigma: 1.1, m1: 1.15, m2: 1.1, x1: 2, y2: 10, y3: 18 })
    .toBuffer();
}

app.post('/api/resize', requireFirebaseAuth, upload.any(), async (req, res) => {
  try {
    const aiRequested = isAiEnabled(req);
    const aiStrength = String(req.body.aiStrength || 'strong').toLowerCase() === 'normal' ? 'normal' : 'strong';
    const rawProfile = String(req.body.aiProfile || AI_PROFILE_PRODUCT).toLowerCase();
    const aiProfile = AI_PROFILES.has(rawProfile) ? rawProfile : AI_PROFILE_PRODUCT;
    const aiModel = aiStrength === 'strong' ? AI_MODEL_STRONG : AI_MODEL_NORMAL;
    const target = resolveTargetPreset(req);
    const files = req.files || [];
    if (files.length === 0) {
      res.status(400).json({ error: 'No se recibieron imagenes.' });
      return;
    }

    const relativePaths = Array.isArray(req.body.paths)
      ? req.body.paths
      : req.body.paths
        ? [req.body.paths]
        : [];

    const normalizedImages = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const rawRelativePath = relativePaths[i] || file.originalname;
      const safeRelativePath = rawRelativePath.replace(/\\/g, '/').replace(/\.\./g, '_').replace(/^\//, '');
      const isZipFile = file.originalname.toLowerCase().endsWith('.zip');

      if (isZipFile) {
        const zip = await JSZip.loadAsync(file.buffer);
        const zipEntries = Object.values(zip.files);

        for (let z = 0; z < zipEntries.length; z += 1) {
          const entry = zipEntries[z];
          if (entry.dir || !isImagePath(entry.name)) {
            continue;
          }
          const entryBuffer = await entry.async('nodebuffer');
          const safeEntryPath = entry.name.replace(/\\/g, '/').replace(/\.\./g, '_').replace(/^\//, '');
          const zipFolder = safeRelativePath.replace(/\.zip$/i, '');
          normalizedImages.push({
            buffer: entryBuffer,
            relativePath: `${zipFolder}/${safeEntryPath}`,
          });
        }
        continue;
      }

      normalizedImages.push({
        buffer: file.buffer,
        relativePath: safeRelativePath,
      });
    }

    if (normalizedImages.length === 0) {
      res.status(400).json({ error: 'No se encontraron imagenes validas en los archivos enviados.' });
      return;
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="imagenes-ajustadas.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      throw err;
    });
    archive.pipe(res);
    const processingNotes = [];

    for (let i = 0; i < normalizedImages.length; i += 1) {
      const image = normalizedImages[i];
      let sourceBuffer = image.buffer;

      if (aiRequested) {
        try {
          const meta = await sharp(image.buffer).metadata();
          const longSide = Math.max(meta.width || 0, meta.height || 0);
          if (longSide > 0 && longSide < AI_MIN_LONG_SIDE) {
            const aiInput = await preprocessForAi(image.buffer, aiStrength, aiProfile);
            const aiUpscaled = await runAiUpscale(aiInput, aiModel);
            sourceBuffer = await postprocessAiResult(aiUpscaled, aiStrength, aiProfile);
            processingNotes.push(
              `[IA-${aiStrength}/${aiProfile}] pre->upscale->post aplicado con ${aiModel} en: ${image.relativePath} (lado mayor ${longSide}px)`
            );
          }
        } catch (aiError) {
          processingNotes.push(
            `[IA-${aiStrength}/${aiProfile}] Fallback normal en: ${image.relativePath}. Motivo: ${aiError.message}`
          );
        }
      }

      let outputBuffer = await sharp(sourceBuffer)
        .rotate()
        .resize({
          width: target.width,
          height: target.height,
          fit: target.fit,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
          withoutEnlargement: false,
          kernel: sharp.kernel.lanczos3,
        })
        .sharpen({ sigma: 1.1, m1: 1.2, m2: 1.2, x1: 2, y2: 10, y3: 20 })
        .jpeg({
          quality: JPEG_QUALITY,
          mozjpeg: true,
          chromaSubsampling: '4:4:4',
          progressive: true,
        })
        .toBuffer();

      // Hard guarantee: always deliver requested target dimensions.
      const outMeta = await sharp(outputBuffer).metadata();
      if (outMeta.width !== target.width || outMeta.height !== target.height) {
        outputBuffer = await sharp(outputBuffer)
          .rotate()
          .resize({
            width: target.width,
            height: target.height,
            fit: target.fit,
            background: { r: 255, g: 255, b: 255, alpha: 1 },
            withoutEnlargement: false,
            kernel: sharp.kernel.lanczos3,
          })
          .jpeg({
            quality: JPEG_QUALITY,
            mozjpeg: true,
            chromaSubsampling: '4:4:4',
            progressive: true,
          })
          .toBuffer();
      }

      const outputPath = image.relativePath.replace(/\.[^.]+$/, '.jpg');
      archive.append(outputBuffer, { name: outputPath });
    }

    if (AI_REPORT_ENABLED && processingNotes.length > 0) {
      archive.append(processingNotes.join('\n'), { name: '_reporte_ia.txt' });
    }

    await archive.finalize();

    const uid = String(req.user?.uid || '').trim();
    if (uid) {
      const sourceFiles = (req.files || []).length;
      const previewNames = normalizedImages
        .slice(0, 3)
        .map((item) => item.relativePath.split('/').pop() || item.relativePath);
      addProcessedHistory(uid, {
        createdAt: new Date().toISOString(),
        outputImages: normalizedImages.length,
        sourceFiles,
        previewNames,
      });
    }

    if (req.user?.uid) {
      notifyUser(
        req.user.uid,
        'Proceso finalizado',
        `Tus ${normalizedImages.length} imagen(es) ya fueron adaptadas.`,
        { screen: 'adaptador-sales' }
      ).catch(() => {});
    }
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: `Error procesando imagenes: ${error.message}` });
    } else {
      res.end();
    }
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res
        .status(400)
        .json({ error: `Archivo demasiado grande. Maximo permitido: ${MAX_FILE_SIZE_MB} MB por archivo.` });
      return;
    }
    const detail = err.field ? ` (${err.field})` : '';
    res.status(400).json({ error: `Error de carga [${err.code}]${detail}: ${err.message}` });
    return;
  }
  res.status(400).json({ error: err.message || 'Solicitud invalida.' });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Servidor iniciado en http://localhost:${port}`);
  if (FIREBASE_AUTH_ENABLED && !FIREBASE_AUTH_REQUIRED) {
    // eslint-disable-next-line no-console
    console.warn(`Firebase auth no activo. Detalle: ${firebaseInitError || 'Falta configuracion web de Firebase.'}`);
  }
  if (FIREBASE_AUTH_REQUIRED && !FIREBASE_PUSH_ENABLED) {
    // eslint-disable-next-line no-console
    console.warn('Push desactivado. Falta FIREBASE_VAPID_KEY.');
  }
});
