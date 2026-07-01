/* ═══════════════════════════════════════════════════════════
   NeuroPic — app.js
   Основной AI: NanoBanana через Pollinations (безлимитно)
   Резервный: Pollinations AI напрямую
   Дополнительно: Hugging Face (с ключом)
═══════════════════════════════════════════════════════════ */
'use strict';

// ── КОНСТАНТЫ ──────────────────────────────────────────────
const SK_HISTORY = 'neuropic_history';
const SK_KEYS    = 'neuropic_api_keys';
const SK_THEME   = 'neuropic_theme';
const SK_FAVS    = 'neuropic_favs';
const MAX_HIST   = 200;

const TIPS = [
  'Нейросеть рисует детали...',
  'Смешиваем цвета и свет...',
  'Генерируем текстуры...',
  'Добавляем глубину...',
  'Финальные штрихи...',
  'Почти готово!',
];

const NB_MODELS = [
  { id:'nb-flux',    name:'NanoBanana Flux',    desc:'Лучшее качество',   alias:'flux',         free:true },
  { id:'nb-realism', name:'NanoBanana Realism', desc:'Фотореализм',       alias:'flux-realism', free:true },
  { id:'nb-turbo',   name:'NanoBanana Turbo',   desc:'Быстрая генерация', alias:'turbo',        free:true },
];
const POL_MODELS = [
  { id:'flux',         name:'Flux',         desc:'Высокое качество', free:true },
  { id:'flux-realism', name:'Flux Realism', desc:'Фотореализм',      free:true },
  { id:'flux-anime',   name:'Flux Anime',   desc:'Аниме-стиль',      free:true },
  { id:'turbo',        name:'Turbo',        desc:'Быстро',           free:true },
];
const HF_MODELS = [
  { id:'stable-diffusion-xl', name:'Stable Diffusion XL', desc:'С ключом HF', free:false,
    endpoint:'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0' },
];

// ── СОСТОЯНИЕ ──────────────────────────────────────────────
const S = {
  generating:  false,
  style:       '',
  width:       1024,
  height:      1024,
  ratio:       '1:1',
  model:       'auto',
  count:       1,
  images:      [],   // текущие результаты
  history:     [],
  favs:        new Set(),
  apiKeys:     { hf:'' },
  theme:       'dark',
  lbIndex:     0,
  upload:      null, // { dataUrl, name, type }
  textWarnSeen:false,
};

// ── DOM ────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = s => document.querySelectorAll(s);

const D = {
  promptInput:    $('promptInput'),
  negPrompt:      $('negativePrompt'),
  seedInput:      $('seedInput'),
  charCounter:    $('charCounter'),
  modelSelect:    $('modelSelect'),
  modelStatusDot: document.querySelector('#modelStatus .status-dot'),
  modelStatusTxt: $('modelStatusText'),
  btnGenerate:    $('btnGenerate'),
  btnEnhance:     $('btnEnhance'),
  btnRandomSeed:  $('btnRandomSeed'),
  resultSection:  $('resultSection'),
  imagesGrid:     $('imagesGrid'),
  historyPanel:   $('historyPanel'),
  historyList:    $('historyList'),
  historyBadge:   $('historyBadge'),
  settingsPanel:  $('settingsPanel'),
  btnShowHistory: $('btnShowHistory'),
  btnShowSettings:$('btnShowSettings'),
  btnCloseHist:   $('btnCloseHistory'),
  btnCloseSet:    $('btnCloseSettings'),
  btnClearHist:   $('btnClearHistory'),
  hfKey:          $('hfKey'),
  btnSaveKeys:    $('btnSaveKeys'),
  modelsList:     $('modelsList'),
  themeToggle:    $('themeToggle'),
  themeIcon:      document.querySelector('.theme-icon'),
  overlay:        $('overlay'),
  toast:          $('toast'),
  toastIcon:      $('toastIcon'),
  toastText:      $('toastText'),
  genPopup:       $('genPopup'),
  genPopupModel:  $('genPopupModel'),
  genPopupTip:    $('genPopupTip'),
  lightbox:       $('lightbox'),
  lbImg:          $('lightboxImg'),
  lbPrompt:       $('lightboxPrompt'),
  lbClose:        $('lightboxClose'),
  lbPrev:         $('lightboxPrev'),
  lbNext:         $('lightboxNext'),
  lbDownload:     $('lightboxDownload'),
  lbShare:        $('lightboxShare'),
  lbRepeat:       $('lightboxRepeat'),
  uploadZone:     $('uploadZone'),
  imageUpload:    $('imageUpload'),
  uploadPH:       $('uploadPlaceholder'),
  uploadPreview:  $('uploadPreview'),
  uploadedImg:    $('uploadedImg'),
  uploadedName:   $('uploadedName'),
  btnPickFile:    $('btnPickFile'),
  btnRemoveImg:   $('btnRemoveImage'),
  uploadHintTxt:  $('uploadModeHintText'),
};

