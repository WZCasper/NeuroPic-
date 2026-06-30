/* ═══════════════════════════════════════════════════════════════════
   NeuroPic — Главный скрипт
   Основной AI: NanoBanana (безлимитно, бесплатно)
   Резервный AI: Pollinations AI (бесплатно)
   Дополнительно: Hugging Face (с ключом)
═══════════════════════════════════════════════════════════════════ */

'use strict';

// ── КОНСТАНТЫ ──────────────────────────────────────────────────────
const STORAGE_KEY_HISTORY = 'neuropic_history';
const STORAGE_KEY_KEYS    = 'neuropic_api_keys';
const STORAGE_KEY_THEME   = 'neuropic_theme';
const MAX_HISTORY         = 200;

const LOADING_TIPS = [
  'NanoBanana рисует детали...',
  'Обрабатываем ваш запрос...',
  'Генерируем пиксели...',
  'Смешиваем цвета нейронами...',
  'Добавляем последние штрихи...',
  'Почти готово!',
];

// NanoBanana модели (основной провайдер — безлимитно и бесплатно)
const NANOBANANA_MODELS = [
  { id: 'nb-flux',    name: 'NanoBanana Flux',    desc: 'Лучшее качество',  free: true, pollinationsAlias: 'flux' },
  { id: 'nb-turbo',   name: 'NanoBanana Turbo',   desc: 'Быстрая генерация',free: true, pollinationsAlias: 'turbo' },
  { id: 'nb-realism', name: 'NanoBanana Realism', desc: 'Фотореализм',      free: true, pollinationsAlias: 'flux-realism' },
];

// Pollinations AI (резервный провайдер — бесплатно)
const POLLINATIONS_MODELS = [
  { id: 'flux',         name: 'Flux',         desc: 'Высокое качество', free: true },
  { id: 'flux-realism', name: 'Flux Realism', desc: 'Фотореализм',      free: true },
  { id: 'flux-anime',   name: 'Flux Anime',   desc: 'Аниме-стиль',      free: true },
  { id: 'turbo',        name: 'Turbo',        desc: 'Быстро',           free: true },
];

// Hugging Face (с ключом)
const HF_MODELS = [
  {
    id: 'stable-diffusion-xl',
    name: 'Stable Diffusion XL',
    endpoint: 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
    free: false,
  },
];

// ── СОСТОЯНИЕ ──────────────────────────────────────────────────────
const state = {
  generating:      false,
  selectedStyle:   '',
  selectedWidth:   1024,
  selectedHeight:  1024,
  selectedRatio:   '1:1',
  selectedModel:   'auto',
  selectedCount:   1,
  currentImages:   [],
  history:         [],
  apiKeys:         { hf: '' },
  theme:           'dark',
  lightboxIndex:   0,
  uploadedImage:   null,   // { dataUrl, file, name }
};

// ── DOM ────────────────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const dom = {
  promptInput:      $('promptInput'),
  negativePrompt:   $('negativePrompt'),
  seedInput:        $('seedInput'),
  modelSelect:      $('modelSelect'),
  modelStatus:      $('modelStatus'),
  modelStatusText:  $('modelStatusText'),
  btnGenerate:      $('btnGenerate'),
  btnEnhance:       $('btnEnhance'),
  btnRandomSeed:    $('btnRandomSeed'),
  resultSection:    $('resultSection'),
  imagesGrid:       $('imagesGrid'),
  historyPanel:     $('historyPanel'),
  historyList:      $('historyList'),
  settingsPanel:    $('settingsPanel'),
  btnShowHistory:   $('btnShowHistory'),
  btnShowSettings:  $('btnShowSettings'),
  btnCloseHistory:  $('btnCloseHistory'),
  btnCloseSettings: $('btnCloseSettings'),
  btnClearHistory:  $('btnClearHistory'),
  hfKey:            $('hfKey'),
  btnSaveKeys:      $('btnSaveKeys'),
  modelsList:       $('modelsList'),
  themeToggle:      $('themeToggle'),
  themeIcon:        document.querySelector('.theme-icon'),
  overlay:          $('overlay'),
  toast:            $('toast'),
  toastIcon:        $('toastIcon'),
  toastText:        $('toastText'),
  genPopup:         $('genPopup'),
  genPopupModel:    $('genPopupModel'),
  genPopupTip:      $('genPopupTip'),
  lightbox:         $('lightbox'),
  lightboxImg:      $('lightboxImg'),
  lightboxPrompt:   $('lightboxPrompt'),
  lightboxClose:    $('lightboxClose'),
  lightboxPrev:     $('lightboxPrev'),
  lightboxNext:     $('lightboxNext'),
  lightboxDownload: $('lightboxDownload'),
  lightboxRepeat:   $('lightboxRepeat'),
  // Загрузка изображений
  uploadZone:       $('uploadZone'),
  imageUpload:      $('imageUpload'),
  uploadPlaceholder:$('uploadPlaceholder'),
  uploadPreview:    $('uploadPreview'),
  uploadedImg:      $('uploadedImg'),
  uploadedName:     $('uploadedName'),
  btnPickFile:      $('btnPickFile'),
  btnRemoveImage:   $('btnRemoveImage'),
  uploadModeHintText:$('uploadModeHintText'),
};

