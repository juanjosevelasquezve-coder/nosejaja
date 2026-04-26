const form = document.getElementById('resize-form');
const itemsInput = document.getElementById('items');
const dropzone = document.getElementById('dropzone');
const submitBtn = document.getElementById('submit-btn');
const submitLabel = document.getElementById('submit-label');
const helpDialog = document.getElementById('help-dialog');
const helpDialogCloseBtn = document.getElementById('help-dialog-close');
const helpDialogDismissBtn = document.getElementById('help-dialog-dismiss');
const backBtn = document.getElementById('back-btn');
const uploadCard = document.getElementById('upload-card');
const downloadCard = document.getElementById('download-card');
const selectedFilesEl = document.getElementById('selected-files');
const countZip = document.getElementById('count-zip');
const countImages = document.getElementById('count-images');
const statusEl = document.getElementById('status');
const downloadProgressEl = document.getElementById('download-progress');
const downloadProgressLabelEl = document.getElementById('download-progress-label');
const downloadProgressValueEl = document.getElementById('download-progress-value');
const downloadProgressFillEl = document.getElementById('download-progress-fill');
const dynamicIslandEl = document.getElementById('dynamic-island');
const healthEl = document.getElementById('health');
const viewerCanvas = document.getElementById('viewer-canvas');
const previewStage = document.getElementById('preview-stage');
const previewCompareStage = document.getElementById('preview-compare-stage');
const previewImage = document.getElementById('preview-image');
const previewCompareOriginal = document.getElementById('preview-image-compare-original');
const previewCompareFit = document.getElementById('preview-image-compare-fit');
const emptyPreview = document.getElementById('empty-preview');
const previewPrevBtn = document.getElementById('preview-prev');
const previewNextBtn = document.getElementById('preview-next');
const previewFilmstrip = document.getElementById('preview-filmstrip');
const previewNameEl = document.getElementById('preview-name');
const previewDetailsEl = document.getElementById('preview-details');
const previewZoomLabelEl = document.getElementById('preview-zoom-label');
const previewFitBtn = document.getElementById('preview-fit');
const preview100Btn = document.getElementById('preview-100');
const preview200Btn = document.getElementById('preview-200');
const previewCompareBtn = document.getElementById('preview-compare');
const previewFullscreenBtn = document.getElementById('preview-fullscreen');
const activeUsersListEl = document.getElementById('active-users-list');
const activeUsersCountEl = document.getElementById('active-users-count');
const usersFilterTabEls = document.querySelectorAll('.friends-tab[data-filter]');
const processedHistoryListEl = document.getElementById('processed-history-list');
const historyRangeEl = document.getElementById('history-range');
const historySearchEl = document.getElementById('history-search');
const historySortEl = document.getElementById('history-sort');
const historyExportBtn = document.getElementById('history-export-btn');
const historyClearBtn = document.getElementById('history-clear-btn');
const historyCaptionEl = document.getElementById('history-caption');
const historyTotalBadgeEl = document.getElementById('history-total-badge');
const historyTotalProcessesEl = document.getElementById('history-total-processes');
const historyTotalImagesEl = document.getElementById('history-total-images');
const notificationBtn = document.getElementById('notification-btn');
const authLoginBtn = document.getElementById('auth-login-btn');
const authAvatarWrapEl = document.getElementById('auth-avatar-wrap');
const authAvatarEl = document.getElementById('auth-avatar');
const authAvatarFallbackEl = document.getElementById('auth-avatar-fallback');
const authLogoutBtn = document.getElementById('auth-logout-btn');
const authPanelEl = authAvatarWrapEl?.closest('.workspace-auth') || null;

const MAX_PREVIEW_IMAGES = 80;
let selectedFiles = [];
let previewImages = [];
let detectedImagesCount = 0;
let activePreviewIndex = -1;
let buildPreviewToken = 0;
let previewScale = 1;
let previewTranslateX = 0;
let previewTranslateY = 0;
let previewNaturalWidth = 0;
let previewNaturalHeight = 0;
let previewCompareMode = false;
let isDraggingPreview = false;
let dragStartX = 0;
let dragStartY = 0;
let firebaseAuthRequired = false;
let firebaseAuthReady = false;
let firebaseUser = null;
let firebasePushEnabled = false;
let firebaseVapidKey = '';
let firebaseMessaging = null;
let pushToken = '';
let pushListenerAttached = false;
let presenceHeartbeatTimer = null;
let activeUsersPollTimer = null;
let dynamicIslandTimer = null;
let downloadProgressHideTimer = null;
const DOWNLOAD_PROGRESS_HIDE_ANIMATION_MS = 220;
const STATIC_LAYOUT_WIDTH = 1760;
const STATIC_LAYOUT_HEIGHT = 830;
let usersFilter = 'active';
let latestActiveUsers = [];
let latestInactiveUsers = [];
let latestProcessedHistory = [];
let historyRange = 'all';
let historySearch = '';
let historySort = 'recent';
let isAuthMenuOpen = false;
let hasDownloadedZip = false;
const isAdaptadorSalesPage = /\/AdaptadorSALES\.html$/i.test(window.location.pathname || '');
const isAdaptadorVisorPage = /\/AdaptadorVISOR\.html$/i.test(window.location.pathname || '');
const isAdaptadorPage = isAdaptadorSalesPage || isAdaptadorVisorPage;
const isTablaVSPage = /\/TablaVS\.html$/i.test(window.location.pathname || '');
const STATIC_FIREBASE_CONFIG = window.VISOR_FIREBASE || {};
const STATIC_FIREBASE_WEB_CONFIG = STATIC_FIREBASE_CONFIG.webConfig || null;
const STATIC_FIRESTORE_CONFIG = STATIC_FIREBASE_CONFIG.firestore || {};
const STATIC_PROCESSING_PRESETS = {
  sales: { width: 2550, height: 3300, fit: 'cover' },
  visor: { width: 1080, height: 1080, fit: 'cover' },
};
const STATIC_HISTORY_LIMIT = 25;
const STATIC_ACTIVE_WINDOW_MS = 90000;
const STATIC_JPEG_QUALITY = 0.96;

function getFirestoreDb() {
  if (!firebaseAuthRequired || !window.firebase?.firestore || !window.firebase?.apps?.length) {
    return null;
  }
  return window.firebase.firestore();
}

function getPresenceCollection() {
  const db = getFirestoreDb();
  const collectionName = String(STATIC_FIRESTORE_CONFIG.presenceCollection || 'presence').trim();
  return db ? db.collection(collectionName) : null;
}

function getHistoryCollection(uid) {
  const db = getFirestoreDb();
  if (!db || !uid) {
    return null;
  }
  const usersCollection = String(STATIC_FIRESTORE_CONFIG.usersCollection || 'users').trim();
  const historySubcollection = String(STATIC_FIRESTORE_CONFIG.historySubcollection || 'processedHistory').trim();
  return db.collection(usersCollection).doc(uid).collection(historySubcollection);
}

function normalizeOutputRelativePath(relativePath) {
  const safeRelativePath = String(relativePath || 'imagen')
    .replace(/\\/g, '/')
    .replace(/\.\./g, '_')
    .replace(/^\/+/, '');
  return safeRelativePath.replace(/\.[^.]+$/, '.jpg');
}

function isHelpPrimaryAction() {
  return submitBtn?.dataset?.action === 'help';
}

function setPrimaryActionText(label) {
  if (!submitBtn) {
    return;
  }
  if (submitLabel) {
    submitLabel.textContent = label;
  } else {
    submitBtn.textContent = label;
  }
}

function openHelpDialog() {
  if (!helpDialog) {
    return;
  }
  helpDialog.hidden = false;
  helpDialog.setAttribute('aria-hidden', 'false');
  helpDialogCloseBtn?.focus();
}

function closeHelpDialog() {
  if (!helpDialog) {
    return;
  }
  helpDialog.hidden = true;
  helpDialog.setAttribute('aria-hidden', 'true');
}

function isAllowedGmail(email) {
  return /@gmail\.com$/i.test(String(email || '').trim());
}

function normalizePathname(pathname) {
  const normalized = String(pathname || '/').trim().replace(/\/+$/, '') || '/';
  if (normalized === '/index') {
    return '/index.html';
  }
  if (normalized === '/principal' || normalized === '/principal.html') {
    return '/index.html';
  }
  if (normalized.toLowerCase() === '/adaptadorsales') {
    return '/AdaptadorSALES.html';
  }
  if (normalized.toLowerCase() === '/adaptadorvisor') {
    return '/AdaptadorVISOR.html';
  }
  return normalized;
}

function syncRailCurrentByPath() {
  const links = document.querySelectorAll('.app-rail a.rail-btn[href]');
  if (!links.length) {
    return;
  }
  const currentPath = normalizePathname(window.location.pathname);
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    const linkUrl = new URL(href, window.location.origin);
    const linkPath = normalizePathname(linkUrl.pathname);
    const isCurrent = linkPath === currentPath;
    link.classList.toggle('is-current', isCurrent);
    if (isCurrent) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  }
}

function getUserInitial(user) {
  const fromName = String(user?.displayName || '').trim();
  if (fromName) {
    return fromName.charAt(0).toUpperCase();
  }
  const fromEmail = String(user?.email || '').trim();
  if (fromEmail) {
    return fromEmail.charAt(0).toUpperCase();
  }
  return 'U';
}