// ════════════════════════════════════════════════════════
//  ИНИЦИАЛИЗАЦИЯ
// ════════════════════════════════════════════════════════
function init() {
  loadStorage();
  renderModelsList();
  bindEvents();
  applyTheme(S.theme);
  renderHistory();
  updateModelStatus();
  updateUploadHint();
  checkSharedPrompt(); // поддержка ?prompt= в URL
}

function loadStorage() {
  try { const h = localStorage.getItem(SK_HISTORY); if (h) S.history = JSON.parse(h); } catch {}
  try { const k = localStorage.getItem(SK_KEYS);    if (k) { const p=JSON.parse(k); S.apiKeys={hf:p.hf||''}; D.hfKey.value=S.apiKeys.hf; } } catch {}
  try { const f = localStorage.getItem(SK_FAVS);    if (f) S.favs = new Set(JSON.parse(f)); } catch {}
  const t = localStorage.getItem(SK_THEME);
  if (t) S.theme = t;
}

function checkSharedPrompt() {
  const p = new URLSearchParams(location.search).get('prompt');
  if (p) {
    D.promptInput.value = decodeURIComponent(p);
    updateCharCounter();
    history.replaceState({}, '', location.pathname);
  }
}

function renderModelsList() {
  const all = [
    ...NB_MODELS.map(m=>({...m,provider:'NanoBanana'})),
    ...POL_MODELS.map(m=>({...m,provider:'Pollinations AI'})),
    ...HF_MODELS.map(m=>({...m,provider:'Hugging Face'})),
  ];
  D.modelsList.innerHTML = all.map(m=>`
    <div class="model-row">
      <div>
        <div class="model-row-name">${m.name}</div>
        <div class="model-row-desc">${m.desc}</div>
      </div>
      <span class="${m.free?'badge-free':'badge-key'}">${m.free?'БЕСПЛАТНО':'API KEY'}</span>
    </div>
  `).join('');
}

