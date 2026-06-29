/* ═══════════════════════════════════════════════════════════════════
   NeuroPic — Главный скрипт приложения
   Поддерживаемые провайдеры:
     • Pollinations AI  — бесплатно, без ключей
     • Hugging Face     — бесплатный ключ (опционально)
═══════════════════════════════════════════════════════════════════ */

'use strict';

// ── КОНСТАНТЫ ──────────────────────────────────────────────────────
const STORAGE_KEY_HISTORY  = 'neuropic_history';
const STORAGE_KEY_KEYS     = 'neuropic_api_keys';
const STORAGE_KEY_THEME    = 'neuropic_theme';
const MAX_HISTORY          = 200;

const LOADING_TIPS = [
  'ИИ рисует детали...',
  'Обрабатываем ваш запрос...',
  'Генерируем пиксели...',
  'Смешиваем цвета...',
  'Добавляем последние штрихи...',
  'Почти готово!',
];

// Модели Pollinations AI (полностью бесплатны)
const POLLINATIONS_MODELS = [
  { id: 'flux',         name: 'Flux',          desc: 'Лучшее качество', free: true },
  { id: 'flux-realism', name: 'Flux Realism',  desc: 'Фотореализм',     free: true },
  { id: 'flux-anime',   name: 'Flux Anime',    desc: 'Аниме-стиль',     free: true },
  { id: 'flux-3d',      name: 'Flux 3D',       desc: '3D-рендер',       free: true },
  { id: 'turbo',        name: 'Turbo',         desc: 'Быстро',          free: true },
];

// Модели Hugging Face (нужен бесплатный ключ)
const HF_MODELS = [
  {
    id: 'stable-diffusion-xl',
    name: 'Stable Diffusion XL',
    endpoint: 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
    free: false,
  },
  {
    id: 'dreamshaper',
    name: 'DreamShaper',
    endpoint: 'https://api-inference.huggingface.co/models/Lykon/dreamshaper-8',
    free: false,
  },
];

// ── СОСТОЯНИЕ ──────────────────────────────────────────────────────
const state = {
  generating:     false,
  selectedStyle:  '',
  selectedWidth:  1024,
  selectedHeight: 1024,
  selectedRatio:  '1:1',
  selectedModel:  'auto',
  selectedCount:  1,
  currentImages:  [],  // [{url, prompt, model, timestamp, w, h}]
  history:        [],
  apiKeys:        { hf: '', replicate: '' },
  theme:          'dark',
  lightboxIndex:  0,
};

// ── DOM ССЫЛКИ ──────────────────────────────────────────────────────
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
  loadingState:     $('loadingState'),
  loadingBar:       $('loadingBar'),
  loadingModelName: $('loadingModelName'),
  loadingTip:       $('loadingTip'),
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
  replicateKey:     $('replicateKey'),
  btnSaveKeys:      $('btnSaveKeys'),
  modelsList:       $('modelsList'),
  themeToggle:      $('themeToggle'),
  themeIcon:        document.querySelector('.theme-icon'),
  overlay:          $('overlay'),
  toast:            $('toast'),
  toastIcon:        $('toastIcon'),
  toastText:        $('toastText'),
  lightbox:         $('lightbox'),
  lightboxImg:      $('lightboxImg'),
  lightboxPrompt:   $('lightboxPrompt'),
  lightboxClose:    $('lightboxClose'),
  lightboxPrev:     $('lightboxPrev'),
  lightboxNext:     $('lightboxNext'),
  lightboxDownload: $('lightboxDownload'),
  lightboxRepeat:   $('lightboxRepeat'),
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
}

// ── ЗАГРУЗКА ИЗ ХРАНИЛИЩА ─────────────────────────────────────────
function loadFromStorage() {
  try {
    const hist = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (hist) state.history = JSON.parse(hist);
  } catch (e) { state.history = []; }

  try {
    const keys = localStorage.getItem(STORAGE_KEY_KEYS);
    if (keys) {
      const parsed = JSON.parse(keys);
      state.apiKeys = { hf: parsed.hf || '', replicate: parsed.replicate || '' };
      dom.hfKey.value       = state.apiKeys.hf;
      dom.replicateKey.value = state.apiKeys.replicate;
    }
  } catch (e) {}

  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
  if (savedTheme) state.theme = savedTheme;
}