function applyPreviewTransform() {
  previewImage.style.transform = `translate(${previewTranslateX}px, ${previewTranslateY}px) scale(${previewScale})`;
  if (previewZoomLabelEl) {
    previewZoomLabelEl.textContent = `${Math.round(previewScale * 100)}%`;
  }
}

function resetPreviewTransform() {
  previewScale = 1;
  previewTranslateX = 0;
  previewTranslateY = 0;
  isDraggingPreview = false;
  previewImage.classList.remove('dragging');
  applyPreviewTransform();
}

function renderPreviewMode() {
  const hasImage = activePreviewIndex >= 0 && !!previewImages[activePreviewIndex];
  const compareEnabled = hasImage && previewCompareMode;
  if (previewStage) {
    previewStage.hidden = compareEnabled;
  }
  if (previewCompareStage) {
    previewCompareStage.hidden = !compareEnabled;
  }
  if (previewCompareBtn) {
    previewCompareBtn.classList.toggle('is-active', compareEnabled);
  }
}

function updatePreviewHeader() {
  const total = previewImages.length;
  if (activePreviewIndex < 0 || !previewImages[activePreviewIndex]) {
    if (previewNameEl) {
      previewNameEl.textContent = 'Sin previsualizaciones';
    }
    if (previewDetailsEl) {
      previewDetailsEl.textContent = '0/0 | Resolucion -';
    }
    if (previewZoomLabelEl) {
      previewZoomLabelEl.textContent = `${Math.round(previewScale * 100)}%`;
    }
    return;
  }

  const current = previewImages[activePreviewIndex];
  if (previewNameEl) {
    previewNameEl.textContent = current.name || 'imagen';
  }
  const dimensionText =
    previewNaturalWidth > 0 && previewNaturalHeight > 0 ? `${previewNaturalWidth}x${previewNaturalHeight}` : 'Resolucion -';
  if (previewDetailsEl) {
    previewDetailsEl.textContent = `${activePreviewIndex + 1}/${total} | ${dimensionText}`;
  }
}

function loadPreviewDimensions(url) {
  if (!url) {
    previewNaturalWidth = 0;
    previewNaturalHeight = 0;
    updatePreviewHeader();
    return;
  }
  const img = new Image();
  img.onload = () => {
    previewNaturalWidth = Number(img.naturalWidth || 0);
    previewNaturalHeight = Number(img.naturalHeight || 0);
    updatePreviewHeader();
  };
  img.onerror = () => {
    previewNaturalWidth = 0;
    previewNaturalHeight = 0;
    updatePreviewHeader();
  };
  img.src = url;
}

function renderPreviewFilmstrip() {
  if (!previewFilmstrip) {
    return;
  }
  previewFilmstrip.textContent = '';
  if (!previewImages.length) {
    const empty = document.createElement('span');
    empty.className = 'preview-details';
    empty.textContent = 'Sin miniaturas';
    previewFilmstrip.appendChild(empty);
    return;
  }

  for (const [index, item] of previewImages.entries()) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'film-thumb';
    if (index === activePreviewIndex) {
      btn.classList.add('is-active');
    }
    btn.setAttribute('aria-label', `Abrir imagen ${index + 1}`);
    btn.title = item.name;
    btn.addEventListener('click', () => {
      setActivePreview(index);
    });

    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.name || '';
    img.loading = 'lazy';

    const badge = document.createElement('span');
    badge.className = 'film-thumb-index';
    badge.textContent = String(index + 1);

    btn.appendChild(img);
    btn.appendChild(badge);
    previewFilmstrip.appendChild(btn);
  }
}

function isZipFile(file) {
  return file.name.toLowerCase().endsWith('.zip');
}

function isImageFile(fileNameOrFile) {
  if (typeof fileNameOrFile !== 'string') {
    if (fileNameOrFile.type && fileNameOrFile.type.startsWith('image/')) {
      return true;
    }
    return /\.(jpe?g|png|webp|tiff?|gif|avif|bmp)$/i.test(fileNameOrFile.name || '');
  }
  return /\.(jpe?g|png|webp|tiff?|gif|avif|bmp)$/i.test(fileNameOrFile);
}

function setStatus(message, type = 'ok') {
  statusEl.textContent = message;
  statusEl.classList.remove('ok', 'error');
  statusEl.classList.add(type);
  showDynamicIsland(message, type);
}

function syncDownloadProgressOffset() {
  if (!downloadProgressEl || !dynamicIslandEl) {
    return;
  }
  const shouldStayBelowIsland = dynamicIslandEl.classList.contains('show');
  downloadProgressEl.classList.toggle('is-below-island', shouldStayBelowIsland);
}

function showDynamicIsland(message, type = 'ok') {
  if (!dynamicIslandEl || !message) {
    return;
  }

  const bell = document.createElement('i');
  bell.className = 'bi bi-bell-fill dynamic-island__bell';
  bell.setAttribute('aria-hidden', 'true');

  const title = document.createElement('strong');
  title.className = 'dynamic-island__title';
  title.textContent = 'Notificacion';

  const messageText = document.createElement('span');
  messageText.className = 'dynamic-island__message';
  messageText.textContent = String(message);

  const body = document.createElement('div');
  body.className = 'dynamic-island__body';
  body.appendChild(title);
  body.appendChild(messageText);

  dynamicIslandEl.textContent = '';
  dynamicIslandEl.appendChild(bell);
  dynamicIslandEl.appendChild(body);
  dynamicIslandEl.classList.remove('ok', 'error');
  dynamicIslandEl.classList.add(type, 'show');
  syncDownloadProgressOffset();
  if (dynamicIslandTimer) {
    clearTimeout(dynamicIslandTimer);
  }
  dynamicIslandTimer = setTimeout(() => {
    dynamicIslandEl.classList.remove('show');
    syncDownloadProgressOffset();
  }, type === 'error' ? 7800 : 6200);
}

function applyStaticLayoutScale() {
  const shell = document.querySelector('.dashboard-shell');
  if (!shell) {
    return;
  }
  const viewportWidth = window.visualViewport?.width || window.innerWidth;
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  const safeWidth = Math.max(0, viewportWidth);
  const safeHeight = Math.max(0, viewportHeight);
  const scale = Math.min(safeWidth / STATIC_LAYOUT_WIDTH, safeHeight / STATIC_LAYOUT_HEIGHT);
  const normalizedScale = Math.max(0.1, scale);
  const scaledWidth = STATIC_LAYOUT_WIDTH * normalizedScale;
  const scaledHeight = STATIC_LAYOUT_HEIGHT * normalizedScale;
  const offsetX = Math.max(0, (viewportWidth - scaledWidth) / 2);
  const offsetY = Math.max(0, (viewportHeight - scaledHeight) / 2);
  shell.style.transform = `translate(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px) scale(${normalizedScale.toFixed(4)})`;
}

function initStaticLayoutMode() {
  document.body.classList.add('static-scale');
  applyStaticLayoutScale();
  window.addEventListener('resize', applyStaticLayoutScale);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', applyStaticLayoutScale);
    window.visualViewport.addEventListener('scroll', applyStaticLayoutScale);
  }
}

function setAuthStatus(message = '') {
  if (message) {
    setStatus(message, 'error');
  }
}

function stopPresenceTimers() {
  if (presenceHeartbeatTimer) {
    clearInterval(presenceHeartbeatTimer);
    presenceHeartbeatTimer = null;
  }
  if (activeUsersPollTimer) {
    clearInterval(activeUsersPollTimer);
    activeUsersPollTimer = null;
  }
}

function getSelfPresenceStub() {
  if (!firebaseUser) {
    return null;
  }
  return {
    uid: firebaseUser.uid || 'self',
    name: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Tu usuario'),
    email: firebaseUser.email || '',
    picture: firebaseUser.photoURL || '',
    agoSec: 0,
  };
}

function formatAgo(seconds) {
  if (seconds <= 5) {
    return 'ahora';
  }
  if (seconds < 60) {
    return `hace ${seconds}s`;
  }
  const min = Math.floor(seconds / 60);
  return `hace ${min}m`;
}

function renderActiveUsers(users) {
  const normalized = Array.isArray(users) ? users : [];
  latestActiveUsers = normalized;
  renderUsersPresence();
}

function renderUsersPresence() {
  const isInactive = usersFilter === 'inactive';
  const users = isInactive ? latestInactiveUsers : latestActiveUsers;

  for (const tab of usersFilterTabEls) {
    tab.classList.toggle('is-active', tab.dataset.filter === usersFilter);
  }

  if (activeUsersCountEl) {
    activeUsersCountEl.textContent = String(Array.isArray(users) ? users.length : 0);
  }
  if (!activeUsersListEl) {
    return;
  }
  activeUsersListEl.textContent = '';
  if (!Array.isArray(users) || users.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'friends-empty';
    empty.textContent = isInactive ? 'Sin usuarios inactivos' : 'Sin usuarios activos';
    activeUsersListEl.appendChild(empty);
    return;
  }

  for (const user of users) {
    const row = document.createElement('div');
    row.className = 'friend-item';

    const avatar = document.createElement('img');
    avatar.className = 'friend-avatar';
    avatar.src = user.picture || 'https://www.gravatar.com/avatar/?d=mp&s=96';
    avatar.alt = '';

    const meta = document.createElement('div');
    meta.className = 'friend-meta';

    const name = document.createElement('span');
    name.className = 'friend-name';
    name.textContent = user.name || 'Usuario';

    const time = document.createElement('span');
    time.className = 'friend-time';
    time.textContent = formatAgo(Number(user.agoSec || 0));

    const dot = document.createElement('span');
    dot.className = 'friend-dot';
    if (isInactive) {
      dot.classList.add('inactive');
    }
    dot.setAttribute('aria-hidden', 'true');

    meta.appendChild(name);
    meta.appendChild(time);
    row.appendChild(avatar);
    row.appendChild(meta);
    row.appendChild(dot);
    activeUsersListEl.appendChild(row);
  }
}