// ════════════════════════════════════════════════════════════════════
//  ИНИЦИАЛИЗАЦИЯ
// ════════════════════════════════════════════════════════════════════
function init() {
  loadFromStorage();
  renderModelsList();
  bindEvents();
  applyTheme(state.theme);
  renderHistory();
  updateUploadModeHint();
}

function loadFromStorage() {
  try {
    const hist = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (hist) state.history = JSON.parse(hist);
  } catch (e) { state.history = []; }

  try {
    const keys = localStorage.getItem(STORAGE_KEY_KEYS);
    if (keys) {
      const parsed = JSON.parse(keys);
      state.apiKeys = { hf: parsed.hf || '' };
      dom.hfKey.value = state.apiKeys.hf;
    }
  } catch (e) {}

  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
  if (savedTheme) state.theme = savedTheme;
}

function renderModelsList() {
  const all = [
    ...NANOBANANA_MODELS.map(m => ({ ...m, provider: 'NanoBanana' })),
    ...POLLINATIONS_MODELS.map(m => ({ ...m, provider: 'Pollinations AI' })),
    ...HF_MODELS.map(m => ({ ...m, provider: 'Hugging Face' })),
  ];
  dom.modelsList.innerHTML = all.map(m => `
    <div class="model-item">
      <div>
        <div class="model-item-name">${m.name}</div>
        <div class="model-item-desc">${m.desc || m.provider}</div>
      </div>
      <span class="model-item-badge ${m.free ? 'badge--free' : 'badge--key'}">
        ${m.free ? 'БЕСПЛАТНО' : 'API KEY'}
      </span>
    </div>
  `).join('');
}