// ── РЕНДЕР СПИСКА МОДЕЛЕЙ В НАСТРОЙКАХ ────────────────────────────
function renderModelsList() {
  const all = [
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

  // Кнопка генерации
  dom.btnGenerate.addEventListener('click', handleGenerate);

  // Enter в промпте (Shift+Enter = новая строка)
  dom.promptInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  });

  // Чипы-подсказки
  $$('.suggestion-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      dom.promptInput.value = btn.dataset.prompt;
      dom.promptInput.focus();
    });
  });

  // Пикер стилей
  $$('.style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.style-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedStyle = btn.dataset.style;
    });
  });

  // Пикер соотношений
  $$('.ratio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.ratio-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedWidth  = parseInt(btn.dataset.w);
      state.selectedHeight = parseInt(btn.dataset.h);
      state.selectedRatio  = btn.dataset.ratio;
    });
  });

  // Выбор модели
  dom.modelSelect.addEventListener('change', () => {
    state.selectedModel = dom.modelSelect.value;
    updateModelStatus();
  });

  // Пикер количества
  $$('.count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.count-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedCount = parseInt(btn.dataset.count);
    });
  });

  // Случайный сид
  dom.btnRandomSeed.addEventListener('click', () => {
    dom.seedInput.value = Math.floor(Math.random() * 999999999);
  });

  // Улучшение промпта
  dom.btnEnhance.addEventListener('click', handleEnhancePrompt);

  // Панель истории
  dom.btnShowHistory.addEventListener('click', () => togglePanel('history'));
  dom.btnCloseHistory.addEventListener('click', () => closeAllPanels());
  dom.btnClearHistory.addEventListener('click', clearHistory);

  // Панель настроек
  dom.btnShowSettings.addEventListener('click', () => togglePanel('settings'));
  dom.btnCloseSettings.addEventListener('click', () => closeAllPanels());

  // Оверлей
  dom.overlay.addEventListener('click', closeAllPanels);

  // Сохранение ключей
  dom.btnSaveKeys.addEventListener('click', saveApiKeys);

  // Показ/скрытие ключей
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
  dom.lightboxPrev.addEventListener('click',  () => navigateLightbox(-1));
  dom.lightboxNext.addEventListener('click',  () => navigateLightbox(1));
  dom.lightboxDownload.addEventListener('click', downloadCurrentLightbox);
  dom.lightboxRepeat.addEventListener('click', repeatFromLightbox);

  // Закрыть лайтбокс по Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (dom.lightbox.classList.contains('open')) closeLightbox();
      else closeAllPanels();
    }
    if (e.key === 'ArrowLeft')  navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  });
}

// ════════════════════════════════════════════════════════════════════
//  ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЙ
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
  showLoading(true);

  try {
    const results = await generateImages(prompt, state.selectedCount);
    if (results.length > 0) {
      state.currentImages = results;
      renderImageResults(results, prompt);
      saveToHistory(results, prompt);
    }
  } catch (err) {
    console.error('Ошибка генерации:', err);
    showToast('Ошибка при генерации. Попробуйте ещё раз.', 'error');
  } finally {
    state.generating = false;
    setGeneratingUI(false);
    showLoading(false);
  }
}

// ── ОСНОВНАЯ ЛОГИКА ГЕНЕРАЦИИ ─────────────────────────────────────
async function generateImages(prompt, count) {
  const fullPrompt = buildFullPrompt(prompt);
  const negative   = dom.negativePrompt.value.trim();
  const seed       = dom.seedInput.value ? parseInt(dom.seedInput.value) : null;

  // Определяем модель
  const modelId = state.selectedModel === 'auto'
    ? selectBestModel()
    : state.selectedModel;

  updateLoadingModel(modelId);

  const tasks = [];
  for (let i = 0; i < count; i++) {
    const itemSeed = seed !== null ? seed + i : Math.floor(Math.random() * 999999999);
    tasks.push(generateSingle(fullPrompt, negative, modelId, itemSeed));
  }

  const settled = await Promise.allSettled(tasks);
  const results = [];

  settled.forEach((res, idx) => {
    if (res.status === 'fulfilled' && res.value) {
      results.push(res.value);
    } else {
      console.warn(`Изображение ${idx + 1} не удалось:`, res.reason);
    }
  });

  return results;
}