function formatHistoryTime(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatHistoryDateTime(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const datePart = date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} ${timePart}`;
}

function formatHistoryRelative(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const deltaMs = Date.now() - date.getTime();
  const sec = Math.max(0, Math.floor(deltaMs / 1000));
  if (sec < 60) {
    return 'hace unos segundos';
  }
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return `hace ${min} min`;
  }
  const hours = Math.floor(min / 60);
  if (hours < 24) {
    return `hace ${hours} h`;
  }
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

function getHistoryStorageKey() {
  const uid = String(firebaseUser?.uid || 'guest').trim() || 'guest';
  return `processed_history_${uid}`;
}

function getHistoryDeletedStorageKey() {
  const uid = String(firebaseUser?.uid || 'guest').trim() || 'guest';
  return `processed_history_deleted_${uid}`;
}

function getHistoryItemKey(item) {
  return `${item?.createdAt || ''}|${item?.outputImages || ''}|${item?.sourceFiles || ''}|${
    Array.isArray(item?.previewNames) ? item.previewNames.join(',') : ''
  }`;
}

function getLocalHistoryItems() {
  try {
    const raw = window.localStorage.getItem(getHistoryStorageKey());
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function saveLocalHistoryItems(items) {
  try {
    window.localStorage.setItem(getHistoryStorageKey(), JSON.stringify(items.slice(0, 25)));
  } catch (_error) {
    // ignore quota/storage errors
  }
}

function getDeletedHistoryKeys() {
  try {
    const raw = window.localStorage.getItem(getHistoryDeletedStorageKey());
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.map((v) => String(v || '')));
  } catch (_error) {
    return new Set();
  }
}

function saveDeletedHistoryKeys(keysSet) {
  try {
    const items = Array.from(keysSet).slice(0, 250);
    window.localStorage.setItem(getHistoryDeletedStorageKey(), JSON.stringify(items));
  } catch (_error) {
    // ignore quota/storage errors
  }
}

function removeLocalHistoryEntry(entry) {
  const current = getLocalHistoryItems();
  const entryKey = getHistoryItemKey(entry);
  const filtered = current.filter((item) => getHistoryItemKey(item) !== entryKey);
  saveLocalHistoryItems(filtered);
  return filtered;
}

function markHistoryEntryDeleted(entry) {
  const deleted = getDeletedHistoryKeys();
  deleted.add(getHistoryItemKey(entry));
  saveDeletedHistoryKeys(deleted);
  return removeLocalHistoryEntry(entry);
}

function addLocalHistoryEntry(entry) {
  const current = getLocalHistoryItems();
  const deleted = getDeletedHistoryKeys();
  deleted.delete(getHistoryItemKey(entry));
  saveDeletedHistoryKeys(deleted);
  current.unshift(entry);
  saveLocalHistoryItems(current);
  return current;
}

function mergeHistoryItems(serverItems) {
  const deleted = getDeletedHistoryKeys();
  const merged = [...(Array.isArray(serverItems) ? serverItems : []), ...getLocalHistoryItems()];
  const map = new Map();
  for (const item of merged) {
    const key = getHistoryItemKey(item);
    if (deleted.has(key)) {
      continue;
    }
    if (!map.has(key)) {
      map.set(key, item);
    } else {
      const current = map.get(key);
      const hasThumb = Array.isArray(current?.previews) && current.previews.some((p) => p?.thumb);
      const nextHasThumb = Array.isArray(item?.previews) && item.previews.some((p) => p?.thumb);
      if (!hasThumb && nextHasThumb) {
        map.set(key, item);
      }
    }
  }
  return Array.from(map.values())
    .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())
    .slice(0, 25);
}

async function persistHistoryEntry(entry) {
  const uid = String(firebaseUser?.uid || '').trim();
  const collection = getHistoryCollection(uid);
  if (!collection) {
    return null;
  }
  const createdAtMs = new Date(entry?.createdAt || Date.now()).getTime();
  const payload = {
    createdAt: String(entry?.createdAt || new Date().toISOString()),
    createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : Date.now(),
    outputImages: Number(entry?.outputImages || 0),
    sourceFiles: Number(entry?.sourceFiles || 0),
    previewNames: Array.isArray(entry?.previewNames) ? entry.previewNames.slice(0, 6) : [],
    previews: Array.isArray(entry?.previews) ? entry.previews.slice(0, 3) : [],
  };
  const docRef = await collection.add(payload);
  return { ...payload, firestoreId: docRef.id };
}

async function removeRemoteHistoryEntry(entry) {
  const uid = String(firebaseUser?.uid || '').trim();
  const firestoreId = String(entry?.firestoreId || '').trim();
  const collection = getHistoryCollection(uid);
  if (!collection || !firestoreId) {
    return;
  }
  await collection.doc(firestoreId).delete();
}

async function clearRemoteHistoryEntries(items) {
  const uid = String(firebaseUser?.uid || '').trim();
  const collection = getHistoryCollection(uid);
  if (!collection) {
    return;
  }
  const deletions = [];
  for (const item of items) {
    const firestoreId = String(item?.firestoreId || '').trim();
    if (!firestoreId) {
      continue;
    }
    deletions.push(collection.doc(firestoreId).delete());
  }
  await Promise.all(deletions);
}

function firstHistoryPreview(item) {
  if (Array.isArray(item?.previews) && item.previews.length > 0) {
    return item.previews[0];
  }
  if (Array.isArray(item?.previewNames) && item.previewNames.length > 0) {
    return { name: item.previewNames[0], thumb: '' };
  }
  return { name: 'Proceso', thumb: '' };
}

function normalizeHistoryRange(value) {
  const raw = String(value || '').trim();
  if (raw === 'today' || raw === '7d' || raw === '30d' || raw === 'all') {
    return raw;
  }
  return 'all';
}

function normalizeHistorySort(value) {
  const raw = String(value || '').trim();
  if (raw === 'recent' || raw === 'oldest' || raw === 'images_desc' || raw === 'files_desc') {
    return raw;
  }
  return 'recent';
}

function isHistoryEntryInRange(item, range) {
  if (range === 'all') {
    return true;
  }
  const createdAt = new Date(item?.createdAt || 0);
  if (Number.isNaN(createdAt.getTime())) {
    return false;
  }
  const now = new Date();
  if (range === 'today') {
    return (
      createdAt.getFullYear() === now.getFullYear() &&
      createdAt.getMonth() === now.getMonth() &&
      createdAt.getDate() === now.getDate()
    );
  }
  const days = range === '7d' ? 7 : 30;
  const diff = now.getTime() - createdAt.getTime();
  return diff <= days * 24 * 60 * 60 * 1000;
}

function getHistorySearchText(item) {
  const previewNames = Array.isArray(item?.previewNames) ? item.previewNames.join(' ') : '';
  const previews = Array.isArray(item?.previews) ? item.previews.map((p) => p?.name || '').join(' ') : '';
  return `${previewNames} ${previews}`.toLowerCase();
}

function filterProcessedHistory(items) {
  const normalizedItems = Array.isArray(items) ? items : [];
  const range = normalizeHistoryRange(historyRange);
  const search = String(historySearch || '').trim().toLowerCase();
  return normalizedItems.filter((item) => {
    if (!isHistoryEntryInRange(item, range)) {
      return false;
    }
    if (!search) {
      return true;
    }
    return getHistorySearchText(item).includes(search);
  });
}

function sortProcessedHistory(items) {
  const normalizedItems = Array.isArray(items) ? items.slice() : [];
  const mode = normalizeHistorySort(historySort);
  if (mode === 'oldest') {
    return normalizedItems.sort(
      (a, b) => new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime(),
    );
  }
  if (mode === 'images_desc') {
    return normalizedItems.sort((a, b) => {
      const diff = Number(b?.outputImages || 0) - Number(a?.outputImages || 0);
      if (diff !== 0) {
        return diff;
      }
      return new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime();
    });
  }
  if (mode === 'files_desc') {
    return normalizedItems.sort((a, b) => {
      const diff = Number(b?.sourceFiles || 0) - Number(a?.sourceFiles || 0);
      if (diff !== 0) {
        return diff;
      }
      return new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime();
    });
  }
  return normalizedItems.sort(
    (a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime(),
  );
}

function getVisibleHistoryItems() {
  return sortProcessedHistory(filterProcessedHistory(latestProcessedHistory));
}

function updateHistorySummary(baseItems, filteredItems) {
  const totalBase = Array.isArray(baseItems) ? baseItems.length : 0;
  const visible = Array.isArray(filteredItems) ? filteredItems.length : 0;
  const totalImages = (Array.isArray(filteredItems) ? filteredItems : []).reduce(
    (sum, item) => sum + Number(item?.outputImages || 0),
    0,
  );

  if (historyTotalBadgeEl) {
    historyTotalBadgeEl.textContent = String(visible);
    historyTotalBadgeEl.title = `${visible} visibles de ${totalBase} registros`;
  }
  if (historyTotalProcessesEl) {
    historyTotalProcessesEl.textContent = String(visible);
  }
  if (historyTotalImagesEl) {
    historyTotalImagesEl.textContent = String(totalImages);
  }
  if (historyCaptionEl) {
    historyCaptionEl.textContent = `Mostrando ${visible} de ${totalBase} registros`;
  }
}

function getHistoryEmptyMessage() {
  if (!latestProcessedHistory.length) {
    return 'Sin procesos recientes';
  }
  if (historySearch.trim()) {
    return 'No hay resultados para la busqueda';
  }
  if (historyRange === 'today') {
    return 'Sin procesos del dia de hoy';
  }
  if (historyRange === '7d') {
    return 'Sin procesos en los ultimos 7 dias';
  }
  if (historyRange === '30d') {
    return 'Sin procesos en los ultimos 30 dias';
  }
  return 'Sin procesos recientes';
}

function renderProcessedHistory(items) {
  if (Array.isArray(items)) {
    latestProcessedHistory = items.slice(0, 25);
  }
  if (!processedHistoryListEl) {
    return;
  }
  const visibleItems = getVisibleHistoryItems();
  updateHistorySummary(latestProcessedHistory, visibleItems);

  processedHistoryListEl.textContent = '';
  if (!Array.isArray(visibleItems) || visibleItems.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'friends-empty';
    empty.textContent = getHistoryEmptyMessage();
    processedHistoryListEl.appendChild(empty);
    return;
  }

  for (const item of visibleItems.slice(0, 18)) {
    const card = document.createElement('div');
    card.className = 'history-item';
    const first = firstHistoryPreview(item);

    let thumbEl = null;
    if (first.thumb) {
      thumbEl = document.createElement('img');
      thumbEl.className = 'history-thumb';
      thumbEl.src = first.thumb;
      thumbEl.alt = '';
      thumbEl.loading = 'lazy';
    } else {
      thumbEl = document.createElement('span');
      thumbEl.className = 'history-thumb-fallback';
      thumbEl.innerHTML = '<i class="bi bi-image" aria-hidden="true"></i>';
    }

    const info = document.createElement('div');
    info.className = 'history-info';

    const name = document.createElement('span');
    name.className = 'history-name';
    name.textContent = first.name || 'Proceso';

    const date = document.createElement('span');
    date.className = 'history-date';
    const exact = formatHistoryDateTime(item?.createdAt);
    const relative = formatHistoryRelative(item?.createdAt);
    date.textContent = exact ? `${exact}${relative ? ` | ${relative}` : ''}` : 'Sin fecha';

    const meta = document.createElement('div');
    meta.className = 'history-meta';

    const filesChip = document.createElement('span');
    filesChip.className = 'history-meta-chip';
    filesChip.textContent = `Entrada: ${Number(item?.sourceFiles || 0)}`;

    const imagesChip = document.createElement('span');
    imagesChip.className = 'history-meta-chip';
    imagesChip.textContent = `Salida: ${Number(item?.outputImages || 0)}`;

    meta.appendChild(filesChip);
    meta.appendChild(imagesChip);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'history-remove';
    removeBtn.setAttribute('aria-label', 'Eliminar registro');
    removeBtn.innerHTML = '<i class="bi bi-trash3-fill" aria-hidden="true"></i>';
    removeBtn.addEventListener('click', async () => {
      const entryKey = getHistoryItemKey(item);
      markHistoryEntryDeleted(item);
      latestProcessedHistory = latestProcessedHistory.filter((entry) => getHistoryItemKey(entry) !== entryKey);
      renderProcessedHistory();
      try {
        await removeRemoteHistoryEntry(item);
      } catch (_error) {
        setStatus('No se pudo eliminar el registro en Firebase.', 'error');
      }
      fetchProcessedHistory().catch(() => {});
    });

    info.appendChild(name);
    info.appendChild(date);
    info.appendChild(meta);
    card.appendChild(thumbEl);
    card.appendChild(info);
    card.appendChild(removeBtn);

    processedHistoryListEl.appendChild(card);
  }
}

function escapeCsvValue(value) {
  const text = String(value ?? '');
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function exportHistoryCsv() {
  const rows = getVisibleHistoryItems();
  if (!rows.length) {
    setStatus('No hay registros visibles para exportar.', 'error');
    return;
  }

  const header = ['fecha_iso', 'fecha_local', 'hace', 'entrada_archivos', 'salida_imagenes', 'nombres'];
  const lines = [header.join(',')];
  for (const item of rows) {
    const values = [
      item?.createdAt || '',
      formatHistoryDateTime(item?.createdAt) || '',
      formatHistoryRelative(item?.createdAt) || '',
      Number(item?.sourceFiles || 0),
      Number(item?.outputImages || 0),
      Array.isArray(item?.previewNames) ? item.previewNames.join(' | ') : '',
    ];
    lines.push(values.map(escapeCsvValue).join(','));
  }

  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(
    now.getHours(),
  ).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `historial_sales_${stamp}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setStatus('Historial exportado en CSV.', 'ok');
}