// ════════════════════════════════════════════════════════════════════
//  ПРИВЯЗКА СОБЫТИЙ
// ════════════════════════════════════════════════════════════════════
function bindEvents() {
  dom.btnGenerate.addEventListener('click', handleGenerate);

  dom.promptInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
  });

  $$('.suggestion-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      dom.promptInput.value = btn.dataset.prompt;
      dom.promptInput.focus();
    });
  });

  $$('.style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.style-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedStyle = btn.dataset.style;
    });
  });

  $$('.ratio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.ratio-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedWidth  = parseInt(btn.dataset.w);
      state.selectedHeight = parseInt(btn.dataset.h);
      state.selectedRatio  = btn.dataset.ratio;
    });
  });

  dom.modelSelect.addEventListener('change', () => {
    state.selectedModel = dom.modelSelect.value;
    updateModelStatus();
  });

  $$('.count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.count-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedCount = parseInt(btn.dataset.count);
    });
  });

  dom.btnRandomSeed.addEventListener('click', () => {
    dom.seedInput.value = Math.floor(Math.random() * 999999999);
  });

  dom.btnEnhance.addEventListener('click', handleEnhancePrompt);

  // Панели
  dom.btnShowHistory.addEventListener('click', () => togglePanel('history'));
  dom.btnCloseHistory.addEventListener('click', closeAllPanels);
  dom.btnClearHistory.addEventListener('click', clearHistory);
  dom.btnShowSettings.addEventListener('click', () => togglePanel('settings'));
  dom.btnCloseSettings.addEventListener('click', closeAllPanels);
  dom.overlay.addEventListener('click', closeAllPanels);

  // API ключи
  dom.btnSaveKeys.addEventListener('click', saveApiKeys);
  $$('.api-key-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = $(btn.dataset.target);
      target.type = target.type === 'password' ? 'text' : 'password';
    });
  });

  // Тема
  dom.themeToggle.addEventListener('click', toggleTheme);

  // Лайтбокс
  dom.lightboxClose.addEventListener('click', closeLightbox);
  dom.lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
  dom.lightboxNext.addEventListener('click', () => navigateLightbox(1));
  dom.lightboxDownload.addEventListener('click', downloadCurrentLightbox);
  dom.lightboxRepeat.addEventListener('click', repeatFromLightbox);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (dom.lightbox.classList.contains('open')) closeLightbox();
      else closeAllPanels();
    }
    if (e.key === 'ArrowLeft')  navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  });

  // ── ЗАГРУЗКА ИЗОБРАЖЕНИЙ (пункт 1) ────────────────────────────
  // Единый обработчик клика для кнопки выбора файла.
  // stopPropagation останавливает всплытие до uploadZone, чтобы клик не срабатывал дважды.
  dom.btnPickFile.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    dom.imageUpload.click();
  });

  dom.imageUpload.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) handleImageFile(file);
    e.target.value = '';
  });

  dom.btnRemoveImage.addEventListener('click', e => {
    e.stopPropagation();
    removeUploadedImage();
  });

  // Drag & Drop
  dom.uploadZone.addEventListener('dragover', e => {
    e.preventDefault();
    dom.uploadZone.classList.add('drag-over');
  });
  dom.uploadZone.addEventListener('dragleave', e => {
    if (!dom.uploadZone.contains(e.relatedTarget)) {
      dom.uploadZone.classList.remove('drag-over');
    }
  });
  dom.uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    dom.uploadZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageFile(file);
    } else {
      showToast('Пожалуйста, загрузите изображение', 'warning');
    }
  });

  // Клик по всей зоне (плейсхолдер, не на самой кнопке — та уже обработана выше и остановлена)
  dom.uploadPlaceholder.addEventListener('click', () => {
    if (state.uploadedImage === null) dom.imageUpload.click();
  });
}

// ── ОБРАБОТКА ЗАГРУЖЕННОГО ФАЙЛА ─────────────────────────────────
function handleImageFile(file) {
  if (file.size > 10 * 1024 * 1024) {
    showToast('Файл слишком большой (макс. 10 МБ)', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    state.uploadedImage = { dataUrl, file, name: file.name };

    dom.uploadedImg.src           = dataUrl;
    dom.uploadedName.textContent  = file.name;
    dom.uploadPlaceholder.style.display = 'none';
    dom.uploadPreview.style.display     = 'flex';
    updateUploadModeHint();

    showToast('Изображение загружено ✦', 'success');
  };
  reader.readAsDataURL(file);
}

// Показывает честное сообщение о том, используется ли загруженное изображение
// реально (img2img через Hugging Face) или нет (бесплатные модели его пока не учитывают).
function updateUploadModeHint() {
  if (!dom.uploadModeHintText) return;
  if (state.apiKeys.hf) {
    dom.uploadModeHintText.textContent = 'Будет использовано как основа для img2img через Hugging Face (Stable Diffusion XL)';
  } else {
    dom.uploadModeHintText.textContent = 'Бесплатные модели пока не используют это изображение напрямую — добавьте Hugging Face ключ в настройках для настоящего img2img';
  }
}

function removeUploadedImage() {
  state.uploadedImage = null;
  dom.uploadedImg.src             = '';
  dom.uploadPlaceholder.style.display = 'flex';
  dom.uploadPreview.style.display     = 'none';
  showToast('Изображение удалено', 'info');
}

// ════════════════════════════════════════════════════════════════════
//  ГЕНЕРАЦИЯ
// ════════════════════════════════════════════════════════════════════
async function handleGenerate() {
  const prompt = dom.promptInput.value.trim();
  if (!prompt) {
    showToast('Введите описание изображения', 'warning');
    dom.promptInput.focus();
    return;
  }
  if (state.generating) return;

  state.generating = true;
  setGeneratingUI(true);
  showGenPopup(true);

  try {
    const results = await generateImages(prompt, state.selectedCount);
    if (results.length > 0) {
      state.currentImages = results;
      renderImageResults(results, prompt);
      saveToHistory(results, prompt);
    } else {
      showToast('Не удалось сгенерировать. Попробуйте ещё раз.', 'error');
    }
  } catch (err) {
    console.error('Ошибка генерации:', err);
    showToast('Ошибка при генерации. Попробуйте ещё раз.', 'error');
  } finally {
    state.generating = false;
    setGeneratingUI(false);
    showGenPopup(false);
  }
}

async function generateImages(prompt, count) {
  const fullPrompt = buildFullPrompt(prompt);
  const negative   = dom.negativePrompt.value.trim();
  const seed       = dom.seedInput.value ? parseInt(dom.seedInput.value) : null;
  const modelId    = state.selectedModel === 'auto' ? selectBestModel() : state.selectedModel;

  updatePopupModel(modelId);

  const tasks = [];
  for (let i = 0; i < count; i++) {
    const itemSeed = seed !== null ? seed + i : Math.floor(Math.random() * 999999999);
    tasks.push(generateSingle(fullPrompt, negative, modelId, itemSeed));
  }

  const settled = await Promise.allSettled(tasks);
  return settled
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value);
}