// ── ВЫБОР ЛУЧШЕЙ ДОСТУПНОЙ МОДЕЛИ ─────────────────────────────────
function selectBestModel() {
  // Если есть HF ключ — используем SDXL для максимального качества
  if (state.apiKeys.hf) return 'stable-diffusion-xl';
  // Иначе — Flux (лучшая бесплатная)
  return 'flux';
}

// ── ПОСТРОЕНИЕ ФИНАЛЬНОГО ПРОМПТА ─────────────────────────────────
function buildFullPrompt(userPrompt) {
  const parts = [userPrompt];
  if (state.selectedStyle) parts.push(state.selectedStyle);
  return parts.join(', ');
}

// ── ГЕНЕРАЦИЯ ОДНОГО ИЗОБРАЖЕНИЯ ──────────────────────────────────
async function generateSingle(prompt, negative, modelId, seed) {
  const hfModel = HF_MODELS.find(m => m.id === modelId);

  if (hfModel && state.apiKeys.hf) {
    return await generateViaHuggingFace(prompt, negative, hfModel, seed);
  }

  // Fallback к Pollinations для HF-моделей без ключа
  const pollinationsId = POLLINATIONS_MODELS.find(m => m.id === modelId)
    ? modelId
    : 'flux';

  return await generateViaPollinations(prompt, negative, pollinationsId, seed);
}