async function clearHistoryAll() {
  if (!latestProcessedHistory.length) {
    setStatus('No hay registros para limpiar.', 'error');
    return;
  }
  const confirmed = window.confirm('Se eliminara todo el historial local visible. ¿Continuar?');
  if (!confirmed) {
    return;
  }
  const snapshot = latestProcessedHistory.slice();
  const deleted = getDeletedHistoryKeys();
  for (const item of snapshot) {
    deleted.add(getHistoryItemKey(item));
  }
  saveDeletedHistoryKeys(deleted);
  saveLocalHistoryItems([]);
  latestProcessedHistory = [];
  renderProcessedHistory([]);
  try {
    await clearRemoteHistoryEntries(snapshot);
  } catch (_error) {
    setStatus('No se pudo limpiar el historial remoto completo.', 'error');
  }
  fetchProcessedHistory().catch(() => {});
  setStatus('Historial limpiado.', 'ok');
}

async function makeThumbFromObjectUrl(url, size = 56) {
  if (!url) {
    return '';
  }
  try {
    return await new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        const ratio = Math.max(size / image.width, size / image.height);
        const drawWidth = image.width * ratio;
        const drawHeight = image.height * ratio;
        const x = (size - drawWidth) / 2;
        const y = (size - drawHeight) / 2;
        ctx.drawImage(image, x, y, drawWidth, drawHeight);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      image.onerror = () => resolve('');
      image.src = url;
    });
  } catch (_error) {
    return '';
  }
}

async function buildHistoryPreviews() {
  const source = Array.isArray(previewImages) ? previewImages.slice(0, 3) : [];
  const output = [];
  for (const item of source) {
    const thumb = await makeThumbFromObjectUrl(item.url);
    output.push({
      name: item.name || 'imagen',
      thumb,
    });
  }
  return output;
}

async function sendPresenceHeartbeat() {
  if (!firebaseUser || !firebaseAuthRequired) {
    return;
  }
  const collection = getPresenceCollection();
  if (!collection) {
    return;
  }
  const payload = {
    uid: firebaseUser.uid || 'self',
    name: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Usuario'),
    email: firebaseUser.email || '',
    picture: firebaseUser.photoURL || '',
    lastSeen: Date.now(),
  };
  await collection.doc(payload.uid).set(payload, { merge: true });
}

async function fetchActiveUsers() {
  if (!firebaseUser || !firebaseAuthRequired) {
    latestActiveUsers = [];
    latestInactiveUsers = [];
    renderUsersPresence();
    return;
  }
  const collection = getPresenceCollection();
  if (!collection) {
    return;
  }
  const snapshot = await collection.orderBy('lastSeen', 'desc').limit(60).get();
  const now = Date.now();
  const users = snapshot.docs.map((doc) => {
    const data = doc.data() || {};
    const lastSeen = Number(data.lastSeen || 0);
    return {
      uid: String(data.uid || doc.id || '').trim(),
      name: String(data.name || (data.email ? String(data.email).split('@')[0] : 'Usuario')).trim() || 'Usuario',
      email: String(data.email || '').trim(),
      picture: String(data.picture || '').trim(),
      agoSec: Math.max(0, Math.round((now - lastSeen) / 1000)),
      isActive: now - lastSeen <= STATIC_ACTIVE_WINDOW_MS,
    };
  });
  latestActiveUsers = users.filter((item) => item.isActive).slice(0, 20);
  latestInactiveUsers = users.filter((item) => !item.isActive).slice(0, 40);
  renderUsersPresence();
}

async function fetchProcessedHistory() {
  if (!firebaseUser || !firebaseAuthRequired) {
    renderProcessedHistory([]);
    return;
  }
  const collection = getHistoryCollection(String(firebaseUser.uid || '').trim());
  if (!collection) {
    return;
  }
  const snapshot = await collection.orderBy('createdAtMs', 'desc').limit(STATIC_HISTORY_LIMIT).get();
  const remoteItems = snapshot.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      firestoreId: doc.id,
      createdAt: String(data.createdAt || ''),
      createdAtMs: Number(data.createdAtMs || 0),
      outputImages: Number(data.outputImages || 0),
      sourceFiles: Number(data.sourceFiles || 0),
      previewNames: Array.isArray(data.previewNames) ? data.previewNames : [],
      previews: Array.isArray(data.previews) ? data.previews : [],
    };
  });
  const merged = mergeHistoryItems(remoteItems);
  saveLocalHistoryItems(merged);
  renderProcessedHistory(merged);
}