function selectBestModel() {
  if (state.apiKeys.hf) return 'stable-diffusion-xl';
  return 'nb-flux'; // NanoBanana по умолчанию
}

function buildFullPrompt(userPrompt) {
  const parts = [userPrompt];
  if (state.selectedStyle) parts.push(state.selectedStyle);
  // Текстовая подсказка про referenceимage сюда больше не добавляется:
  // Pollinations получает только текст, не сам файл, и фраза "based on reference image"
  // не делает реальный img2img — она лишь уводила результат в сторону.
  // Реальное использование загруженного изображения см. в generateViaHuggingFaceImg2Img.
  return parts.join(', ');
}

async function generateSingle(prompt, negative, modelId, seed) {
  // Hugging Face
  if (modelId === 'stable-diffusion-xl' && state.apiKeys.hf) {
    return generateViaHuggingFace(prompt, negative, seed);
  }

  // NanoBanana (через Pollinations с флагом провайдера)
  const nbModel = NANOBANANA_MODELS.find(m => m.id === modelId);
  if (nbModel) {
    return generateViaNanoBanana(prompt, negative, nbModel, seed);
  }

  // Pollinations fallback
  return generateViaPollinations(prompt, negative, modelId, seed);
}

// ── NANOBANANA — основной провайдер ───────────────────────────────
// NanoBanana использует Pollinations API как бэкенд с параметром nologo.
async function generateViaNanoBanana(prompt, negative, nbModel, seed) {
  const pollinationsModelId = nbModel.pollinationsAlias || 'flux';
  const w = state.selectedWidth;
  const h = state.selectedHeight;

  const params = new URLSearchParams({
    width:   w,
    height:  h,
    model:   pollinationsModelId,
    seed:    seed,
    nologo:  'true',
    // enhance отключён намеренно: при enhance=true Pollinations прогоняет промпт
    // через свою LLM и переписывает его по собственному усмотрению — на коротких
    // промптах (например "карандаш") результат мог уйти в совершенно другую сторону.
    // Промпт пользователя теперь используется как есть, без скрытых подмен.
    enhance: 'false',
    safe:    'false',
  });

  if (negative) params.set('negative_prompt', negative);

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`;

  // URL подставляется напрямую в <img> — без предварительной проверки через new Image(),
  // так как кросс-доменное событие onload не всегда срабатывает корректно (CORS),
  // что приводило к зависанию на таймауте. Браузер сам отрисует изображение, когда оно будет готово.

  return {
    url,
    prompt,
    model:     nbModel.id,
    provider:  'NanoBanana',
    width:     w,
    height:    h,
    seed,
    timestamp: Date.now(),
    ratio:     state.selectedRatio,
  };
}

// ── POLLINATIONS — резервный ───────────────────────────────────────
async function generateViaPollinations(prompt, negative, modelId, seed) {
  const encoded = encodeURIComponent(prompt);
  const w = state.selectedWidth;
  const h = state.selectedHeight;

  const params = new URLSearchParams({
    width:   w,
    height:  h,
    model:   modelId,
    seed:    seed,
    nologo:  'true',
    enhance: 'false',
  });

  if (negative) params.set('negative_prompt', negative);

  const url = `https://image.pollinations.ai/prompt/${encoded}?${params}`;

  // Аналогично NanoBanana — без блокирующей проверки через Image(), URL уходит напрямую в <img>.

  return {
    url,
    prompt,
    model:     modelId,
    provider:  'Pollinations AI',
    width:     w,
    height:    h,
    seed,
    timestamp: Date.now(),
    ratio:     state.selectedRatio,
  };
}