// ── POLLINATIONS AI (БЕСПЛАТНО) ───────────────────────────────────
async function generateViaPollinations(prompt, negative, modelId, seed) {
  const encodedPrompt = encodeURIComponent(prompt);
  const w = state.selectedWidth;
  const h = state.selectedHeight;

  const params = new URLSearchParams({
    width:    w,
    height:   h,
    model:    modelId,
    seed:     seed,
    nologo:   'true',
    enhance:  'false',
  });

  if (negative) params.set('negative_prompt', negative);

  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params}`;

  // Pollinations возвращает URL напрямую как изображение
  // Проверяем что URL работает
  const img = await loadImageFromUrl(url);

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
async function generateViaHuggingFace(prompt, negative, model, seed) {
  const body = {
    inputs: prompt,
    parameters: {
      negative_prompt:      negative || undefined,
      width:                state.selectedWidth,
      height:               state.selectedHeight,
      num_inference_steps:  30,
      guidance_scale:       7.5,
      seed,
    },
  };

  const response = await fetch(model.endpoint, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${state.apiKeys.hf}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    // Если модель загружается, ждём и повторяем
    if (response.status === 503) {
      await sleep(20000);
      return generateViaHuggingFace(prompt, negative, model, seed);
    }
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const url  = URL.createObjectURL(blob);

  return {
    url,
    prompt,
    model:     model.id,
    provider:  'Hugging Face',
    width:     state.selectedWidth,
    height:    state.selectedHeight,
    seed,
    timestamp: Date.now(),
    ratio:     state.selectedRatio,
    isBlob:    true,
  };
}

// ── ВСПОМОГАТЕЛЬНАЯ: ЗАГРУЗКА ИЗОБРАЖЕНИЯ ─────────────────────────
function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img   = new Image();
    const timer = setTimeout(() => reject(new Error('Timeout')), 90000);
    img.onload  = () => { clearTimeout(timer); resolve(url); };
    img.onerror = () => { clearTimeout(timer); reject(new Error('Не удалось загрузить')); };
    img.src     = url;
  });
}

// ── УЛУЧШЕНИЕ ПРОМПТА ─────────────────────────────────────────────
function handleEnhancePrompt() {
  const raw = dom.promptInput.value.trim();
  if (!raw) {
    showToast('Введите описание перед улучшением', 'warning');
    return;
  }

  // Добавляем качественные модификаторы если их нет
  const qualityMods = [
    'highly detailed',
    'masterpiece',
    '8K resolution',
    'professional quality',
  ];

  const existing = raw.toLowerCase();
  const toAdd = qualityMods.filter(mod => !existing.includes(mod.toLowerCase()));

  if (toAdd.length > 0) {
    dom.promptInput.value = `${raw}, ${toAdd.slice(0, 2).join(', ')}`;
    showToast('Промпт улучшен ✦', 'success');
  } else {
    showToast('Промпт уже содержит ключевые слова качества', 'info');
  }
}

// ════════════════════════════════════════════════════════════════════
//  РЕНДЕР РЕЗУЛЬТАТОВ
// ════════════════════════════════════════════════════════════════════
function renderImageResults(images, prompt) {
  dom.imagesGrid.innerHTML = '';
  dom.imagesGrid.className = `images-grid count-${images.length}`;

  images.forEach((img, idx) => {
    const ratioClass = getRatioClass(img.ratio);
    const item = document.createElement('div');
    item.className = `image-item ${ratioClass}`;
    item.innerHTML = `
      <img src="${img.url}" alt="${escapeHtml(prompt)}" loading="lazy" />
      <span class="image-model-badge">${img.provider}</span>
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

    item.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) {
        openLightbox(idx);
        return;
      }
      if (btn.dataset.action === 'download') {
        e.stopPropagation();
        downloadImage(images[parseInt(btn.dataset.idx)], prompt);
      } else if (btn.dataset.action === 'lightbox') {
        e.stopPropagation();
        openLightbox(parseInt(btn.dataset.idx));
      }
    });

    dom.imagesGrid.appendChild(item);
  });

  // Кнопки под изображениями
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'result-actions';
  actionsDiv.innerHTML = `
    <button class="result-action-btn result-action-btn--primary" id="btnRegenerateResults">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
      Ещё раз
    </button>
    <button class="result-action-btn" id="btnDownloadAllResults">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      Скачать все
    </button>
  `;

  actionsDiv.querySelector('#btnRegenerateResults').addEventListener('click', handleGenerate);
  actionsDiv.querySelector('#btnDownloadAllResults').addEventListener('click', () => {
    images.forEach((img, i) => {
      setTimeout(() => downloadImage(img, prompt, i), i * 300);
    });
  });

  // Очищаем старые кнопки если есть
  const existing = dom.resultSection.querySelector('.result-actions');
  if (existing) existing.remove();

  dom.resultSection.appendChild(actionsDiv);

  // Прокрутка к результату
  dom.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getRatioClass(ratio) {
  if (!ratio) return '';
  const map = { '16:9': 'ratio-16-9', '9:16': 'ratio-9-16', '4:3': 'ratio-4-3' };
  return map[ratio] || '';
}

// ════════════════════════════════════════════════════════════════════
//  ИСТОРИЯ
// ════════════════════════════════════════════════════════════════════
function saveToHistory(images, prompt) {
  const entry = {
    id:        Date.now(),
    prompt,
    images:    images.map(img => ({
      url:      img.url,
      model:    img.model,
      provider: img.provider,
      width:    img.width,
      height:   img.height,
      ratio:    img.ratio,
      seed:     img.seed,
      isBlob:   img.isBlob || false,
    })),
    style:     state.selectedStyle,
    timestamp: Date.now(),
  };

  state.history.unshift(entry);
  if (state.history.length > MAX_HISTORY) {
    state.history = state.history.slice(0, MAX_HISTORY);
  }

  try {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(state.history));
  } catch (e) {
    // localStorage может быть переполнен, удаляем старые записи
    state.history = state.history.slice(0, 50);
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(state.history));
    } catch (e2) {}
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
    const firstImg   = entry.images[0];
    const timeStr    = formatTime(entry.timestamp);
    const modelLabel = firstImg?.provider || firstImg?.model || 'Неизвестно';
    const thumbUrl   = firstImg?.url || '';

    return `
      <div class="history-item" data-entry-id="${entry.id}">
        <img
          class="history-thumb"
          src="${thumbUrl}"
          alt=""
          loading="lazy"
          onerror="this.style.background='var(--border)'"
        />
        <div class="history-info">
          <div class="history-prompt">${escapeHtml(entry.prompt)}</div>
          <div class="history-meta">
            <span class="history-model-badge">${escapeHtml(modelLabel)}</span>
            <span>${timeStr}</span>
            ${entry.images.length > 1 ? `<span>${entry.images.length} шт.</span>` : ''}
          </div>
        </div>
        <button class="history-delete-btn" data-delete-id="${entry.id}" title="Удалить">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><polyline points="10 11 10 17"/><polyline points="14 11 14 17"/></svg>
        </button>
      </div>
    `;
  }).join('');

  // Клик по записи истории
  dom.historyList.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', e => {
      const deleteBtn = e.target.closest('[data-delete-id]');
      if (deleteBtn) {
        e.stopPropagation();
        deleteHistoryEntry(parseInt(deleteBtn.dataset.deleteId));
        return;
      }
      const entryId = parseInt(item.dataset.entryId);
      loadFromHistoryEntry(entryId);
    });
  });
}