function startPresenceFeatures() {
  stopPresenceTimers();
  const selfStub = getSelfPresenceStub();
  if (selfStub) {
    latestActiveUsers = [selfStub];
    latestInactiveUsers = [];
    renderUsersPresence();
  }
  renderProcessedHistory(getLocalHistoryItems());
  sendPresenceHeartbeat().catch((error) => {
    setStatus(error.message || 'No se pudo registrar presencia.', 'error');
  });
  fetchActiveUsers().catch((error) => {
    setStatus(error.message || 'No se pudo cargar usuarios activos.', 'error');
  });
  fetchProcessedHistory().catch(() => {});
  presenceHeartbeatTimer = setInterval(() => {
    sendPresenceHeartbeat().catch(() => {});
  }, 25000);
  activeUsersPollTimer = setInterval(() => {
    fetchActiveUsers().catch(() => {});
    fetchProcessedHistory().catch(() => {});
  }, 15000);
}

function renderNotificationState() {
  if (!notificationBtn) {
    return;
  }
  if (!firebasePushEnabled) {
    notificationBtn.hidden = true;
    return;
  }
  notificationBtn.hidden = false;
  notificationBtn.classList.toggle('active', Notification.permission === 'granted');
}

function updateAuthPanelLayoutState() {
  if (!authPanelEl || !authLoginBtn || !authAvatarWrapEl) {
    return;
  }
  const loginOnlyVisible = !authLoginBtn.hidden && authAvatarWrapEl.hidden;
  authPanelEl.classList.toggle('is-login-only', loginOnlyVisible);
}

function syncAuthMenuState() {
  if (!authAvatarWrapEl || !authLogoutBtn) {
    return;
  }

  const canShowMenu = Boolean(firebaseAuthRequired && firebaseAuthReady && firebaseUser && !authAvatarWrapEl.hidden);
  const showMenu = canShowMenu && (isAdaptadorPage || isAuthMenuOpen);
  authLogoutBtn.hidden = !showMenu;
  authAvatarWrapEl.classList.toggle('is-open', showMenu);
  authAvatarWrapEl.setAttribute('aria-expanded', showMenu ? 'true' : 'false');
  updateAuthPanelLayoutState();
}

function closeAuthMenu() {
  isAuthMenuOpen = false;
  syncAuthMenuState();
}

function renderAuthState() {
  if (!authLoginBtn || !authAvatarWrapEl || !authAvatarEl || !authAvatarFallbackEl || !authLogoutBtn) {
    return;
  }

  if (!firebaseAuthRequired) {
    isAuthMenuOpen = false;
    authLoginBtn.hidden = true;
    authAvatarWrapEl.hidden = true;
    syncAuthMenuState();
    updateAuthPanelLayoutState();
    return;
  }

  if (!firebaseAuthReady) {
    isAuthMenuOpen = false;
    authLoginBtn.hidden = true;
    authAvatarWrapEl.hidden = true;
    syncAuthMenuState();
    updateAuthPanelLayoutState();
    return;
  }

  if (firebaseUser) {
    const photo = firebaseUser.photoURL || 'https://www.gravatar.com/avatar/?d=mp&s=96';
    authAvatarEl.src = photo;
    authAvatarEl.alt = '';
    authAvatarEl.referrerPolicy = 'no-referrer';
    authAvatarEl.hidden = false;
    authAvatarFallbackEl.textContent = getUserInitial(firebaseUser);
    authAvatarFallbackEl.hidden = true;
    authAvatarWrapEl.title = firebaseUser.email || 'Usuario';
    authLoginBtn.hidden = true;
    authAvatarWrapEl.hidden = false;
    syncAuthMenuState();
    updateAuthPanelLayoutState();
    return;
  }

  isAuthMenuOpen = false;
  authAvatarEl.src = '';
  authAvatarEl.alt = '';
  authAvatarWrapEl.title = '';
  authLoginBtn.hidden = false;
  authAvatarWrapEl.hidden = true;
  syncAuthMenuState();
  updateAuthPanelLayoutState();
}

async function getCurrentAuthToken(forceRefresh = false) {
  if (!firebaseAuthRequired || !firebaseUser) {
    return '';
  }
  return firebaseUser.getIdToken(forceRefresh);
}

async function initFirebaseAuth() {
  renderAuthState();
  if (!window.firebase || !window.firebase.auth) {
    setAuthStatus('No se pudo cargar Firebase en el navegador.');
    return;
  }

  try {
    const data = STATIC_FIREBASE_CONFIG || {};
    firebaseAuthRequired = Boolean(data.authEnabled);
    firebasePushEnabled = Boolean(data.pushEnabled);
    firebaseVapidKey = firebasePushEnabled ? String(data.vapidKey || '') : '';

    if (!firebaseAuthRequired) {
      firebaseAuthReady = true;
      renderAuthState();
      renderNotificationState();
      return;
    }

    if (!STATIC_FIREBASE_WEB_CONFIG) {
      throw new Error('Falta configuracion web estatica de Firebase.');
    }

    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(STATIC_FIREBASE_WEB_CONFIG);
    }
    if (firebasePushEnabled && window.firebase.messaging) {
      firebaseMessaging = window.firebase.messaging();
      if (!pushListenerAttached) {
        firebaseMessaging.onMessage((payload) => {
          const title = payload?.notification?.title || 'Notificacion';
          const body = payload?.notification?.body || 'Tienes una notificacion nueva.';
          setStatus(`${title}: ${body}`, 'ok');
        });
        pushListenerAttached = true;
      }
    }
    await window.firebase.auth().setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);
    window.firebase.auth().onAuthStateChanged((user) => {
      if (user?.email && !isAllowedGmail(user.email)) {
        window.firebase
          .auth()
          .signOut()
          .catch(() => {});
        firebaseUser = null;
        setStatus('Solo se permite ingresar con cuentas @gmail.com.', 'error');
        renderAuthState();
        return;
      }
      firebaseUser = user || null;
      renderAuthState();
      renderNotificationState();
      if (firebaseUser) {
        startPresenceFeatures();
      } else {
        stopPresenceTimers();
        latestActiveUsers = [];
        latestInactiveUsers = [];
        renderUsersPresence();
        renderProcessedHistory([]);
      }
    });

    firebaseAuthReady = true;
    renderAuthState();
    renderNotificationState();
  } catch (error) {
    firebaseAuthReady = false;
    firebaseAuthRequired = true;
    firebasePushEnabled = false;
    renderAuthState();
    renderNotificationState();
    setAuthStatus(error.message || 'No se pudo iniciar autenticacion.');
  }
}