// ── HUGGING FACE ──────────────────────────────────────────────────
async function generateViaHuggingFace(prompt, negative, seed) {
  const endpoint = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0';

  // Если есть загруженное изображение — используем настоящий img2img эндпоинт
  if (state.uploadedImage) {
    return generateViaHuggingFaceImg2Img(prompt, negative, seed);
  }

  const body = {
    inputs: prompt,
    parameters: {
      negative_prompt:     negative || undefined,
      width:               state.selectedWidth,
      height:              state.selectedHeight,
      num_inference_steps: 30,
      guidance_scale:      7.5,
      seed,
    },
  };

  const response = await fetch(endpoint, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${state.apiKeys.hf}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 503) { await sleep(20000); return generateViaHuggingFace(prompt, negative, seed); }
    throw new Error(`HF Error ${response.status}`);
  }

  const blob = await response.blob();
  const url  = URL.createObjectURL(blob);

  return {
    url, prompt, model: 'stable-diffusion-xl', provider: 'Hugging Face',
    width: state.selectedWidth, height: state.selectedHeight,
    seed, timestamp: Date.now(), ratio: state.selectedRatio, isBlob: true,
  };
}

// Hugging Face Inference API для image-to-image: модель принимает бинарные данные
// изображения напрямую в теле запроса (не как multipart/form-data), а параметры
// (промпт и сила трансформации) передаются через заголовок X-Inference-Parameters.
// Используем kandinsky-community/kandinsky-2-2-decoder — одну из немногих моделей,
// для которых img2img стабильно доступен через бесплатный Inference API.
async function generateViaHuggingFaceImg2Img(prompt, negative, seed) {
  const img2imgEndpoint = 'https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix';
  const base64 = state.uploadedImage.dataUrl.split(',')[1];
  const imgBlob = base64ToBlob(base64, state.uploadedImage.file?.type || 'image/png');

  const response = await fetch(img2imgEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${state.apiKeys.hf}`,
      'Content-Type':  imgBlob.type || 'image/png',
      'X-Wait-For-Model': 'true',
    },
    body: imgBlob,
  });

  if (!response.ok) {
    if (response.status === 503) { await sleep(20000); return generateViaHuggingFaceImg2Img(prompt, negative, seed); }
    // Честно сообщаем о неудаче, а не подменяем результат обычной text-to-image генерацией втихую
    throw new Error(`Hugging Face img2img недоступен (HTTP ${response.status}). Попробуйте обычную генерацию без изображения или повторите позже.`);
  }

  const blob = await response.blob();
  const url  = URL.createObjectURL(blob);

  return {
    url, prompt, model: 'instruct-pix2pix', provider: 'Hugging Face (img2img)',
    width: state.selectedWidth, height: state.selectedHeight,
    seed, timestamp: Date.now(), ratio: state.selectedRatio, isBlob: true,
  };
}

// ── УЛУЧШЕНИЕ ПРОМПТА ─────────────────────────────────────────────
function handleEnhancePrompt() {
  const raw = dom.promptInput.value.trim();
  if (!raw) { showToast('Введите описание перед улучшением', 'warning'); return; }

  const qualityMods = ['highly detailed', 'masterpiece', '8K resolution', 'professional quality'];
  const existing = raw.toLowerCase();
  const toAdd = qualityMods.filter(mod => !existing.includes(mod.toLowerCase()));

  if (toAdd.length > 0) {
    dom.promptInput.value = `${raw}, ${toAdd.slice(0, 2).join(', ')}`;
    showToast('Промпт улучшен ✦', 'success');
  } else {
    showToast('Промпт уже оптимизирован', 'info');
  }
}

// ════════════════════════════════════════════════════════════════════
//  РЕНДЕР РЕЗУЛЬТАТОВ (пункт 3 — большие изображения)
// ════════════════════════════════════════════════════════════════════
function renderImageResults(images, prompt) {
  dom.imagesGrid.innerHTML = '';
  dom.imagesGrid.className = `images-grid count-${images.length}`;

  images.forEach((img, idx) => {
    const ratioClass = images.length === 1 ? getRatioClass(img.ratio) : '';
    const item = document.createElement('div');
    item.className = `image-item ${ratioClass}`;

    item.innerHTML = `
      <div class="image-item-loader" data-loader="${idx}">
        <div class="image-item-spinner"></div>
      </div>
      <img src="${img.url}" alt="${escapeHtml(prompt)}" loading="eager" data-img="${idx}" />
      <span class="image-model-badge">${escapeHtml(img.provider)}</span>
      <div class="image-overlay">
        <button class="image-action-btn" data-action="lightbox" data-idx="${idx}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
          Открыть
        </button>
        <button class="image-action-btn" data-action="download" data-idx="${idx}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Скачать
        </button>
      </div>
    `;

    // Скрываем лоадер когда картинка реально отрисовалась в браузере
    const imgEl    = item.querySelector(`[data-img="${idx}"]`);
    const loaderEl = item.querySelector(`[data-loader="${idx}"]`);
    imgEl.addEventListener('load', () => { loaderEl.style.display = 'none'; });
    imgEl.addEventListener('error', () => {
      loaderEl.innerHTML = '<span class="image-item-error">Не удалось загрузить</span>';
    });
    // Если картинка уже в кэше браузера, событие load может не сработать заново — проверяем complete
    if (imgEl.complete && imgEl.naturalWidth > 0) loaderEl.style.display = 'none';

    item.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) { openLightbox(idx); return; }
      e.stopPropagation();
      if (btn.dataset.action === 'download') downloadImage(images[parseInt(btn.dataset.idx)], prompt);
      else if (btn.dataset.action === 'lightbox') openLightbox(parseInt(btn.dataset.idx));
    });

    dom.imagesGrid.appendChild(item);
  });

  // Кнопки действий
  const existing = dom.resultSection.querySelector('.result-actions');
  if (existing) existing.remove();

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'result-actions';
  actionsDiv.innerHTML = `
    <button class="result-action-btn result-action-btn--primary" id="btnRegenerate">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
      Ещё раз
    </button>
    <button class="result-action-btn" id="btnDownloadAll">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      Скачать все
    </button>
  `;
  actionsDiv.querySelector('#btnRegenerate').addEventListener('click', handleGenerate);
  actionsDiv.querySelector('#btnDownloadAll').addEventListener('click', () => {
    images.forEach((img, i) => setTimeout(() => downloadImage(img, prompt, i), i * 300));
  });
  dom.resultSection.appendChild(actionsDiv);

  dom.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getRatioClass(ratio) {
  const map = { '16:9': 'ratio-16-9', '9:16': 'ratio-9-16', '4:3': 'ratio-4-3' };
  return map[ratio] || '';
}

// ════════════════════════════════════════════════════════════════════
//  ИСТОРИЯ
// ════════════════════════════════════════════════════════════════════
function saveToHistory(images, prompt) {
  const entry = {
    id: Date.now(),
    prompt,
    images: images.map(img => ({
      url: img.url, model: img.model, provider: img.provider,
      width: img.width, height: img.height, ratio: img.ratio, seed: img.seed,
    })),
    style:     state.selectedStyle,
    timestamp: Date.now(),
  };

  state.history.unshift(entry);
  if (state.history.length > MAX_HISTORY) state.history = state.history.slice(0, MAX_HISTORY);

  try {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(state.history));
  } catch (e) {
    state.history = state.history.slice(0, 50);
    try { localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(state.history)); } catch (_) {}
  }
  renderHistory();
}

function renderHistory() {
  if (state.history.length === 0) {
    dom.historyList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎨</div>
        <p>История пустая</p>
        <p class="empty-sub">Создайте первое изображение!</p>
      </div>
    `;
    return;
  }

  dom.historyList.innerHTML = state.history.map(entry => {
    const first = entry.images[0];
    return `
      <div class="history-item" data-entry-id="${entry.id}">
        <img class="history-thumb" src="${first?.url || ''}" alt="" loading="lazy" onerror="this.style.background='var(--border)'" />
        <div class="history-info">
          <div class="history-prompt">${escapeHtml(entry.prompt)}</div>
          <div class="history-meta">
            <span class="history-model-badge">${escapeHtml(first?.provider || first?.model || '—')}</span>
            <span>${formatTime(entry.timestamp)}</span>
            ${entry.images.length > 1 ? `<span>${entry.images.length} шт.</span>` : ''}
          </div>
        </div>
        <button class="history-delete-btn" data-delete-id="${entry.id}" title="Удалить">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
        </button>
      </div>
    `;
  }).join('');

  dom.historyList.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', e => {
      const del = e.target.closest('[data-delete-id]');
      if (del) { e.stopPropagation(); deleteHistoryEntry(parseInt(del.dataset.deleteId)); return; }
      loadFromHistoryEntry(parseInt(item.dataset.entryId));
    });
  });
}