function loadFromHistoryEntry(entryId) {
  const entry = state.history.find(e => e.id === entryId);
  if (!entry) return;

  dom.promptInput.value = entry.prompt;

  // Восстанавливаем стиль
  if (entry.style !== undefined) {
    $$('.style-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.style === entry.style);
    });
    state.selectedStyle = entry.style;
  }

  closeAllPanels();

  // Показываем изображения
  if (entry.images.length > 0) {
    const imgs = entry.images.map(img => ({
      url:      img.url,
      prompt:   entry.prompt,
      model:    img.model,
      provider: img.provider || img.model,
      width:    img.width,
      height:   img.height,
      ratio:    img.ratio,
      seed:     img.seed,
      timestamp: entry.timestamp,
    }));

    state.currentImages = imgs;
    renderImageResults(imgs, entry.prompt);
  }

  showToast('Загружено из истории', 'success');
}

function deleteHistoryEntry(entryId) {
  state.history = state.history.filter(e => e.id !== entryId);
  try {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(state.history));
  } catch (e) {}
  renderHistory();
}

function clearHistory() {
  if (state.history.length === 0) {
    showToast('История уже пустая', 'info');
    return;
  }
  if (!confirm('Очистить всю историю? Это действие нельзя отменить.')) return;
  state.history = [];
  try { localStorage.removeItem(STORAGE_KEY_HISTORY); } catch (e) {}
  renderHistory();
  showToast('История очищена', 'success');
}

// ════════════════════════════════════════════════════════════════════
//  ЛАЙТБОКС
// ════════════════════════════════════════════════════════════════════
function openLightbox(index) {
  const images = state.currentImages;
  if (!images || images.length === 0) return;

  state.lightboxIndex = Math.max(0, Math.min(index, images.length - 1));
  showLightboxImage(state.lightboxIndex);
  dom.lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Навигация: скрываем если одно изображение
  const showNav = images.length > 1;
  dom.lightboxPrev.style.display = showNav ? '' : 'none';
  dom.lightboxNext.style.display = showNav ? '' : 'none';
}