async function registerPushToken() {
  if (!firebasePushEnabled || !firebaseMessaging || !firebaseUser) {
    return;
  }
  if (!('serviceWorker' in navigator)) {
    setStatus('Este navegador no soporta service worker para push.', 'error');
    return;
  }

  const registration = await navigator.serviceWorker.register('./firebase-messaging-sw.js');
  await navigator.serviceWorker.ready;

  if (!registration.active) {
    await new Promise((resolve) => {
      const sw = registration.installing || registration.waiting;
      if (!sw) {
        resolve();
        return;
      }
      sw.addEventListener('statechange', () => {
        if (sw.state === 'activated') {
          resolve();
        }
      });
    });
  }

  const token = await firebaseMessaging.getToken({
    vapidKey: firebaseVapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!token) {
    throw new Error('No se pudo generar token de notificaciones.');
  }
  pushToken = token;
}

async function unregisterPushToken() {
  if (!pushToken || !firebaseUser) {
    pushToken = '';
    return;
  }
  pushToken = '';
}

function clearDownloadProgressHideTimer() {
  if (!downloadProgressHideTimer) {
    return;
  }
  clearTimeout(downloadProgressHideTimer);
  downloadProgressHideTimer = null;
}

function resetDownloadProgressFields() {
  if (downloadProgressFillEl) {
    downloadProgressFillEl.style.width = '0%';
  }
  if (downloadProgressValueEl) {
    downloadProgressValueEl.textContent = '0%';
  }
  if (downloadProgressLabelEl) {
    downloadProgressLabelEl.textContent = 'Preparando descarga...';
  }
}

function setDownloadProgress(percent, label = '') {
  if (!downloadProgressEl) {
    return;
  }

  clearDownloadProgressHideTimer();
  const normalized = Math.max(0, Math.min(100, Math.round(percent)));
  downloadProgressEl.hidden = false;
  downloadProgressEl.classList.remove('is-hiding');
  downloadProgressEl.classList.add('is-visible');
  syncDownloadProgressOffset();

  if (downloadProgressFillEl) {
    downloadProgressFillEl.style.width = `${normalized}%`;
  }
  if (downloadProgressValueEl) {
    downloadProgressValueEl.textContent = `${normalized}%`;
  }
  if (downloadProgressLabelEl && label) {
    downloadProgressLabelEl.textContent = label;
  }
}

function resetDownloadProgress(delayMs = 0) {
  if (!downloadProgressEl) {
    return;
  }

  clearDownloadProgressHideTimer();
  const hideProgress = () => {
    if (downloadProgressEl.hidden) {
      downloadProgressEl.classList.remove('is-visible', 'is-hiding');
      resetDownloadProgressFields();
      return;
    }

    downloadProgressEl.classList.remove('is-visible');
    downloadProgressEl.classList.add('is-hiding');
    downloadProgressHideTimer = setTimeout(() => {
      downloadProgressEl.hidden = true;
      downloadProgressEl.classList.remove('is-hiding');
      resetDownloadProgressFields();
      downloadProgressHideTimer = null;
    }, DOWNLOAD_PROGRESS_HIDE_ANIMATION_MS);
  };

  if (delayMs > 0) {
    downloadProgressHideTimer = setTimeout(hideProgress, delayMs);
    return;
  }

  hideProgress();
}

function setButtonProgress(percent, label) {
  if (!submitBtn) {
    return;
  }
  const normalized = Math.max(0, Math.min(100, Math.round(percent)));
  setDownloadProgress(normalized, label);
  if (isHelpPrimaryAction()) {
    return;
  }
  submitBtn.style.setProperty('--progress', `${normalized}%`);
  setPrimaryActionText(label);
}

function syncPrimaryActionLabel() {
  if (!submitBtn) {
    return;
  }
  if (isHelpPrimaryAction()) {
    setPrimaryActionText('\u00bfComo funciona la pagina?');
    return;
  }
  const isBusy = !!submitBtn.disabled;
  if (isBusy) {
    return;
  }
  const hasFiles = selectedFiles.length > 0;
  const label = hasFiles
    ? hasDownloadedZip
      ? 'Descargar zip otra vez'
      : 'Descarga el ZIP'
    : 'Carga tu archivo';
  setPrimaryActionText(label);
}

function resetSubmitButton() {
  if (!submitBtn) {
    return;
  }
  submitBtn.style.setProperty('--progress', '0%');
  resetDownloadProgress();
  syncPrimaryActionLabel();
}

function readBlobAsText(blob) {
  return new Promise((resolve) => {
    if (!blob) {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => resolve('');
    reader.readAsText(blob);
  });
}

function clearPreviewUrls() {
  for (const item of previewImages) {
    URL.revokeObjectURL(item.url);
  }
  previewImages = [];
}

function setActivePreview(index) {
  activePreviewIndex = index;
  if (index < 0 || !previewImages[index]) {
    previewImage.src = '';
    previewImage.classList.remove('visible');
    if (previewCompareOriginal) {
      previewCompareOriginal.src = '';
    }
    if (previewCompareFit) {
      previewCompareFit.src = '';
    }
    emptyPreview.style.display = 'block';
    resetPreviewTransform();
    if (previewPrevBtn) {
      previewPrevBtn.disabled = true;
    }
    if (previewNextBtn) {
      previewNextBtn.disabled = true;
    }
    previewNaturalWidth = 0;
    previewNaturalHeight = 0;
    renderPreviewMode();
    updatePreviewHeader();
    renderPreviewFilmstrip();
    return;
  }

  const current = previewImages[index];
  previewImage.src = current.url;
  if (previewCompareOriginal) {
    previewCompareOriginal.src = current.url;
  }
  if (previewCompareFit) {
    previewCompareFit.src = current.url;
  }
  previewImage.classList.add('visible');
  emptyPreview.style.display = 'none';
  resetPreviewTransform();
  if (previewPrevBtn) {
    previewPrevBtn.disabled = previewImages.length <= 1;
  }
  if (previewNextBtn) {
    previewNextBtn.disabled = previewImages.length <= 1;
  }
  loadPreviewDimensions(current.url);
  renderPreviewMode();
  updatePreviewHeader();
  renderPreviewFilmstrip();
}

function renderSelectedFiles() {
  selectedFilesEl.textContent = '';

  for (const item of selectedFiles) {
    const tag = document.createElement('div');
    tag.className = 'file-tag';
    tag.title = item.file.name;
    const tagText = document.createElement('span');
    tagText.className = 'file-tag-text';
    tagText.textContent = item.isZip ? `ZIP | ${item.file.name}` : item.file.name;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'file-tag-remove';
    removeBtn.setAttribute('aria-label', `Eliminar ${item.file.name}`);
    removeBtn.innerHTML = '<i class="bi bi-trash3-fill" aria-hidden="true"></i>';
    removeBtn.addEventListener('click', async (event) => {
      event.preventDefault();
      selectedFiles = selectedFiles.filter((fileItem) => fileItem.id !== item.id);
      hasDownloadedZip = false;
      await refreshPreviews();
      updateCounters();
      syncActionCards();
    });

    tag.appendChild(tagText);
    tag.appendChild(removeBtn);
    selectedFilesEl.appendChild(tag);
  }
}

async function collectZipPreviewImages(file, sourceId, currentToken, maxItems = MAX_PREVIEW_IMAGES) {
  if (!window.JSZip) {
    return { items: [], totalImages: 0 };
  }

  try {
    const zip = await window.JSZip.loadAsync(file);
    const entries = Object.values(zip.files);
    const items = [];
    let totalImages = 0;

    for (let i = 0; i < entries.length; i += 1) {
      if (buildPreviewToken !== currentToken) {
        return { items: [], totalImages: 0 };
      }

      const entry = entries[i];
      if (entry.dir || !isImageFile(entry.name)) {
        continue;
      }

      totalImages += 1;
      if (items.length < maxItems) {
        const content = await entry.async('blob');
        items.push({
          sourceId,
          name: entry.name,
          url: URL.createObjectURL(content),
        });
      }
    }

    return { items, totalImages };
  } catch (_error) {
    return { items: [], totalImages: 0 };
  }
}

function updateCounters() {
  const zipCount = selectedFiles.filter((item) => item.isZip).length;
  const imageCount = detectedImagesCount;
  if (countZip) {
    countZip.innerHTML = `<i class="bi bi-file-earmark-zip-fill"></i> ZIP: ${zipCount}`;
  }
  if (countImages) {
    countImages.innerHTML = `<i class="bi bi-image-fill"></i> Imagenes: ${imageCount}`;
  }
}

function syncActionCards() {
  const hasFiles = selectedFiles.length > 0;
  const isBusy = !!submitBtn?.disabled;
  const uploadPromptText = isAdaptadorPage ? 'Click para subir el archivo' : 'Subir Excel';

  if (uploadCard) {
    const shouldLock = hasFiles || isBusy;
    const shouldHighlightUpload = !hasFiles && !isBusy;
    uploadCard.classList.toggle('is-locked', shouldLock);
    uploadCard.classList.toggle('is-active', shouldHighlightUpload);
    uploadCard.classList.remove('is-ready');
    uploadCard.setAttribute('aria-disabled', shouldLock ? 'true' : 'false');
    uploadCard.setAttribute('aria-label', hasFiles ? 'Archivo cargado' : uploadPromptText);
    uploadCard.removeAttribute('data-lock-message');
    const uploadLabel = uploadCard.querySelector('.work-card-label');
    if (uploadLabel) {
      uploadLabel.textContent = hasFiles ? 'Archivo cargado' : uploadPromptText;
    }
  }

  if (downloadCard) {
    const isReadyToDownload = hasFiles && !isBusy;
    const shouldDisable = !isReadyToDownload;
    const downloadBaseText = isAdaptadorPage
      ? 'Descargar ZIP'
      : isTablaVSPage
        ? 'Datos adicionales'
        : 'Descargar informe';
    const downloadRepeatText = isAdaptadorPage
      ? 'Descargar ZIP otra vez'
      : isTablaVSPage
        ? 'Datos adicionales'
        : 'Descargar informe otra vez';
    const downloadLabelText = hasFiles
      ? hasDownloadedZip
        ? downloadRepeatText
        : downloadBaseText
      : downloadBaseText;
    downloadCard.classList.toggle('is-disabled', shouldDisable);
    downloadCard.classList.toggle('is-ready', isReadyToDownload);
    downloadCard.classList.toggle('is-active', isReadyToDownload);
    downloadCard.setAttribute('aria-disabled', shouldDisable ? 'true' : 'false');
    downloadCard.setAttribute('aria-label', isReadyToDownload ? `${downloadLabelText} ahora` : downloadLabelText);
    downloadCard.removeAttribute('data-lock-message');
    const downloadLabel = downloadCard.querySelector('.work-card-label');
    if (downloadLabel) {
      downloadLabel.textContent = downloadLabelText;
    }
  }

  syncPrimaryActionLabel();
}

async function refreshPreviews() {
  clearPreviewUrls();
  const localToken = Date.now();
  buildPreviewToken = localToken;

  const nextPreviews = [];
  let nextDetectedImagesCount = 0;

  for (let i = 0; i < selectedFiles.length; i += 1) {
    if (buildPreviewToken !== localToken || nextPreviews.length >= MAX_PREVIEW_IMAGES) {
      break;
    }

    const item = selectedFiles[i];
    if (!item.isZip) {
      nextDetectedImagesCount += 1;
      nextPreviews.push({
        sourceId: item.id,
        name: item.file.name,
        url: URL.createObjectURL(item.file),
      });
      continue;
    }

    const remainingSlots = Math.max(0, MAX_PREVIEW_IMAGES - nextPreviews.length);
    const zipData = await collectZipPreviewImages(item.file, item.id, localToken, remainingSlots);
    nextDetectedImagesCount += Number(zipData.totalImages || 0);
    for (const zipPreview of zipData.items) {
      if (nextPreviews.length >= MAX_PREVIEW_IMAGES) {
        break;
      }
      nextPreviews.push(zipPreview);
    }
  }

  if (buildPreviewToken !== localToken) {
    for (const item of nextPreviews) {
      URL.revokeObjectURL(item.url);
    }
    return;
  }

  previewImages = nextPreviews;
  detectedImagesCount = nextDetectedImagesCount;
  renderSelectedFiles();
  setActivePreview(previewImages.length > 0 ? 0 : -1);
}

async function setSelectedFiles(fileList) {
  selectedFiles = Array.from(fileList || []).map((file) => ({
    id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    isZip: isZipFile(file),
  }));
  hasDownloadedZip = false;

  if (selectedFiles.length === 0) {
    detectedImagesCount = 0;
    previewCompareMode = false;
    renderSelectedFiles();
    clearPreviewUrls();
    setActivePreview(-1);
    updateCounters();
    syncActionCards();
    return;
  }

  setStatus('Preparando previsualizacion...', 'ok');
  await refreshPreviews();
  updateCounters();
  syncActionCards();
  setStatus('Archivos listos para procesar.', 'ok');
}

async function checkHealth() {
  if (!healthEl) {
    return;
  }
  const target = isAdaptadorVisorPage ? STATIC_PROCESSING_PRESETS.visor : STATIC_PROCESSING_PRESETS.sales;
  const authText = firebaseAuthRequired ? 'Firebase activo' : 'Firebase opcional';
  healthEl.textContent = `Modo estatico | ${target.width}x${target.height} | ${target.fit} | procesamiento local | ${authText}`;
  healthEl.style.color = '#1e3a8a';
}

async function readErrorMessage(response) {
  const rawText = await response.text().catch(() => '');
  if (!rawText) {
    return `Error HTTP ${response.status}.`;
  }
  try {
    const data = JSON.parse(rawText);
    return data.error || `Error HTTP ${response.status}.`;
  } catch (_error) {
    return rawText.slice(0, 220);
  }
}

async function extractXhrError(xhr) {
  if (typeof xhr.response === 'string' && xhr.response) {
    return xhr.response;
  }

  const text = await readBlobAsText(xhr.response);
  if (!text) {
    return `Error HTTP ${xhr.status}.`;
  }

  try {
    const data = JSON.parse(text);
    return data.error || `Error HTTP ${xhr.status}.`;
  } catch (_error) {
    return text.slice(0, 220);
  }
}

function sendResizeRequest(formData, authToken = '', targetMode = '') {
  void formData;
  void authToken;
  void targetMode;
  return Promise.reject(new Error('La app ya no usa el endpoint de resize; ahora procesa localmente.'));
}

itemsInput.addEventListener('change', async () => {
  await setSelectedFiles(itemsInput.files);
});

dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropzone.classList.add('drag-over');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('drag-over');
});