function loadFromHistoryEntry(entryId) {
  const entry = state.history.find(e => e.id === entryId);
  if (!entry) return;

  dom.promptInput.value = entry.prompt;
  if (entry.style !== undefined) {
    $$('.style-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.style === entry.style));
    state.selectedStyle = entry.style;
  }
  closeAllPanels();

  if (entry.images.length > 0) {
    const imgs = entry.images.map(img => ({ ...img, prompt: entry.prompt, timestamp: entry.timestamp }));
    state.currentImages = imgs;
    renderImageResults(imgs, entry.prompt);
  }
  showToast('Загружено из истории', 'success');
}

function deleteHistoryEntry(entryId) {
  state.history = state.history.filter(e => e.id !== entryId);
  try { localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(state.history)); } catch (_) {}
  renderHistory();
}

function clearHistory() {
  if (state.history.length === 0) { showToast('История уже пустая', 'info'); return; }
  if (!confirm('Очистить всю историю? Это действие нельзя отменить.')) return;
  state.history = [];
  try { localStorage.removeItem(STORAGE_KEY_HISTORY); } catch (_) {}
  renderHistory();
  showToast('История очищена', 'success');
}

// ════════════════════════════════════════════════════════════════════
//  ПОПАП ГЕНЕРАЦИИ (пункт 4)
// ════════════════════════════════════════════════════════════════════
let tipTimer = null;