// ════════════════════════════════════════════════════════
//  СОБЫТИЯ
// ════════════════════════════════════════════════════════
function bindEvents() {
  D.btnGenerate.addEventListener('click', handleGenerate);
  D.promptInput.addEventListener('keydown', e => {
    if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
  });
  D.promptInput.addEventListener('input', updateCharCounter);

  $$('.suggestion-chip').forEach(b => b.addEventListener('click', () => {
    D.promptInput.value = b.dataset.prompt; updateCharCounter(); D.promptInput.focus();
  }));

  $$('.style-btn').forEach(b => b.addEventListener('click', () => {
    $$('.style-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); S.style = b.dataset.style;
  }));

  $$('.ratio-btn').forEach(b => b.addEventListener('click', () => {
    $$('.ratio-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    S.width=+b.dataset.w; S.height=+b.dataset.h; S.ratio=b.dataset.ratio;
  }));

  D.modelSelect.addEventListener('change', () => { S.model=D.modelSelect.value; updateModelStatus(); });

  $$('.count-btn').forEach(b => b.addEventListener('click', () => {
    $$('.count-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); S.count=+b.dataset.count;
  }));

  D.btnRandomSeed.addEventListener('click', () => { D.seedInput.value = Math.floor(Math.random()*999999999); });
  D.btnEnhance.addEventListener('click', handleEnhance);

  D.btnShowHistory.addEventListener('click', ()=>togglePanel('history'));
  D.btnCloseHist.addEventListener('click', closePanels);
  D.btnClearHist.addEventListener('click', clearHistory);
  D.btnShowSettings.addEventListener('click', ()=>togglePanel('settings'));
  D.btnCloseSet.addEventListener('click', closePanels);
  D.overlay.addEventListener('click', closePanels);

  D.btnSaveKeys.addEventListener('click', saveKeys);
  $$('.key-toggle-btn').forEach(b => b.addEventListener('click', () => {
    const t=$(b.dataset.target); t.type=t.type==='password'?'text':'password';
  }));

  D.themeToggle.addEventListener('click', toggleTheme);

  D.lbClose.addEventListener('click', closeLb);
  D.lbPrev.addEventListener('click', ()=>navLb(-1));
  D.lbNext.addEventListener('click', ()=>navLb(1));
  D.lbDownload.addEventListener('click', ()=>{ const i=S.images[S.lbIndex]; if(i) dlImage(i,i.prompt); });
  D.lbShare.addEventListener('click', shareCurrentLb);
  D.lbRepeat.addEventListener('click', ()=>{ const i=S.images[S.lbIndex]; if(i){D.promptInput.value=i.prompt;updateCharCounter();closeLb();handleGenerate();} });

  document.addEventListener('keydown', e => {
    if (e.key==='Escape') { if(D.lightbox.classList.contains('open')) closeLb(); else closePanels(); }
    if (e.key==='ArrowLeft')  navLb(-1);
    if (e.key==='ArrowRight') navLb(1);
  });

  // Upload
  D.btnPickFile.addEventListener('click', e => { e.stopPropagation(); D.imageUpload.click(); });
  D.imageUpload.addEventListener('change', e => { if(e.target.files[0]) handleUpload(e.target.files[0]); e.target.value=''; });
  D.btnRemoveImg.addEventListener('click', e => { e.stopPropagation(); removeUpload(); });
  D.uploadPH.addEventListener('click', () => { if(!S.upload) D.imageUpload.click(); });

  D.uploadZone.addEventListener('dragover', e => { e.preventDefault(); D.uploadZone.classList.add('drag-over'); });
  D.uploadZone.addEventListener('dragleave', e => { if(!D.uploadZone.contains(e.relatedTarget)) D.uploadZone.classList.remove('drag-over'); });
  D.uploadZone.addEventListener('drop', e => {
    e.preventDefault(); D.uploadZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) handleUpload(f);
    else toast('Загрузите изображение (PNG, JPG, WEBP)', 'warning');
  });
}

function updateCharCounter() {
  const n = D.promptInput.value.length;
  const max = +D.promptInput.getAttribute('maxlength') || 500;
  D.charCounter.textContent = `${n} / ${max}`;
  D.charCounter.classList.toggle('warn', n > max*0.88);
}

// ════════════════════════════════════════════════════════
//  ЗАГРУЗКА ИЗОБРАЖЕНИЯ
// ════════════════════════════════════════════════════════
function handleUpload(file) {
  if (file.size > 10*1024*1024) { toast('Файл слишком большой (макс. 10 МБ)', 'error'); return; }
  const r = new FileReader();
  r.onload = e => {
    S.upload = { dataUrl:e.target.result, name:file.name, type:file.type };
    D.uploadedImg.src = e.target.result;
    D.uploadedName.textContent = file.name;
    D.uploadPH.style.display = 'none';
    D.uploadPreview.classList.add('visible');
    updateUploadHint();
    toast('Изображение загружено ✦', 'success');
  };
  r.readAsDataURL(file);
}

function removeUpload() {
  S.upload = null;
  D.uploadedImg.src = '';
  D.uploadPH.style.display = '';
  D.uploadPreview.classList.remove('visible');
  toast('Изображение удалено', 'info');
}

function updateUploadHint() {
  if (!D.uploadHintTxt) return;
  D.uploadHintTxt.textContent = S.apiKeys.hf
    ? 'Будет использовано для img2img через Hugging Face'
    : 'Бесплатные модели не поддерживают img2img — добавьте Hugging Face ключ';
}

// ════════════════════════════════════════════════════════
//  ГЕНЕРАЦИЯ
// ════════════════════════════════════════════════════════
async function handleGenerate() {
  const prompt = D.promptInput.value.trim();
  if (!prompt) { toast('Введите описание изображения', 'warning'); D.promptInput.focus(); return; }
  if (S.generating) return;

  // Честное предупреждение: редактирование загруженного фото без HF ключа невозможно
  if (S.upload && !S.apiKeys.hf && isImageEditRequest(prompt)) {
    toast('Редактирование фото без Hugging Face ключа недоступно — добавьте ключ в настройках или опишите новое изображение', 'warning');
    return;
  }
  // Мягкое предупреждение: текст на изображениях
  if (!S.textWarnSeen && wantsReadableText(prompt)) {
    S.textWarnSeen = true;
    toast('ИИ часто не справляется с читаемым текстом — результат может отличаться', 'warning');
  }

  S.generating = true;
  setBtnState(true);
  showPopup(true);

  try {
    const results = await genImages(prompt, S.count);
    if (results.length > 0) {
      S.images = results;
      renderResults(results, prompt);
      saveHistory(results, prompt);
    } else {
      toast('Не удалось сгенерировать. Попробуйте ещё раз.', 'error');
    }
  } catch(e) {
    console.error(e);
    toast(e.message || 'Ошибка при генерации. Попробуйте ещё раз.', 'error');
  } finally {
    S.generating = false;
    setBtnState(false);
    showPopup(false);
  }
}

function isImageEditRequest(p) {
  const s = p.toLowerCase();
  const verbs = ['замени','заменить','исправь','исправить','убери','убрать','поменяй','измени'];
  const targets = ['на картинке','на изображении','на фото','на этом'];
  return verbs.some(v=>s.includes(v)) && targets.some(t=>s.includes(t));
}

function wantsReadableText(p) {
  const s = p.toLowerCase();
  return ['надпись','табличка','вывеска','плакат'].some(w=>s.includes(w)) && /["«:]/.test(p);
}

async function genImages(prompt, count) {
  const full = [prompt, S.style].filter(Boolean).join(', ');
  const neg  = D.negPrompt.value.trim();
  const seed = D.seedInput.value ? +D.seedInput.value : null;
  const mid  = S.model === 'auto' ? bestModel() : S.model;

  updatePopupModel(mid);

  const tasks = Array.from({length:count}, (_,i) => {
    const s = seed!==null ? seed+i : Math.floor(Math.random()*999999999);
    return genSingle(full, neg, mid, s);
  });

  const settled = await Promise.allSettled(tasks);
  return settled.filter(r=>r.status==='fulfilled'&&r.value).map(r=>r.value);
}

function bestModel() {
  if (S.apiKeys.hf) return 'stable-diffusion-xl';
  return 'nb-flux';
}

async function genSingle(prompt, neg, mid, seed) {
  if (mid==='stable-diffusion-xl' && S.apiKeys.hf) return genHF(prompt, neg, seed);
  const nb = NB_MODELS.find(m=>m.id===mid);
  if (nb) return genNB(prompt, neg, nb, seed);
  return genPol(prompt, neg, mid, seed);
}

// NanoBanana через Pollinations
async function genNB(prompt, neg, m, seed) {
  const params = new URLSearchParams({
    width:m.alias==='flux-realism'?String(S.width):String(S.width),
    height:String(S.height),
    model:m.alias,
    seed:String(seed),
    nologo:'true',
    enhance:'false', // отключено: переписывает промпт, может изменить смысл
    safe:'false',
  });
  if (neg) params.set('negative_prompt', neg);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`;
  return { url, prompt, model:m.id, provider:'NanoBanana', width:S.width, height:S.height, seed, timestamp:Date.now(), ratio:S.ratio };
}

// Pollinations напрямую (резервный)
async function genPol(prompt, neg, mid, seed) {
  const params = new URLSearchParams({ width:String(S.width), height:String(S.height), model:mid, seed:String(seed), nologo:'true', enhance:'false' });
  if (neg) params.set('negative_prompt', neg);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`;
  return { url, prompt, model:mid, provider:'Pollinations AI', width:S.width, height:S.height, seed, timestamp:Date.now(), ratio:S.ratio };
}

// Hugging Face text-to-image
async function genHF(prompt, neg, seed) {
  const ep = HF_MODELS[0].endpoint;
  if (S.upload) return genHFImg2Img(prompt, neg, seed);
  const resp = await fetch(ep, {
    method:'POST',
    headers:{ 'Authorization':`Bearer ${S.apiKeys.hf}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ inputs:prompt, parameters:{ negative_prompt:neg||undefined, width:S.width, height:S.height, num_inference_steps:30, guidance_scale:7.5, seed } }),
  });
  if (!resp.ok) {
    if (resp.status===503) { await sleep(18000); return genHF(prompt,neg,seed); }
    throw new Error(`Hugging Face: ошибка HTTP ${resp.status}`);
  }
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  return { url, prompt, model:'stable-diffusion-xl', provider:'Hugging Face', width:S.width, height:S.height, seed, timestamp:Date.now(), ratio:S.ratio, isBlob:true };
}

// Hugging Face img2img через instruct-pix2pix
async function genHFImg2Img(prompt, neg, seed) {
  const imgBlob = b64toBlob(S.upload.dataUrl.split(',')[1], S.upload.type||'image/png');
  const resp = await fetch('https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix', {
    method:'POST',
    headers:{ 'Authorization':`Bearer ${S.apiKeys.hf}`, 'Content-Type':imgBlob.type, 'X-Wait-For-Model':'true' },
    body:imgBlob,
  });
  if (!resp.ok) {
    if (resp.status===503) { await sleep(18000); return genHFImg2Img(prompt,neg,seed); }
    throw new Error(`img2img недоступен (HTTP ${resp.status}) — попробуйте без загруженного изображения`);
  }
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  return { url, prompt, model:'instruct-pix2pix', provider:'HF img2img', width:S.width, height:S.height, seed, timestamp:Date.now(), ratio:S.ratio, isBlob:true };
}

// Улучшение промпта
function handleEnhance() {
  const raw = D.promptInput.value.trim();
  if (!raw) { toast('Введите текст перед улучшением', 'warning'); return; }
  const mods = ['highly detailed','masterpiece','8K resolution','professional quality'];
  const toAdd = mods.filter(m=>!raw.toLowerCase().includes(m.toLowerCase()));
  if (toAdd.length) {
    D.promptInput.value = `${raw}, ${toAdd.slice(0,2).join(', ')}`;
    updateCharCounter();
    toast('Промпт улучшен ✦', 'success');
  } else {
    toast('Промпт уже оптимизирован', 'info');
  }
}

// ════════════════════════════════════════════════════════
//  РЕНДЕР РЕЗУЛЬТАТОВ
// ════════════════════════════════════════════════════════
function renderResults(images, prompt) {
  D.imagesGrid.innerHTML = '';
  D.imagesGrid.className = `images-grid count-${images.length}`;

  images.forEach((img, idx) => {
    const ratioClass = images.length===1 ? ratioToClass(img.ratio) : '';
    const wrap = document.createElement('div');
    wrap.className = `image-item ${ratioClass}`;

    wrap.innerHTML = `
      <div class="img-loader" data-loader="${idx}"><div class="img-spinner"></div></div>
      <img src="${img.url}" alt="${esc(prompt)}" data-img="${idx}" />
      <span class="img-model-badge">${esc(img.provider)}</span>
      <div class="image-overlay">
        <button class="img-action-btn" data-action="lb" data-idx="${idx}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
          Открыть
        </button>
        <button class="img-action-btn" data-action="dl" data-idx="${idx}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Скачать
        </button>
      </div>
    `;

    const imgEl  = wrap.querySelector('[data-img]');
    const loader = wrap.querySelector('[data-loader]');
    let retries = 0;

    imgEl.addEventListener('load', () => {
      imgEl.classList.add('loaded');
      loader.style.display = 'none';
    });
    imgEl.addEventListener('error', () => {
      if (retries < 2) {
        retries++;
        loader.innerHTML = '<div class="img-spinner"></div>';
        loader.style.display = 'flex';
        setTimeout(() => { imgEl.src = newSeedUrl(img.url); }, 900*retries);
      } else {
        loader.innerHTML = `
          <span class="img-err">Не удалось загрузить</span>
          <button class="img-retry-btn" data-retry>Повторить</button>`;
        loader.querySelector('[data-retry]').addEventListener('click', e => {
          e.stopPropagation(); retries=0;
          loader.innerHTML='<div class="img-spinner"></div>';
          imgEl.src = newSeedUrl(img.url);
        });
      }
    });
    if (imgEl.complete && imgEl.naturalWidth>0) { imgEl.classList.add('loaded'); loader.style.display='none'; }

    wrap.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) { openLb(idx); return; }
      e.stopPropagation();
      if (btn.dataset.action==='dl') dlImage(images[+btn.dataset.idx], prompt);
      else if (btn.dataset.action==='lb') openLb(+btn.dataset.idx);
    });

    D.imagesGrid.appendChild(wrap);
  });

  // Кнопки действий под результатом
  const old = D.resultSection.querySelector('.result-actions');
  if (old) old.remove();
  const acts = document.createElement('div');
  acts.className = 'result-actions';
  acts.innerHTML = `
    <button class="result-btn result-btn--primary" id="btnRegen">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
      Ещё раз
    </button>
    <button class="result-btn" id="btnDlAll">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      Скачать все
    </button>
    <button class="result-btn" id="btnSharePrompt">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
      Поделиться
    </button>
  `;
  acts.querySelector('#btnRegen').addEventListener('click', handleGenerate);
  acts.querySelector('#btnDlAll').addEventListener('click', () => {
    images.forEach((img,i)=>setTimeout(()=>dlImage(img,prompt,i), i*350));
  });
  acts.querySelector('#btnSharePrompt').addEventListener('click', () => sharePrompt(prompt));
  D.resultSection.appendChild(acts);
  D.resultSection.scrollIntoView({ behavior:'smooth', block:'start' });
}

function ratioToClass(r) { return ({' 16:9':'ratio-16-9','9:16':'ratio-9-16','4:3':'ratio-4-3'})[r]||''; }

function newSeedUrl(url) {
  try {
    const u = new URL(url);
    u.searchParams.set('seed', Math.floor(Math.random()*999999999));
    u.searchParams.set('_r', Date.now());
    return u.toString();
  } catch { return url+'&_r='+Date.now(); }
}

// ════════════════════════════════════════════════════════
//  ИСТОРИЯ
// ════════════════════════════════════════════════════════
function saveHistory(images, prompt) {
  const entry = {
    id: Date.now(), prompt,
    images: images.map(i=>({ url:i.url, model:i.model, provider:i.provider, width:i.width, height:i.height, ratio:i.ratio, seed:i.seed })),
    style: S.style, timestamp: Date.now(),
  };
  S.history.unshift(entry);
  if (S.history.length > MAX_HIST) S.history.length = MAX_HIST;
  try { localStorage.setItem(SK_HISTORY, JSON.stringify(S.history)); } catch {
    S.history.length = 50;
    try { localStorage.setItem(SK_HISTORY, JSON.stringify(S.history)); } catch {}
  }
  renderHistory();
}

function renderHistory() {
  // Обновляем бейдж
  if (S.history.length>0) {
    D.historyBadge.textContent = S.history.length > 99 ? '99+' : S.history.length;
    D.historyBadge.style.display = 'flex';
  } else {
    D.historyBadge.style.display = 'none';
  }

  if (!S.history.length) {
    D.historyList.innerHTML = `
      <div class="history-empty">
        <div class="history-empty-icon">🎨</div>
        <p>История пустая</p>
        <p>Создайте первое изображение!</p>
      </div>`;
    return;
  }

  D.historyList.innerHTML = S.history.map(e => {
    const first = e.images[0];
    const isFav = S.favs.has(e.id);
    return `
      <div class="history-item" data-eid="${e.id}">
        <img class="history-thumb" src="${first?.url||''}" alt="" loading="lazy" onerror="this.style.background='var(--border)'" />
        <div class="history-info">
          <div class="history-prompt">${esc(e.prompt)}</div>
          <div class="history-meta">
            <span class="history-model-pill">${esc(first?.provider||'—')}</span>
            <span>${fmtTime(e.timestamp)}</span>
            ${e.images.length>1 ? `<span>${e.images.length} шт.</span>` : ''}
          </div>
        </div>
        <div class="history-actions">
          <button class="history-action-btn fav${isFav?' active':''}" data-fav="${e.id}" title="Избранное">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="${isFav?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
          <button class="history-action-btn" data-copy="${esc(e.prompt)}" title="Копировать промпт">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="history-action-btn del" data-del="${e.id}" title="Удалить">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
          </button>
        </div>
      </div>`;
  }).join('');

  D.historyList.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', e => {
      const favBtn  = e.target.closest('[data-fav]');
      const delBtn  = e.target.closest('[data-del]');
      const copyBtn = e.target.closest('[data-copy]');
      if (favBtn)  { e.stopPropagation(); toggleFav(+favBtn.dataset.fav); return; }
      if (delBtn)  { e.stopPropagation(); delHistEntry(+delBtn.dataset.del); return; }
      if (copyBtn) { e.stopPropagation(); copyText(copyBtn.dataset.copy, 'Промпт скопирован'); return; }
      loadHistEntry(+item.dataset.eid);
    });
  });
}

function loadHistEntry(id) {
  const e = S.history.find(x=>x.id===id);
  if (!e) return;
  D.promptInput.value = e.prompt; updateCharCounter();
  if (e.style!==undefined) { $$('.style-btn').forEach(b=>b.classList.toggle('active',b.dataset.style===e.style)); S.style=e.style; }
  closePanels();
  if (e.images.length>0) {
    const imgs = e.images.map(i=>({...i,prompt:e.prompt,timestamp:e.timestamp}));
    S.images = imgs; renderResults(imgs, e.prompt);
  }
  toast('Загружено из истории', 'success');
}

function delHistEntry(id) {
  S.history = S.history.filter(e=>e.id!==id);
  try { localStorage.setItem(SK_HISTORY, JSON.stringify(S.history)); } catch {}
  renderHistory();
}

function clearHistory() {
  if (!S.history.length) { toast('История уже пустая', 'info'); return; }
  if (!confirm('Очистить всю историю? Это нельзя отменить.')) return;
  S.history = [];
  try { localStorage.removeItem(SK_HISTORY); } catch {}
  renderHistory(); toast('История очищена', 'success');
}

function toggleFav(id) {
  if (S.favs.has(id)) S.favs.delete(id); else S.favs.add(id);
  try { localStorage.setItem(SK_FAVS, JSON.stringify([...S.favs])); } catch {}
  renderHistory();
}

// ════════════════════════════════════════════════════════
//  ПОДЕЛИТЬСЯ
// ════════════════════════════════════════════════════════
function sharePrompt(prompt) {
  const url = `${location.origin}${location.pathname}?prompt=${encodeURIComponent(prompt)}`;
  copyText(url, 'Ссылка скопирована ✦');
}

function shareCurrentLb() {
  const img = S.images[S.lbIndex];
  if (img) sharePrompt(img.prompt);
}

// ════════════════════════════════════════════════════════
//  ЛАЙТБОКС
// ════════════════════════════════════════════════════════
function openLb(idx) {
  if (!S.images.length) return;
  S.lbIndex = Math.max(0,Math.min(idx,S.images.length-1));
  showLbImg(S.lbIndex);
  D.lightbox.classList.add('open');
  document.body.style.overflow='hidden';
  const multi = S.images.length>1;
  D.lbPrev.style.display = multi?'':'none';
  D.lbNext.style.display = multi?'':'none';
}
function showLbImg(idx) {
  const img = S.images[idx]; if(!img) return;
  D.lbImg.src = img.url; D.lbPrompt.textContent = img.prompt||'';
}
function closeLb() { D.lightbox.classList.remove('open'); document.body.style.overflow=''; }
function navLb(d) {
  if (!D.lightbox.classList.contains('open')) return;
  S.lbIndex = (S.lbIndex+d+S.images.length)%S.images.length;
  showLbImg(S.lbIndex);
}

// ════════════════════════════════════════════════════════
//  СКАЧИВАНИЕ
// ════════════════════════════════════════════════════════
async function dlImage(img, prompt, idx=0) {
  try {
    const r = await fetch(img.url);
    const b = await r.blob();
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href=u; a.download=`neuropic_${safeFilename(prompt)}_${idx+1}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(u);
    toast('Изображение сохранено', 'success');
  } catch { window.open(img.url,'_blank'); toast('Открыто в новой вкладке','info'); }
}

// ════════════════════════════════════════════════════════
//  ПОПАП ГЕНЕРАЦИИ
// ════════════════════════════════════════════════════════
let _tipTimer=null;
function showPopup(v) {
  D.genPopup.classList.toggle('visible',v);
  document.body.style.overflow = v?'hidden':'';
  if (v) {
    let i=0; D.genPopupTip.textContent=TIPS[0];
    if(_tipTimer) clearInterval(_tipTimer);
    _tipTimer = setInterval(()=>{ i=(i+1)%TIPS.length; D.genPopupTip.textContent=TIPS[i]; },2200);
  } else {
    if(_tipTimer){clearInterval(_tipTimer);_tipTimer=null;}
  }
}
function updatePopupModel(mid) {
  const m = [...NB_MODELS,...POL_MODELS,...HF_MODELS].find(x=>x.id===mid);
  D.genPopupModel.textContent = m?.name||mid;
}

// ════════════════════════════════════════════════════════
//  ПАНЕЛИ
// ════════════════════════════════════════════════════════
function togglePanel(name) {
  const map={history:D.historyPanel,settings:D.settingsPanel};
  const t=map[name]; const open=t.classList.contains('open');
  Object.values(map).forEach(p=>p.classList.remove('open'));
  D.overlay.classList.remove('active');
  if(!open){t.classList.add('open');D.overlay.classList.add('active');document.body.style.overflow='hidden';}
  else document.body.style.overflow='';
}
function closePanels() {
  D.historyPanel.classList.remove('open'); D.settingsPanel.classList.remove('open');
  D.overlay.classList.remove('active'); document.body.style.overflow='';
}

// ════════════════════════════════════════════════════════
//  НАСТРОЙКИ
// ════════════════════════════════════════════════════════
function saveKeys() {
  S.apiKeys.hf = D.hfKey.value.trim();
  try { localStorage.setItem(SK_KEYS, JSON.stringify(S.apiKeys)); toast('Ключи сохранены ✦','success'); updateModelStatus(); updateUploadHint(); }
  catch { toast('Ошибка сохранения','error'); }
}

function updateModelStatus() {
  const m=D.modelSelect.value, isHF=m==='stable-diffusion-xl';
  let txt='NanoBanana — готово', cls='status-ok';
  if(isHF && !S.apiKeys.hf){txt='Нужен Hugging Face ключ';cls='status-err';}
  else if(isHF){txt='SDXL — готово';}
  else if(m==='auto'){txt=S.apiKeys.hf?'SDXL (ваш ключ)':'NanoBanana Flux';}
  D.modelStatusDot.className=`status-dot ${cls}`;
  D.modelStatusTxt.textContent=txt;
}

// ════════════════════════════════════════════════════════
//  ТЕМА
// ════════════════════════════════════════════════════════
function toggleTheme() {
  S.theme=S.theme==='dark'?'light':'dark'; applyTheme(S.theme);
  try{localStorage.setItem(SK_THEME,S.theme);}catch{}
}
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme',t);
  D.themeIcon.textContent=t==='dark'?'☾':'☀';
  D.themeToggle.title=t==='dark'?'Светлая тема':'Тёмная тема';
}

// ════════════════════════════════════════════════════════
//  КНОПКА ГЕНЕРАЦИИ
// ════════════════════════════════════════════════════════
function setBtnState(gen) {
  D.btnGenerate.disabled=gen;
  D.btnGenerate.classList.toggle('generating',gen);
  D.btnGenerate.querySelector('.generate-btn-text').textContent=gen?'Генерирую...':'Создать изображение';
}

// ════════════════════════════════════════════════════════
//  TOAST
// ════════════════════════════════════════════════════════
let _toastT=null;
function toast(msg, type='success', dur=null) {
  const icons={success:'✓',error:'✕',warning:'⚠',info:'ℹ'};
  const colors={success:'var(--ok)',error:'var(--err)',warning:'var(--warn)',info:'var(--accent-2)'};
  D.toastIcon.textContent=icons[type]||'•';
  D.toastText.textContent=msg;
  D.toastIcon.style.color=colors[type]||'var(--text-2)';
  D.toast.classList.add('visible');
  if(_toastT)clearTimeout(_toastT);
  _toastT=setTimeout(()=>D.toast.classList.remove('visible'), dur||(type==='warning'?5000:3000));
}

// ════════════════════════════════════════════════════════
//  УТИЛИТЫ
// ════════════════════════════════════════════════════════
function esc(s) { if(!s)return''; return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function safeFilename(s) { if(!s)return'image'; return s.toLowerCase().replace(/[^a-zа-яё0-9\s]/gi,'').trim().replace(/\s+/g,'_').slice(0,40); }
function fmtTime(ts) {
  const d=new Date(ts), diffM=Math.floor((Date.now()-d)/60000);
  if(diffM<1)return'только что'; if(diffM<60)return`${diffM} мин. назад`;
  const diffH=Math.floor(diffM/60); if(diffH<24)return`${diffH} ч. назад`;
  return d.toLocaleDateString('ru-RU',{day:'numeric',month:'short'});
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function b64toBlob(b64,type){const bin=atob(b64),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr],{type});}
function copyText(text, successMsg='Скопировано') {
  navigator.clipboard?.writeText(text)
    .then(()=>toast(successMsg,'success'))
    .catch(()=>toast('Не удалось скопировать','error'));
}

// ── ЗАПУСК ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