dropzone.addEventListener('drop', async (event) => {
  event.preventDefault();
  dropzone.classList.remove('drag-over');

  if (!event.dataTransfer?.files) {
    return;
  }

  const transfer = new DataTransfer();
  for (const file of event.dataTransfer.files) {
    transfer.items.add(file);
  }
  itemsInput.files = transfer.files;
  await setSelectedFiles(transfer.files);
});

uploadCard?.addEventListener('click', () => {
  if (isTablaVSPage) {
    return;
  }
  if (uploadCard.getAttribute('aria-disabled') === 'true') {
    return;
  }
  itemsInput.click();
});

uploadCard?.addEventListener('keydown', (event) => {
  if (isTablaVSPage) {
    return;
  }
  if (event.key !== 'Enter' && event.key !== ' ') {
    return;
  }
  event.preventDefault();
  if (uploadCard.getAttribute('aria-disabled') === 'true') {
    return;
  }
  itemsInput.click();
});

downloadCard?.addEventListener('click', () => {
  if (isTablaVSPage) {
    return;
  }
  if (downloadCard.getAttribute('aria-disabled') === 'true') {
    return;
  }
  form.requestSubmit();
});

downloadCard?.addEventListener('keydown', (event) => {
  if (isTablaVSPage) {
    return;
  }
  if (event.key !== 'Enter' && event.key !== ' ') {
    return;
  }
  event.preventDefault();
  if (downloadCard.getAttribute('aria-disabled') === 'true') {
    return;
  }
  form.requestSubmit();
});

backBtn?.addEventListener('click', async () => {
  itemsInput.value = '';
  await setSelectedFiles([]);
  setStatus('Seleccion limpiada.', 'ok');
});

submitBtn?.addEventListener('click', (event) => {
  if (!isHelpPrimaryAction()) {
    return;
  }
  event.preventDefault();
  openHelpDialog();
});

helpDialogCloseBtn?.addEventListener('click', () => {
  closeHelpDialog();
});

helpDialogDismissBtn?.addEventListener('click', () => {
  closeHelpDialog();
});

helpDialog?.addEventListener('click', (event) => {
  if (event.target !== helpDialog) {
    return;
  }
  closeHelpDialog();
});

window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') {
    return;
  }
  if (isAuthMenuOpen) {
    closeAuthMenu();
  }
  if (!helpDialog || helpDialog.hidden) {
    return;
  }
  closeHelpDialog();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (selectedFiles.length === 0) {
    setStatus('Primero carga un archivo para continuar.', 'ok');
    itemsInput.click();
    return;
  }

  if (firebaseAuthRequired && !firebaseUser) {
    setStatus('Inicia sesion para procesar archivos.', 'error');
    return;
  }

  submitBtn.disabled = true;
  syncActionCards();
  setButtonProgress(5, 'Preparando...');
  setStatus(`Procesando ${selectedFiles.length} archivo(s) en tu navegador...`, 'ok');

  try {
    const selectedSnapshot = selectedFiles.map((item) => item.file.name);
    const targetMode = isAdaptadorVisorPage ? 'visor' : 'sales';
    const result = await processImagesClientSide(targetMode);
    const blob = result.blob;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'imagenes-ajustadas.zip';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    hasDownloadedZip = true;

    setStatus('Descargado con exito.', 'ok');
    resetDownloadProgress(900);
    const previews = await buildHistoryPreviews();
    const historyEntry = {
      createdAt: new Date().toISOString(),
      outputImages: Number(result.totalImages || (previewImages.length > 0 ? previewImages.length : selectedSnapshot.length)),
      sourceFiles: selectedSnapshot.length,
      previewNames: selectedSnapshot.slice(0, 3),
      previews,
    };
    const remoteEntry = await persistHistoryEntry(historyEntry).catch(() => null);
    const localItems = addLocalHistoryEntry(remoteEntry || historyEntry);
    renderProcessedHistory(localItems);
    fetchProcessedHistory().catch(() => {});
  } catch (error) {
    setStatus(error.message || 'No fue posible procesar los archivos.', 'error');
  } finally {
    submitBtn.disabled = false;
    resetSubmitButton();
    syncActionCards();
  }
});

previewPrevBtn?.addEventListener('click', () => {
  if (previewImages.length <= 1) {
    return;
  }
  const nextIndex = activePreviewIndex <= 0 ? previewImages.length - 1 : activePreviewIndex - 1;
  setActivePreview(nextIndex);
});

previewNextBtn?.addEventListener('click', () => {
  if (previewImages.length <= 1) {
    return;
  }
  const nextIndex = activePreviewIndex >= previewImages.length - 1 ? 0 : activePreviewIndex + 1;
  setActivePreview(nextIndex);
});

previewFitBtn?.addEventListener('click', () => {
  resetPreviewTransform();
  updatePreviewHeader();
});

preview100Btn?.addEventListener('click', () => {
  previewScale = 1;
  previewTranslateX = 0;
  previewTranslateY = 0;
  applyPreviewTransform();
  updatePreviewHeader();
});

preview200Btn?.addEventListener('click', () => {
  previewScale = 2;
  previewTranslateX = 0;
  previewTranslateY = 0;
  applyPreviewTransform();
  updatePreviewHeader();
});

previewCompareBtn?.addEventListener('click', () => {
  if (activePreviewIndex < 0 || !previewImages[activePreviewIndex]) {
    return;
  }
  previewCompareMode = !previewCompareMode;
  renderPreviewMode();
});

previewFullscreenBtn?.addEventListener('click', async () => {
  if (!viewerCanvas) {
    return;
  }
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await viewerCanvas.requestFullscreen();
  } catch (_error) {
    // ignore browser fullscreen errors
  }
});

viewerCanvas.addEventListener('wheel', (event) => {
  if (previewCompareMode) {
    return;
  }
  if (!previewImage.classList.contains('visible')) {
    return;
  }
  event.preventDefault();
  const delta = event.deltaY > 0 ? -0.1 : 0.1;
  const nextScale = Math.max(1, Math.min(4, previewScale + delta));
  previewScale = Number(nextScale.toFixed(2));
  if (previewScale === 1) {
    previewTranslateX = 0;
    previewTranslateY = 0;
  }
  applyPreviewTransform();
});

previewImage.addEventListener('mousedown', (event) => {
  if (previewCompareMode) {
    return;
  }
  if (previewScale <= 1 || !previewImage.classList.contains('visible')) {
    return;
  }
  isDraggingPreview = true;
  dragStartX = event.clientX - previewTranslateX;
  dragStartY = event.clientY - previewTranslateY;
  previewImage.classList.add('dragging');
});

window.addEventListener('mousemove', (event) => {
  if (!isDraggingPreview) {
    return;
  }
  previewTranslateX = event.clientX - dragStartX;
  previewTranslateY = event.clientY - dragStartY;
  applyPreviewTransform();
});

window.addEventListener('mouseup', () => {
  if (!isDraggingPreview) {
    return;
  }
  isDraggingPreview = false;
  previewImage.classList.remove('dragging');
});

previewImage.addEventListener('dblclick', () => {
  resetPreviewTransform();
});