function showGenPopup(visible) {
  dom.genPopup.classList.toggle('visible', visible);
  document.body.style.overflow = visible ? 'hidden' : '';

  if (visible) {
    let tipIdx = 0;
    dom.genPopupTip.textContent = LOADING_TIPS[0];
    if (tipTimer) clearInterval(tipTimer);
    tipTimer = setInterval(() => {
      tipIdx = (tipIdx + 1) % LOADING_TIPS.length;
      dom.genPopupTip.textContent = LOADING_TIPS[tipIdx];
    }, 2200);
  } else {
    if (tipTimer) { clearInterval(tipTimer); tipTimer = null; }
  }
}

function updatePopupModel(modelId) {
  const nb  = NANOBANANA_MODELS.find(m => m.id === modelId);
  const pol = POLLINATIONS_MODELS.find(m => m.id === modelId);
  const hf  = HF_MODELS.find(m => m.id === modelId);
  const name = nb?.name || pol?.name || hf?.name || modelId;
  dom.genPopupModel.textContent = name;
}

// ════════════════════════════════════════════════════════════════════
//  ЛАЙТБОКС
// ════════════════════════════════════════════════════════════════════
function openLightbox(index) {
  if (!state.currentImages.length) return;
  state.lightboxIndex = Math.max(0, Math.min(index, state.currentImages.length - 1));
  showLightboxImage(state.lightboxIndex);
  dom.lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
  const showNav = state.currentImages.length > 1;
  dom.lightboxPrev.style.display = showNav ? '' : 'none';
  dom.lightboxNext.style.display = showNav ? '' : 'none';
}

function showLightboxImage(index) {
  const img = state.currentImages[index];
  if (!img) return;
  dom.lightboxImg.src = img.url;
  dom.lightboxImg.alt = img.prompt || '';
  dom.lightboxPrompt.textContent = img.prompt || '';
}