function showLightboxImage(index) {
  const img = state.currentImages[index];
  if (!img) return;
  dom.lightboxImg.src        = img.url;
  dom.lightboxImg.alt        = img.prompt || '';
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
  if (img) {
    dom.promptInput.value = img.prompt;
    closeLightbox();
    handleGenerate();
  }
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
    const filename = `neuropic_${sanitizeFilename(prompt)}_${index + 1}.png`;

    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Изображение сохранено', 'success');
  } catch (e) {
    // Fallback: открыть в новой вкладке
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

  // Закрыть все
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
//  НАСТРОЙКИ / API КЛЮЧИ
// ════════════════════════════════════════════════════════════════════
function saveApiKeys() {
  state.apiKeys.hf        = dom.hfKey.value.trim();
  state.apiKeys.replicate = dom.replicateKey.value.trim();

  try {
    localStorage.setItem(STORAGE_KEY_KEYS, JSON.stringify(state.apiKeys));
    showToast('Ключи сохранены ✦', 'success');
    updateModelStatus();
  } catch (e) {
    showToast('Ошибка сохранения', 'error');
  }
}

function updateModelStatus() {
  const model    = dom.modelSelect.value;
  const isHfModel = HF_MODELS.some(m => m.id === model);

  let text  = 'Готово';
  let cls   = 'status-ok';

  if (isHfModel && !state.apiKeys.hf) {
    text = 'Нужен API ключ';
    cls  = 'status-error';
    // Автоматически переключаемся на Pollinations
    if (state.selectedModel !== 'auto') {
      text = 'Используем Flux (нет ключа)';
      cls  = 'status-busy';
    }
  } else if (model === 'auto') {
    text = state.apiKeys.hf ? 'SDXL (ваш ключ)' : 'Flux (бесплатно)';
  }

  dom.modelStatus.querySelector('.status-dot').className = `status-dot ${cls}`;
  dom.modelStatusText.textContent = text;
}

// ════════════════════════════════════════════════════════════════════
//  ТЕМА
// ════════════════════════════════════════════════════════════════════
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(state.theme);
  try { localStorage.setItem(STORAGE_KEY_THEME, state.theme); } catch (e) {}
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  dom.themeIcon.textContent = theme === 'dark' ? '☾' : '☀';
  dom.themeToggle.title     = theme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
}

// ════════════════════════════════════════════════════════════════════
//  ИНТЕРФЕЙС ЗАГРУЗКИ
// ════════════════════════════════════════════════════════════════════
function showLoading(visible) {
  dom.loadingState.style.display = visible ? 'flex' : 'none';
  if (!visible) return;

  // Ротация подсказок
  let tipIndex = 0;
  dom.loadingTip.textContent = LOADING_TIPS[0];

  if (showLoading._tipTimer) clearInterval(showLoading._tipTimer);
  showLoading._tipTimer = setInterval(() => {
    tipIndex = (tipIndex + 1) % LOADING_TIPS.length;
    dom.loadingTip.textContent = LOADING_TIPS[tipIndex];
  }, 2500);

  if (!visible) clearInterval(showLoading._tipTimer);
}

function updateLoadingModel(modelId) {
  const pol = POLLINATIONS_MODELS.find(m => m.id === modelId);
  const hf  = HF_MODELS.find(m => m.id === modelId);
  const name = pol?.name || hf?.name || modelId;
  dom.loadingModelName.textContent = `Генерирует: ${name}`;
}

function setGeneratingUI(generating) {
  dom.btnGenerate.disabled = generating;
  dom.btnGenerate.classList.toggle('generating', generating);
  dom.btnGenerate.querySelector('.generate-btn-text').textContent = generating
    ? 'Генерирую...'
    : 'Создать изображение';

  if (!generating && showLoading._tipTimer) {
    clearInterval(showLoading._tipTimer);
  }
}

// ════════════════════════════════════════════════════════════════════
//  TOAST
// ════════════════════════════════════════════════════════════════════
let toastTimer = null;

function showToast(message, type = 'success') {
  const icons  = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const colors = { success: 'var(--success)', error: 'var(--error)', warning: 'var(--warning)', info: 'var(--accent-bright)' };

  dom.toastIcon.textContent  = icons[type]  || '•';
  dom.toastText.textContent  = message;
  dom.toastIcon.style.color  = colors[type] || 'var(--text-secondary)';
  dom.toast.classList.add('visible');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove('visible'), 3000);
}

// ════════════════════════════════════════════════════════════════════
//  ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ════════════════════════════════════════════════════════════════════
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeFilename(str) {
  if (!str) return 'image';
  return str
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s]/gi, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 40);
}

function formatTime(timestamp) {
  const d   = new Date(timestamp);
  const now = new Date();
  const diffMs  = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMs / 3600000);

  if (diffMin < 1)   return 'только что';
  if (diffMin < 60)  return `${diffMin} мин. назад`;
  if (diffH < 24)    return `${diffH} ч. назад`;

  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── ЗАПУСК ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