window.addEventListener('keydown', (event) => {
  const target = event.target;
  const isTyping =
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
  if (isTyping) {
    return;
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    if (previewImages.length <= 1) {
      return;
    }
    const nextIndex = activePreviewIndex <= 0 ? previewImages.length - 1 : activePreviewIndex - 1;
    setActivePreview(nextIndex);
    return;
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    if (previewImages.length <= 1) {
      return;
    }
    const nextIndex = activePreviewIndex >= previewImages.length - 1 ? 0 : activePreviewIndex + 1;
    setActivePreview(nextIndex);
    return;
  }
  if (event.key === '+' || event.key === '=') {
    event.preventDefault();
    previewScale = Math.min(4, Number((previewScale + 0.1).toFixed(2)));
    applyPreviewTransform();
    updatePreviewHeader();
    return;
  }
  if (event.key === '-') {
    event.preventDefault();
    previewScale = Math.max(1, Number((previewScale - 0.1).toFixed(2)));
    if (previewScale === 1) {
      previewTranslateX = 0;
      previewTranslateY = 0;
    }
    applyPreviewTransform();
    updatePreviewHeader();
    return;
  }
  if (event.key === '0') {
    event.preventDefault();
    resetPreviewTransform();
    updatePreviewHeader();
    return;
  }
  if (event.key.toLowerCase() === 'c') {
    event.preventDefault();
    previewCompareBtn?.click();
    return;
  }
  if (event.key.toLowerCase() === 'f') {
    event.preventDefault();
    previewFullscreenBtn?.click();
  }
});

authLoginBtn?.addEventListener('click', () => {
  closeAuthMenu();
  if (!firebaseAuthRequired) {
    setStatus('La autenticacion no esta activa en el servidor.', 'error');
    return;
  }
  if (!firebaseAuthReady) {
    setStatus('Firebase aun no esta listo. Intenta de nuevo.', 'error');
    return;
  }
  const provider = new window.firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  window.firebase
    .auth()
    .signInWithPopup(provider)
    .then((result) => {
      const email = result?.user?.email || '';
      if (!isAllowedGmail(email)) {
        return window.firebase.auth().signOut().then(() => {
          throw new Error('Solo se permite ingresar con cuentas @gmail.com.');
        });
      }
      setStatus('Sesion iniciada con Google.', 'ok');
    })
    .catch((error) => {
      setStatus(error.message || 'No fue posible iniciar sesion con Google.', 'error');
    });
});

authAvatarWrapEl?.addEventListener('click', (event) => {
  if (authAvatarWrapEl.hidden || !firebaseUser) {
    return;
  }
  event.stopPropagation();
  isAuthMenuOpen = !isAuthMenuOpen;
  syncAuthMenuState();
});

authAvatarWrapEl?.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return;
  }
  if (authAvatarWrapEl.hidden || !firebaseUser) {
    return;
  }
  event.preventDefault();
  isAuthMenuOpen = !isAuthMenuOpen;
  syncAuthMenuState();
});

document.addEventListener('click', (event) => {
  if (!isAuthMenuOpen) {
    return;
  }
  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }
  if (authAvatarWrapEl?.contains(target) || authLogoutBtn?.contains(target)) {
    return;
  }
  closeAuthMenu();
});

notificationBtn?.addEventListener('click', async () => {
  if (!firebasePushEnabled) {
    setStatus('Notificaciones push no activas en este servidor.', 'error');
    return;
  }
  if (!firebaseUser) {
    setStatus('Inicia sesion para activar notificaciones.', 'error');
    return;
  }

  try {
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('No se concedieron permisos de notificacion.', 'error');
        renderNotificationState();
        return;
      }
    } else if (Notification.permission !== 'granted') {
      setStatus('Activa notificaciones del sitio en el navegador.', 'error');
      renderNotificationState();
      return;
    }

    await registerPushToken();
    setStatus('Notificaciones push activadas.', 'ok');
    renderNotificationState();
  } catch (error) {
    setStatus(error.message || 'No fue posible activar notificaciones.', 'error');
  }
});

authLogoutBtn?.addEventListener('click', async () => {
  closeAuthMenu();
  try {
    stopPresenceTimers();
    await unregisterPushToken();
    await window.firebase.auth().signOut();
    setStatus('Sesion cerrada.', 'ok');
  } catch (_error) {
    setStatus('No fue posible cerrar sesion.', 'error');
  }
});

authAvatarEl?.addEventListener('error', () => {
  authAvatarEl.hidden = true;
  if (authAvatarFallbackEl) {
    authAvatarFallbackEl.textContent = getUserInitial(firebaseUser);
    authAvatarFallbackEl.hidden = false;
  }
});

authAvatarEl?.addEventListener('load', () => {
  authAvatarEl.hidden = false;
  if (authAvatarFallbackEl) {
    authAvatarFallbackEl.hidden = true;
  }
});

window.addEventListener('beforeunload', clearPreviewUrls);
window.addEventListener('focus', () => {
  if (firebaseUser) {
    sendPresenceHeartbeat().catch(() => {});
    fetchActiveUsers().catch(() => {});
    fetchProcessedHistory().catch(() => {});
  }
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && firebaseUser) {
    sendPresenceHeartbeat().catch(() => {});
    fetchActiveUsers().catch(() => {});
    fetchProcessedHistory().catch(() => {});
  }
});
setActivePreview(-1);
updateCounters();
syncActionCards();
renderAuthState();
renderNotificationState();
renderUsersPresence();
renderProcessedHistory([]);
syncRailCurrentByPath();
initFirebaseAuth();
checkHealth();

historyRangeEl?.addEventListener('change', () => {
  historyRange = normalizeHistoryRange(historyRangeEl.value);
  renderProcessedHistory();
});

historySearchEl?.addEventListener('input', () => {
  historySearch = String(historySearchEl.value || '').trim();
  renderProcessedHistory();
});

historySortEl?.addEventListener('change', () => {
  historySort = normalizeHistorySort(historySortEl.value);
  renderProcessedHistory();
});

historyExportBtn?.addEventListener('click', () => {
  exportHistoryCsv();
});

historyClearBtn?.addEventListener('click', () => {
  clearHistoryAll();
});

for (const tab of usersFilterTabEls) {
  tab.addEventListener('click', () => {
    const nextFilter = String(tab.dataset.filter || '').trim();
    if (!nextFilter || (nextFilter !== 'active' && nextFilter !== 'inactive')) {
      return;
    }
    usersFilter = nextFilter;
    renderUsersPresence();
  });
}

function loadImageElementFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo abrir una imagen.'));
    };
    image.src = objectUrl;
  });
}

async function renderBlobToJpeg(blob, target) {
  const image = await loadImageElementFromBlob(blob);
  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('El navegador no pudo crear el lienzo de conversion.');
  }

  const srcWidth = Number(image.naturalWidth || image.width || 0);
  const srcHeight = Number(image.naturalHeight || image.height || 0);
  if (!srcWidth || !srcHeight) {
    throw new Error('La imagen no tiene dimensiones validas.');
  }

  const scale = Math.max(target.width / srcWidth, target.height / srcHeight);
  const drawWidth = srcWidth * scale;
  const drawHeight = srcHeight * scale;
  const dx = (target.width - drawWidth) / 2;
  const dy = (target.height - drawHeight) / 2;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, target.width, target.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, dx, dy, drawWidth, drawHeight);

  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('No se pudo exportar la imagen convertida.'));
          return;
        }
        resolve(result);
      },
      'image/jpeg',
      STATIC_JPEG_QUALITY,
    );
  });
}

async function collectImagesForProcessing() {
  const items = [];
  for (const selectedItem of selectedFiles) {
    const sourcePath = selectedItem.file.webkitRelativePath || selectedItem.file.name;
    if (!selectedItem.isZip) {
      items.push({
        blob: selectedItem.file,
        relativePath: sourcePath,
      });
      continue;
    }

    if (!window.JSZip) {
      throw new Error('Falta JSZip para abrir archivos ZIP en modo estatico.');
    }

    const zip = await window.JSZip.loadAsync(selectedItem.file);
    const entries = Object.values(zip.files);
    const zipFolder = String(sourcePath || selectedItem.file.name).replace(/\.zip$/i, '');

    for (const entry of entries) {
      if (entry.dir || !isImageFile(entry.name)) {
        continue;
      }
      items.push({
        blob: await entry.async('blob'),
        relativePath: `${zipFolder}/${entry.name}`,
      });
    }
  }
  return items;
}

async function processImagesClientSide(targetMode) {
  const target = STATIC_PROCESSING_PRESETS[targetMode] || STATIC_PROCESSING_PRESETS.sales;
  const normalizedImages = await collectImagesForProcessing();
  if (!normalizedImages.length) {
    throw new Error('No se encontraron imagenes validas en los archivos seleccionados.');
  }
  if (!window.JSZip) {
    throw new Error('Falta JSZip para empaquetar el ZIP final.');
  }

  const archive = new window.JSZip();
  for (let index = 0; index < normalizedImages.length; index += 1) {
    const image = normalizedImages[index];
    const progress = 8 + (index / normalizedImages.length) * 84;
    setButtonProgress(progress, `Procesando ${index + 1} de ${normalizedImages.length}...`);
    const outputBlob = await renderBlobToJpeg(image.blob, target);
    archive.file(normalizeOutputRelativePath(image.relativePath), outputBlob);
  }

  setButtonProgress(94, 'Empaquetando ZIP...');
  const zipBlob = await archive.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } },
    (metadata) => {
      const progress = 94 + Math.round((Number(metadata.percent || 0) / 100) * 6);
      setButtonProgress(progress, 'Empaquetando ZIP...');
    },
  );

  return {
    blob: zipBlob,
    totalImages: normalizedImages.length,
  };
}