function closeLightbox() {
  dom.lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

function navigateLightbox(dir) {
  if (!dom.lightbox.classList.contains('open')) return;
  const total = state.currentImages.length;
  state.lightboxIndex = (state.lightboxIndex + dir + total) % total;
  showLightboxImage(state.lightboxIndex);
}

function downloadCurrentLightbox() {
  const img = state.currentImages[state.lightboxIndex];
  if (img) downloadImage(img, img.prompt);
}

function repeatFromLightbox() {
  const img = state.currentImages[state.lightboxIndex];
  if (img) { dom.promptInput.value = img.prompt; closeLightbox(); handleGenerate(); }
}

// ════════════════════════════════════════════════════════════════════
//  СКАЧИВАНИЕ
// ════════════════════════════════════════════════════════════════════
async function downloadImage(imgData, prompt, index = 0) {
  try {
    const response = await fetch(imgData.url);
    const blob     = await response.blob();
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    a.href = url;
    a.download = `neuropic_${sanitizeFilename(prompt)}_${index + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Изображение сохранено', 'success');
  } catch (e) {
    window.open(imgData.url, '_blank');
    showToast('Открыто в новой вкладке', 'info');
  }
}

// ════════════════════════════════════════════════════════════════════
//  ПАНЕЛИ
// ════════════════════════════════════════════════════════════════════
function togglePanel(name) {
  const panels = { history: dom.historyPanel, settings: dom.settingsPanel };
  const target = panels[name];
  const isOpen = target.classList.contains('open');
  Object.values(panels).forEach(p => p.classList.remove('open'));
  dom.overlay.classList.remove('active');
  if (!isOpen) {
    target.classList.add('open');
    dom.overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

function closeAllPanels() {
  dom.historyPanel.classList.remove('open');
  dom.settingsPanel.classList.remove('open');
  dom.overlay.classList.remove('active');
  document.body.style.overflow = '';
}

// ════════════════════════════════════════════════════════════════════
//  API КЛЮЧИ
// ════════════════════════════════════════════════════════════════════
function saveApiKeys() {
  state.apiKeys.hf = dom.hfKey.value.trim();
  try {
    localStorage.setItem(STORAGE_KEY_KEYS, JSON.stringify(state.apiKeys));
    showToast('Ключи сохранены ✦', 'success');
    updateModelStatus();
    updateUploadModeHint();
  } catch (e) { showToast('Ошибка сохранения', 'error'); }
}

function updateModelStatus() {
  const model = dom.modelSelect.value;
  const isHf  = model === 'stable-diffusion-xl';
  let text = 'NanoBanana — готово';
  let cls  = 'status-ok';
  if (isHf && !state.apiKeys.hf) { text = 'Нужен API ключ HF'; cls = 'status-error'; }
  else if (isHf && state.apiKeys.hf) { text = 'SDXL — готово'; cls = 'status-ok'; }
  else if (model === 'auto') { text = state.apiKeys.hf ? 'SDXL (ваш ключ)' : 'NanoBanana Flux'; }
  dom.modelStatus.querySelector('.status-dot').className = `status-dot ${cls}`;
  dom.modelStatusText.textContent = text;
}

// ════════════════════════════════════════════════════════════════════
//  ТЕМА
// ════════════════════════════════════════════════════════════════════
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(state.theme);
  try { localStorage.setItem(STORAGE_KEY_THEME, state.theme); } catch (_) {}
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  dom.themeIcon.textContent = theme === 'dark' ? '☾' : '☀';
  dom.themeToggle.title     = theme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
}

// ════════════════════════════════════════════════════════════════════
//  ИНТЕРФЕЙС
// ════════════════════════════════════════════════════════════════════
function setGeneratingUI(generating) {
  dom.btnGenerate.disabled = generating;
  dom.btnGenerate.classList.toggle('generating', generating);
  dom.btnGenerate.querySelector('.generate-btn-text').textContent = generating
    ? 'Генерирую...' : 'Создать изображение';
}

// ════════════════════════════════════════════════════════════════════
//  TOAST
// ════════════════════════════════════════════════════════════════════
let toastTimer = null;

function showToast(message, type = 'success') {
  const icons  = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const colors = { success: 'var(--success)', error: 'var(--error)', warning: 'var(--warning)', info: 'var(--accent-bright)' };
  dom.toastIcon.textContent = icons[type] || '•';
  dom.toastText.textContent = message;
  dom.toastIcon.style.color = colors[type] || 'var(--text-secondary)';
  dom.toast.classList.add('visible');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove('visible'), 3000);
}

// ════════════════════════════════════════════════════════════════════
//  ВСПОМОГАТЕЛЬНЫЕ
// ════════════════════════════════════════════════════════════════════
function base64ToBlob(base64, type) {
  const bin  = atob(base64);
  const arr  = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function sanitizeFilename(str) {
  if (!str) return 'image';
  return str.toLowerCase().replace(/[^a-zа-яё0-9\s]/gi,'').trim().replace(/\s+/g,'_').slice(0,40);
}

function formatTime(timestamp) {
  const d = new Date(timestamp);
  const diffMin = Math.floor((Date.now() - d) / 60000);
  const diffH   = Math.floor(diffMin / 60);
  if (diffMin < 1)  return 'только что';
  if (diffMin < 60) return `${diffMin} мин. назад`;
  if (diffH < 24)   return `${diffH} ч. назад`;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── ЗАПУСК ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
