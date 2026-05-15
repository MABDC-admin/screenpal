const canvas = document.getElementById('drawCanvas');
const toolbar = document.getElementById('toolbar');
const collapsedTool = document.getElementById('collapsedTool');
const inputModeButton = document.getElementById('inputMode');
const colorInput = document.getElementById('color');
const strokeSizeInput = document.getElementById('strokeSize');
const undoButton = document.getElementById('undo');
const deleteObjectButton = document.getElementById('deleteObject');
const clearButton = document.getElementById('clear');
const stopButton = document.getElementById('stop');
const closeButton = document.getElementById('close');
const toolbarCloseButton = document.getElementById('toolbarClose');
const emojiToggle = document.getElementById('emojiToggle');
const emojiPanel = document.getElementById('emojiPanel');
const emojiSearch = document.getElementById('emojiSearch');
const emojiPanelClose = document.getElementById('emojiPanelClose');
const emojiCategories = document.getElementById('emojiCategories');
const animatedEmojiRow = document.getElementById('animatedEmojiRow');
const emojiGrid = document.getElementById('emojiGrid');
const supplementToggle = document.getElementById('supplementToggle');
const supplementPanel = document.getElementById('supplementPanel');
const youtubeTool = document.getElementById('youtubeTool');
const textEditor = document.getElementById('textEditor');
const textEditorTitle = document.getElementById('textEditorTitle');
const textEditorInput = document.getElementById('textEditorInput');
const textEditorInsert = document.getElementById('textEditorInsert');
const textEditorCancel = document.getElementById('textEditorCancel');
const youtubePlayer = document.getElementById('youtubePlayer');
const youtubeHeader = document.getElementById('youtubeHeader');
const youtubeUrl = document.getElementById('youtubeUrl');
const youtubeLoad = document.getElementById('youtubeLoad');
const youtubeFrame = document.getElementById('youtubeFrame');
const youtubeClose = document.getElementById('youtubeClose');
const youtubeFullscreen = document.getElementById('youtubeFullscreen');
const youtubeResize = document.getElementById('youtubeResize');
const standaloneMode = new URLSearchParams(window.location.search).get('standalone') === '1';

const ctx = canvas.getContext('2d');
const objects = [];
const toolbarPositionKey = 'screenStudioAnnotationToolbarPosition';
const toolbarEdgeThreshold = 84;
const emojiGroups = {
  Smileys: '😀 😃 😄 😁 😆 😅 😂 🤣 🥲 ☺️ 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🫣 🤗 🫡 🤔 🫢 🤭 🤫 🤥 😶 😶‍🌫️ 😐 😑 😬 🫨 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😮‍💨 😵 😵‍💫 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠'.split(' '),
  People: '👋 🤚 🖐️ ✋ 🖖 🫱 🫲 🫳 🫴 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 🫵 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦿 🦵 🦶 👂 🦻 👃 🧠 🫀 🫁 🦷 🦴 👀 👁️ 👅 👄 🫦 👶 🧒 👦 👧 🧑 👱 👨 🧔 👩 🧓 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷'.split(' '),
  Animals: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐽 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🐣 🐥 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪱 🐛 🦋 🐌 🐞 🐜 🪰 🪲 🪳 🦟 🦗 🕷️ 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦞 🦀 🪼 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🦭 🐊 🐅 🐆 🦓 🦍 🦧 🦣 🐘 🦛 🦏 🐪 🐫 🦒 🦘 🦬 🐃 🐂 🐄'.split(' '),
  Food: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🫛 🥬 🥒 🌶️ 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🫚 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🦴 🌭 🍔 🍟 🍕 🫓 🥪 🥙 🧆 🌮 🌯 🫔 🥗 🥘 🫕 🥫 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🦪 🍤 🍙 🍚 🍘 🍥 🥠 🥮 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮'.split(' '),
  Travel: '🌍 🌎 🌏 🌐 🗺️ 🗾 🧭 🏔️ ⛰️ 🌋 🗻 🏕️ 🏖️ 🏜️ 🏝️ 🏞️ 🏟️ 🏛️ 🏗️ 🧱 🪨 🪵 🛖 🏘️ 🏚️ 🏠 🏡 🏢 🏣 🏤 🏥 🏦 🏨 🏩 🏪 🏫 🏬 🏭 🏯 🏰 💒 🗼 🗽 ⛪ 🕌 🛕 🕍 ⛩️ 🕋 ⛲ ⛺ 🌁 🌃 🏙️ 🌄 🌅 🌆 🌇 🌉 ♨️ 🎠 🛝 🎡 🎢 💈 🎪 🚂 🚆 🚇 🚊 🚉 ✈️ 🛫 🛬 🚀 🛸 🚁 🛶 ⛵ 🚤 🛳️'.split(' '),
  Activities: '⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🪂 🏋️ 🤼 🤸 ⛹️ 🤺 🤾 🏌️ 🏇 🧘 🏄 🏊 🤽 🚣 🧗 🚵 🚴 🏆 🥇 🥈 🥉 🏅 🎖️ 🏵️ 🎗️ 🎫 🎟️ 🎪 🤹 🎭 🩰 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🪘 🎷 🎺 🪗 🎸 🪕 🎻 🪈'.split(' '),
  Objects: '⌚ 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 🖲️ 🕹️ 🗜️ 💽 💾 💿 📀 📼 📷 📸 📹 🎥 📽️ 🎞️ 📞 ☎️ 📟 📠 📺 📻 🎙️ 🎚️ 🎛️ 🧭 ⏱️ ⏲️ ⏰ 🕰️ ⌛ ⏳ 📡 🔋 🪫 🔌 💡 🔦 🕯️ 🪔 🧯 🛢️ 💸 💵 💴 💶 💷 🪙 💰 💳 💎 ⚖️ 🪜 🧰 🪛 🔧 🔨 ⚒️ 🛠️ ⛏️ 🪚 🔩 ⚙️ 🧱 ⛓️ 🧲 🔫 💣 🧨 🪓 🔪 🗡️ 🛡️ 🚬 ⚰️ 🪦 ⚱️ 🏺 🔮 📿 🧿 🪬'.split(' '),
  Symbols: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 ❤️‍🔥 ❤️‍🩹 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ 🔯 🕎 ☯️ ☦️ 🛐 ⛎ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ 🆔 ⚛️ 🉑 ☢️ ☣️ 📴 📳 🈶 🈚 🈸 🈺 🈷️ ✴️ 🆚 💮 🉐 ㊙️ ㊗️ 🈴 🈵 🈹 🈲 🅰️ 🅱️ 🆎 🆑 🅾️ 🆘 ❌ ⭕ 🛑 ⛔ 📛 🚫 💯 💢 ♨️ 🚷 🚯 🚳 🚱 🔞'.split(' '),
  Flags: '🏁 🚩 🎌 🏴 🏳️ 🏳️‍🌈 🏳️‍⚧️ 🏴‍☠️ 🇦🇪 🇵🇭 🇺🇸 🇬🇧 🇨🇦 🇦🇺 🇳🇿 🇯🇵 🇰🇷 🇨🇳 🇮🇳 🇸🇬 🇲🇾 🇮🇩 🇹🇭 🇻🇳 🇭🇰 🇹🇼 🇸🇦 🇶🇦 🇰🇼 🇴🇲 🇧🇭 🇪🇬 🇿🇦 🇫🇷 🇩🇪 🇮🇹 🇪🇸 🇵🇹 🇳🇱 🇧🇪 🇨🇭 🇦🇹 🇸🇪 🇳🇴 🇩🇰 🇫🇮 🇵🇱 🇨🇿 🇬🇷 🇹🇷 🇧🇷 🇲🇽 🇦🇷 🇨🇱 🇨🇴 🇵🇪'.split(' ')
};
const animatedEmojiPresets = [
  { emoji: '😂', label: 'laugh bounce', animation: 'bounce' },
  { emoji: '😍', label: 'love pulse', animation: 'pulse' },
  { emoji: '🔥', label: 'fire flicker', animation: 'flicker' },
  { emoji: '⭐', label: 'star spin', animation: 'spin' },
  { emoji: '🎉', label: 'party pop', animation: 'bounce' },
  { emoji: '🚀', label: 'rocket float', animation: 'float' },
  { emoji: '💡', label: 'idea pulse', animation: 'pulse' },
  { emoji: '✅', label: 'check bounce', animation: 'bounce' },
  { emoji: '⚠️', label: 'warning pulse', animation: 'pulse' },
  { emoji: '❤️', label: 'heart beat', animation: 'pulse' },
  { emoji: '👋', label: 'wave spin', animation: 'swing' },
  { emoji: '👏', label: 'clap bounce', animation: 'bounce' }
];
let activeTool = 'pen';
let activeObject = null;
let drawing = false;
let dpr = 1;
let inputEnabled = true;
let toolbarCollapsed = false;
let toolbarDrag = null;
let moveTarget = null;
let moveLastPoint = null;
let resizeTarget = null;
let resizeStart = null;
let animationFrame = null;
let activeEmoji = null;
let activeEmojiAnimated = false;
let activeEmojiAnimation = 'bounce';
let emojiCategory = 'Smileys';
let pendingText = null;
let youtubeMove = null;
let youtubeSize = null;

function setToolbarCollapsed(collapsed) {
  toolbarCollapsed = Boolean(collapsed);
  document.body.classList.toggle('toolbar-collapsed', toolbarCollapsed);
}

function scheduleAutoHide() {
  setToolbarCollapsed(false);
}

function wakeToolbar() {
  setToolbarCollapsed(false);
  scheduleAutoHide();
}

function clampToolbarPosition(left, top) {
  const rect = toolbar.getBoundingClientRect();
  const margin = 8;
  return {
    left: Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin)),
    top: Math.max(margin, Math.min(top, window.innerHeight - rect.height - margin))
  };
}

function toolbarEdgeForPosition(left) {
  const rect = toolbar.getBoundingClientRect();
  if (left <= toolbarEdgeThreshold) return 'left';
  if (left + rect.width >= window.innerWidth - toolbarEdgeThreshold) return 'right';
  return null;
}

function setToolbarOrientation(edge) {
  toolbar.dataset.edge = edge || '';
  toolbar.classList.toggle('toolbar-vertical', Boolean(edge));
}

function applyToolbarPosition(left, top, save = true) {
  toolbar.classList.add('toolbar-dragged');
  const edge = toolbarEdgeForPosition(left);
  setToolbarOrientation(edge);
  if (edge === 'right') {
    const rect = toolbar.getBoundingClientRect();
    left = window.innerWidth - rect.width - 8;
  }
  const position = clampToolbarPosition(left, top);
  toolbar.classList.add('toolbar-dragged');
  toolbar.style.left = `${position.left}px`;
  toolbar.style.top = `${position.top}px`;
  toolbar.style.right = 'auto';
  toolbar.style.bottom = 'auto';
  toolbar.style.transform = 'none';
  if (save) localStorage.setItem(toolbarPositionKey, JSON.stringify(position));
  if (!supplementPanel.classList.contains('hidden')) positionSupplementPanel();
  if (!emojiPanel.classList.contains('hidden')) positionEmojiPanel();
}

function restoreToolbarPosition() {
  try {
    const saved = JSON.parse(localStorage.getItem(toolbarPositionKey) || 'null');
    if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
      requestAnimationFrame(() => applyToolbarPosition(saved.left, saved.top, false));
    }
  } catch {
    localStorage.removeItem(toolbarPositionKey);
  }
}

function shouldDragToolbar(target) {
  return target === toolbar || Boolean(target.closest('.annotation-brand'));
}

function clampFloatingRect(left, top, width, height) {
  const margin = 8;
  return {
    left: Math.max(margin, Math.min(left, window.innerWidth - width - margin)),
    top: Math.max(margin, Math.min(top, window.innerHeight - height - margin)),
    width: Math.max(320, Math.min(width, window.innerWidth - margin * 2)),
    height: Math.max(240, Math.min(height, window.innerHeight - margin * 2))
  };
}

function positionTextEditor(point, type) {
  pendingText = { point, type };
  textEditorTitle.textContent = type === 'formula' ? 'Math formula' : 'Text label';
  textEditorInput.placeholder = type === 'formula' ? 'Example: x^2 + y^2 = r^2' : 'Type label text';
  textEditorInput.value = '';
  textEditor.classList.remove('hidden');
  const rect = textEditor.getBoundingClientRect();
  const left = Math.min(point.x + 12, window.innerWidth - rect.width - 12);
  const top = Math.min(point.y + 12, window.innerHeight - rect.height - 12);
  textEditor.style.left = `${Math.max(12, left)}px`;
  textEditor.style.top = `${Math.max(12, top)}px`;
  textEditorInput.focus();
}

function closeTextEditor() {
  pendingText = null;
  textEditor.classList.add('hidden');
}

function insertPendingText() {
  if (!pendingText) return;
  const text = textEditorInput.value.trim();
  if (text) {
    objects.push({
      type: pendingText.type,
      start: pendingText.point,
      text,
      ...currentStyle()
    });
    redraw();
  }
  closeTextEditor();
  scheduleAutoHide();
}

function toggleSupplementPanel(force) {
  const visible = force ?? supplementPanel.classList.contains('hidden');
  supplementPanel.classList.toggle('hidden', !visible);
  supplementToggle.classList.toggle('active', visible);
  if (visible) positionSupplementPanel();
  wakeToolbar();
}

function positionSupplementPanel() {
  const toolbarRect = toolbar.getBoundingClientRect();
  const panelRect = supplementPanel.getBoundingClientRect();
  const verticalEdge = toolbar.classList.contains('toolbar-vertical') ? toolbar.dataset.edge : '';
  const preferredLeft = verticalEdge === 'left'
    ? toolbarRect.right + 8
    : verticalEdge === 'right'
      ? toolbarRect.left - panelRect.width - 8
      : toolbarRect.left;
  const left = Math.max(8, Math.min(preferredLeft, window.innerWidth - panelRect.width - 8));
  const preferredTop = verticalEdge ? toolbarRect.top : toolbarRect.top - panelRect.height - 8;
  const top = verticalEdge
    ? Math.max(8, Math.min(preferredTop, window.innerHeight - panelRect.height - 8))
    : preferredTop >= 8 ? preferredTop : Math.min(toolbarRect.bottom + 8, window.innerHeight - panelRect.height - 8);
  supplementPanel.style.left = `${left}px`;
  supplementPanel.style.top = `${Math.max(8, top)}px`;
  supplementPanel.style.bottom = 'auto';
  supplementPanel.style.transform = 'none';
}

function positionEmojiPanel() {
  const toolbarRect = toolbar.getBoundingClientRect();
  const panelRect = emojiPanel.getBoundingClientRect();
  const verticalEdge = toolbar.classList.contains('toolbar-vertical') ? toolbar.dataset.edge : '';
  const preferredLeft = verticalEdge === 'left'
    ? toolbarRect.right + 8
    : verticalEdge === 'right'
      ? toolbarRect.left - panelRect.width - 8
      : toolbarRect.left;
  const left = Math.max(8, Math.min(preferredLeft, window.innerWidth - panelRect.width - 8));
  const preferredTop = verticalEdge ? toolbarRect.top : toolbarRect.top - panelRect.height - 8;
  const top = verticalEdge
    ? Math.max(8, Math.min(preferredTop, window.innerHeight - panelRect.height - 8))
    : preferredTop >= 8 ? preferredTop : Math.min(toolbarRect.bottom + 8, window.innerHeight - panelRect.height - 8);
  emojiPanel.style.left = `${left}px`;
  emojiPanel.style.top = `${Math.max(8, top)}px`;
  emojiPanel.style.bottom = 'auto';
  emojiPanel.style.transform = 'none';
}

function toggleEmojiPanel(force) {
  const visible = force ?? emojiPanel.classList.contains('hidden');
  emojiPanel.classList.toggle('hidden', !visible);
  emojiToggle.classList.toggle('active', visible);
  if (visible) {
    renderEmojiGrid();
    requestAnimationFrame(positionEmojiPanel);
    emojiSearch.focus();
  }
  wakeToolbar();
}

function selectEmoji(emoji, animated = false, animation = 'bounce') {
  activeEmoji = emoji;
  activeEmojiAnimated = animated;
  activeEmojiAnimation = animation;
  activeTool = 'emoji';
  moveTarget = null;
  moveLastPoint = null;
  resizeTarget = null;
  resizeStart = null;
  document.body.classList.remove('move-mode', 'moving-object', 'resizing-object');
  document.querySelectorAll('.tool, .supplement-tool').forEach((button) => {
    button.classList.toggle('active', false);
  });
  emojiToggle.classList.add('active');
  canvas.style.cursor = 'copy';
  wakeToolbar();
}

function renderEmojiCategories() {
  emojiCategories.innerHTML = '';
  Object.keys(emojiGroups).forEach((category) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = category;
    button.classList.toggle('active', category === emojiCategory);
    button.addEventListener('click', () => {
      emojiCategory = category;
      renderEmojiCategories();
      renderEmojiGrid();
    });
    emojiCategories.appendChild(button);
  });
}

function renderAnimatedEmojiRow() {
  animatedEmojiRow.innerHTML = '';
  animatedEmojiPresets.forEach((preset) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = preset.emoji;
    button.title = `Animated ${preset.label}`;
    button.addEventListener('click', () => selectEmoji(preset.emoji, true, preset.animation));
    animatedEmojiRow.appendChild(button);
  });
}

function renderEmojiGrid() {
  const query = emojiSearch.value.trim().toLowerCase();
  const source = query
    ? Object.entries(emojiGroups).flatMap(([category, emojis]) => emojis.map((emoji) => ({ category, emoji })))
    : emojiGroups[emojiCategory].map((emoji) => ({ category: emojiCategory, emoji }));
  emojiGrid.innerHTML = '';
  source
    .filter((entry) => !query || entry.category.toLowerCase().includes(query) || entry.emoji.includes(query))
    .forEach((entry) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = entry.emoji;
      button.title = `${entry.category} emoji`;
      button.addEventListener('click', () => selectEmoji(entry.emoji, false, 'bounce'));
      emojiGrid.appendChild(button);
    });
}

function extractYouTubeId(value) {
  const input = value.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (url.hostname.includes('youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || '';
    if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2] || '';
    if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2] || '';
    return url.searchParams.get('v') || '';
  } catch {
    return '';
  }
}

function openYouTubePlayer() {
  youtubePlayer.classList.remove('hidden');
  youtubeUrl.focus();
  wakeToolbar();
}

function loadYouTubeVideo() {
  const videoId = extractYouTubeId(youtubeUrl.value);
  if (!videoId) {
    youtubeUrl.focus();
    return;
  }
  youtubeFrame.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&modestbranding=1&origin=https%3A%2F%2Fwww.youtube.com`;
}

function closeYouTubePlayer() {
  youtubeMove = null;
  youtubeSize = null;
  youtubeFrame.src = 'about:blank';
  youtubePlayer.classList.add('hidden');
  youtubePlayer.classList.remove('fullscreen');
  youtubeFullscreen.textContent = 'Full';
  wakeToolbar();
}

function applyYouTubeBounds(left, top, width, height) {
  const bounds = clampFloatingRect(left, top, width, height);
  youtubePlayer.style.left = `${bounds.left}px`;
  youtubePlayer.style.top = `${bounds.top}px`;
  youtubePlayer.style.width = `${bounds.width}px`;
  youtubePlayer.style.height = `${bounds.height}px`;
}

function clearObjects() {
  objects.length = 0;
  activeObject = null;
  moveTarget = null;
  moveLastPoint = null;
  resizeTarget = null;
  resizeStart = null;
  closeTextEditor();
  redraw();
  wakeToolbar();
}

function deleteSelectedObject() {
  if (!moveTarget) return false;
  const index = objects.indexOf(moveTarget);
  if (index < 0) return false;
  objects.splice(index, 1);
  moveTarget = null;
  moveLastPoint = null;
  resizeTarget = null;
  resizeStart = null;
  drawing = false;
  redraw();
  wakeToolbar();
  return true;
}

function undoObject() {
  objects.pop();
  redraw();
  wakeToolbar();
}

function applyInputMode(enabled) {
  inputEnabled = Boolean(enabled);
  document.body.classList.toggle('navigation-mode', !inputEnabled);
  inputModeButton.classList.toggle('active', inputEnabled);
  inputModeButton.textContent = inputEnabled ? 'Annotate On' : 'Navigate Off';
  canvas.style.pointerEvents = inputEnabled ? 'auto' : 'none';
  if (inputEnabled) wakeToolbar();
  else setToolbarCollapsed(true);
}

async function setInputMode(enabled) {
  applyInputMode(enabled);
  await window.screenStudioAnnotation.setInputMode(inputEnabled);
}

function resizeCanvas() {
  dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  redraw();
  if (toolbar.classList.contains('toolbar-dragged')) {
    const rect = toolbar.getBoundingClientRect();
    applyToolbarPosition(rect.left, rect.top, true);
  }
  if (!supplementPanel.classList.contains('hidden')) positionSupplementPanel();
  if (!emojiPanel.classList.contains('hidden')) positionEmojiPanel();
  if (!youtubePlayer.classList.contains('hidden') && !youtubePlayer.classList.contains('fullscreen')) {
    const rect = youtubePlayer.getBoundingClientRect();
    applyYouTubeBounds(rect.left, rect.top, rect.width, rect.height);
  }
}

function pointFromEvent(event) {
  return { x: event.clientX, y: event.clientY };
}

function boundsFromPoints(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys)
  };
}

function objectBounds(item) {
  if (item.type === 'pen') {
    return boundsFromPoints(item.points);
  }
  if (item.type === 'arrow' || item.type === 'rect' || item.type === 'ellipse' || item.type === 'blur') {
    const x = Math.min(item.start.x, item.end.x);
    const y = Math.min(item.start.y, item.end.y);
    return {
      x,
      y,
      width: Math.abs(item.end.x - item.start.x),
      height: Math.abs(item.end.y - item.start.y)
    };
  }
  if (item.type === 'spotlight') {
    const radius = Math.max(22, Math.hypot(item.end.x - item.start.x, item.end.y - item.start.y));
    return {
      x: item.start.x - radius,
      y: item.start.y - radius,
      width: radius * 2,
      height: radius * 2
    };
  }
  if (item.type === 'text' || item.type === 'formula') {
    ctx.save();
    ctx.font = item.type === 'formula'
      ? `italic ${Math.max(22, item.width * 5)}px "Cambria Math", Cambria, Georgia, serif`
      : `${Math.max(20, item.width * 5)}px Segoe UI`;
    const metrics = ctx.measureText(item.text);
    const height = Math.max(24, item.width * 6);
    ctx.restore();
    return {
      x: item.start.x,
      y: item.start.y - height,
      width: Math.max(32, metrics.width),
      height
    };
  }
  if (item.type === 'emoji') {
    const size = item.fontSize || Math.max(34, item.width * 8);
    return {
      x: item.start.x,
      y: item.start.y - size,
      width: size,
      height: size
    };
  }
  return { x: 0, y: 0, width: 0, height: 0 };
}

function pointInBounds(point, bounds, padding = 14) {
  return point.x >= bounds.x - padding &&
    point.x <= bounds.x + bounds.width + padding &&
    point.y >= bounds.y - padding &&
    point.y <= bounds.y + bounds.height + padding;
}

function hitTestObject(point) {
  for (let index = objects.length - 1; index >= 0; index--) {
    if (pointInBounds(point, objectBounds(objects[index]))) return objects[index];
  }
  return null;
}

function movePoint(point, dx, dy) {
  point.x += dx;
  point.y += dy;
}

function moveObject(item, dx, dy) {
  if (item.type === 'pen') {
    item.points.forEach((point) => movePoint(point, dx, dy));
  } else if (item.start && item.end) {
    movePoint(item.start, dx, dy);
    movePoint(item.end, dx, dy);
  } else if (item.start) {
    movePoint(item.start, dx, dy);
  }
}

function cloneObject(item) {
  return JSON.parse(JSON.stringify(item));
}

function restoreObject(target, source) {
  Object.keys(target).forEach((key) => delete target[key]);
  Object.assign(target, cloneObject(source));
}

function resizeHandleBounds(bounds) {
  return {
    x: bounds.x + bounds.width + 4,
    y: bounds.y + bounds.height + 4,
    width: 16,
    height: 16
  };
}

function pointInResizeHandle(point, item) {
  if (!item) return false;
  return pointInBounds(point, resizeHandleBounds(objectBounds(item)), 0);
}

function transformPointFromBounds(point, from, to) {
  const sourceWidth = Math.max(1, from.width);
  const sourceHeight = Math.max(1, from.height);
  return {
    x: to.x + ((point.x - from.x) / sourceWidth) * to.width,
    y: to.y + ((point.y - from.y) / sourceHeight) * to.height
  };
}

function resizeObject(item, fromBounds, toBounds) {
  if (item.type === 'pen') {
    item.points = item.points.map((point) => transformPointFromBounds(point, fromBounds, toBounds));
  } else if (item.start && item.end) {
    item.start = transformPointFromBounds(item.start, fromBounds, toBounds);
    item.end = transformPointFromBounds(item.end, fromBounds, toBounds);
  } else if (item.start) {
    item.start = { x: toBounds.x, y: toBounds.y + toBounds.height };
  }

  if (item.type === 'text' || item.type === 'formula') {
    const ratio = Math.max(toBounds.width / Math.max(1, fromBounds.width), toBounds.height / Math.max(1, fromBounds.height));
    item.width = Math.max(2, Math.min(40, item.width * ratio));
  } else if (item.type === 'emoji') {
    const ratio = Math.max(toBounds.width / Math.max(1, fromBounds.width), toBounds.height / Math.max(1, fromBounds.height));
    item.fontSize = Math.max(18, Math.min(260, item.fontSize * ratio));
    item.start = { x: toBounds.x, y: toBounds.y + item.fontSize };
  }
}

function drawArrow(from, to, color, width) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const headLength = Math.max(14, width * 4);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - headLength * Math.cos(angle - Math.PI / 6), to.y - headLength * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - headLength * Math.cos(angle + Math.PI / 6), to.y - headLength * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

function drawObject(item) {
  ctx.save();
  ctx.strokeStyle = item.color;
  ctx.fillStyle = item.color;
  ctx.lineWidth = item.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (item.type === 'pen') {
    ctx.beginPath();
    item.points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  } else if (item.type === 'arrow') {
    drawArrow(item.start, item.end, item.color, item.width);
  } else if (item.type === 'rect') {
    const x = Math.min(item.start.x, item.end.x);
    const y = Math.min(item.start.y, item.end.y);
    const width = Math.abs(item.end.x - item.start.x);
    const height = Math.abs(item.end.y - item.start.y);
    ctx.strokeRect(x, y, width, height);
  } else if (item.type === 'ellipse') {
    const x = (item.start.x + item.end.x) / 2;
    const y = (item.start.y + item.end.y) / 2;
    const radiusX = Math.max(2, Math.abs(item.end.x - item.start.x) / 2);
    const radiusY = Math.max(2, Math.abs(item.end.y - item.start.y) / 2);
    ctx.beginPath();
    ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (item.type === 'spotlight') {
    const radius = Math.max(22, Math.hypot(item.end.x - item.start.x, item.end.y - item.start.y));
    ctx.beginPath();
    ctx.arc(item.start.x, item.start.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `${item.color}33`;
    ctx.fill();
    ctx.strokeStyle = item.color;
    ctx.stroke();
  } else if (item.type === 'blur') {
    const x = Math.min(item.start.x, item.end.x);
    const y = Math.min(item.start.y, item.end.y);
    const width = Math.abs(item.end.x - item.start.x);
    const height = Math.abs(item.end.y - item.start.y);
    const cell = Math.max(10, item.width * 2);
    ctx.fillStyle = 'rgba(12, 18, 28, 0.72)';
    ctx.fillRect(x, y, width, height);
    for (let yy = y; yy < y + height; yy += cell) {
      for (let xx = x; xx < x + width; xx += cell) {
        ctx.fillStyle = ((Math.floor(xx / cell) + Math.floor(yy / cell)) % 2 === 0)
          ? 'rgba(255, 255, 255, 0.13)'
          : 'rgba(98, 221, 234, 0.14)';
        ctx.fillRect(xx, yy, Math.min(cell, x + width - xx), Math.min(cell, y + height - yy));
      }
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  } else if (item.type === 'text') {
    ctx.font = `${Math.max(20, item.width * 5)}px Segoe UI`;
    ctx.lineWidth = Math.max(3, item.width);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.strokeText(item.text, item.start.x, item.start.y);
    ctx.fillStyle = item.color;
    ctx.fillText(item.text, item.start.x, item.start.y);
  } else if (item.type === 'formula') {
    ctx.font = `italic ${Math.max(22, item.width * 5)}px "Cambria Math", Cambria, Georgia, serif`;
    ctx.lineWidth = Math.max(3, item.width);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.strokeText(item.text, item.start.x, item.start.y);
    ctx.fillStyle = item.color;
    ctx.fillText(item.text, item.start.x, item.start.y);
  } else if (item.type === 'emoji') {
    const time = performance.now() / 1000;
    const size = item.fontSize || Math.max(34, item.width * 8);
    const cx = item.start.x + size / 2;
    const cy = item.start.y - size / 2;
    let scale = 1;
    let rotate = 0;
    let dy = 0;
    if (item.animated) {
      if (item.animation === 'pulse') scale = 1 + Math.sin(time * 5) * 0.12;
      else if (item.animation === 'bounce') dy = Math.sin(time * 6) * 7;
      else if (item.animation === 'spin') rotate = time * 1.8;
      else if (item.animation === 'float') dy = Math.sin(time * 2.2) * 10;
      else if (item.animation === 'flicker') scale = 0.96 + Math.random() * 0.12;
      else if (item.animation === 'swing') rotate = Math.sin(time * 5) * 0.32;
    }
    ctx.translate(cx, cy + dy);
    ctx.rotate(rotate);
    ctx.scale(scale, scale);
    ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.emoji, 0, 0);
  }
  ctx.restore();
}

function redraw() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  objects.forEach(drawObject);
  if (activeObject) drawObject(activeObject);
  if (moveTarget) {
    const bounds = objectBounds(moveTarget);
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = 'rgba(98, 221, 234, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bounds.x - 6, bounds.y - 6, bounds.width + 12, bounds.height + 12);
    const handle = resizeHandleBounds(bounds);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(98, 221, 234, 0.96)';
    ctx.strokeStyle = 'rgba(5, 15, 22, 0.92)';
    ctx.fillRect(handle.x, handle.y, handle.width, handle.height);
    ctx.strokeRect(handle.x, handle.y, handle.width, handle.height);
    ctx.restore();
  }
}

function ensureAnimationLoop() {
  if (animationFrame) return;
  const tick = () => {
    if (objects.some((item) => item.type === 'emoji' && item.animated)) {
      redraw();
      animationFrame = requestAnimationFrame(tick);
    } else {
      animationFrame = null;
    }
  };
  animationFrame = requestAnimationFrame(tick);
}

function currentStyle() {
  return {
    color: colorInput.value,
    width: Number(strokeSizeInput.value || 6)
  };
}

function beginObject(event) {
  if (!inputEnabled || event.target !== canvas) return;
  const start = pointFromEvent(event);
  const style = currentStyle();

  if (activeTool === 'move') {
    if (moveTarget && pointInResizeHandle(start, moveTarget)) {
      const bounds = objectBounds(moveTarget);
      resizeTarget = moveTarget;
      resizeStart = {
        bounds,
        source: cloneObject(moveTarget),
        minX: bounds.x,
        minY: bounds.y,
        pointerId: event.pointerId
      };
      drawing = true;
      document.body.classList.add('resizing-object');
      redraw();
      return;
    }
    moveTarget = hitTestObject(start);
    moveLastPoint = moveTarget ? start : null;
    drawing = Boolean(moveTarget);
    document.body.classList.toggle('moving-object', drawing);
    redraw();
    return;
  }

  drawing = true;

  if (activeTool === 'text' || activeTool === 'formula') {
    positionTextEditor(start, activeTool);
    drawing = false;
    return;
  }

  if (activeTool === 'emoji' && activeEmoji) {
    objects.push({
      type: 'emoji',
      start,
      emoji: activeEmoji,
      animated: activeEmojiAnimated,
      animation: activeEmojiAnimation,
      fontSize: Math.max(34, Number(strokeSizeInput.value || 6) * 8),
      ...style
    });
    redraw();
    if (activeEmojiAnimated) ensureAnimationLoop();
    drawing = false;
    return;
  }

  activeObject = activeTool === 'pen'
    ? { type: 'pen', points: [start], ...style }
    : { type: activeTool, start, end: start, ...style };
  redraw();
}

function updateObject(event) {
  if (!inputEnabled || !drawing) return;
  const point = pointFromEvent(event);
  if (resizeTarget && resizeStart) {
    const nextBounds = {
      x: resizeStart.minX,
      y: resizeStart.minY,
      width: Math.max(18, point.x - resizeStart.minX),
      height: Math.max(18, point.y - resizeStart.minY)
    };
    restoreObject(resizeTarget, resizeStart.source);
    resizeObject(resizeTarget, resizeStart.bounds, nextBounds);
    redraw();
    return;
  }
  if (activeTool === 'move' && moveTarget && moveLastPoint) {
    moveObject(moveTarget, point.x - moveLastPoint.x, point.y - moveLastPoint.y);
    moveLastPoint = point;
    redraw();
    return;
  }
  if (!activeObject) return;
  if (activeObject.type === 'pen') activeObject.points.push(point);
  else activeObject.end = point;
  redraw();
}

function commitObject() {
  if (activeTool === 'move') {
    drawing = false;
    moveLastPoint = null;
    resizeTarget = null;
    resizeStart = null;
    document.body.classList.remove('moving-object', 'resizing-object');
    redraw();
    scheduleAutoHide();
    return;
  }
  if (!drawing || !activeObject) return;
  objects.push(activeObject);
  activeObject = null;
  drawing = false;
  redraw();
  scheduleAutoHide();
}

function selectTool(tool) {
  activeTool = tool;
  document.body.classList.toggle('move-mode', tool === 'move');
  document.body.classList.remove('moving-object', 'resizing-object');
  canvas.style.cursor = '';
  activeEmoji = null;
  activeEmojiAnimated = false;
  emojiToggle.classList.remove('active');
  if (tool !== 'move') {
    moveTarget = null;
    moveLastPoint = null;
    resizeTarget = null;
    resizeStart = null;
    redraw();
  }
  document.querySelectorAll('.tool, .supplement-tool').forEach((button) => {
    button.classList.toggle('active', button.dataset.tool === tool);
  });
  if (tool === 'blur' || tool === 'formula') toggleSupplementPanel(true);
}

toolbar.addEventListener('click', (event) => {
  wakeToolbar();
  const button = event.target.closest('.tool');
  if (button) selectTool(button.dataset.tool);
});

supplementToggle.addEventListener('click', () => toggleSupplementPanel());

emojiToggle.addEventListener('click', () => toggleEmojiPanel());
emojiPanelClose.addEventListener('click', () => toggleEmojiPanel(false));
emojiSearch.addEventListener('input', renderEmojiGrid);

supplementPanel.addEventListener('click', (event) => {
  wakeToolbar();
  const button = event.target.closest('.supplement-tool');
  if (button) selectTool(button.dataset.tool);
});

youtubeTool.addEventListener('click', openYouTubePlayer);

textEditorInsert.addEventListener('click', insertPendingText);
textEditorCancel.addEventListener('click', closeTextEditor);
textEditorInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    insertPendingText();
  } else if (event.key === 'Escape') {
    closeTextEditor();
  }
});

youtubeLoad.addEventListener('click', loadYouTubeVideo);
youtubeUrl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    loadYouTubeVideo();
  }
});
youtubeClose.addEventListener('pointerdown', (event) => {
  event.stopPropagation();
});
youtubeClose.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  closeYouTubePlayer();
});
youtubeFullscreen.addEventListener('click', () => {
  youtubePlayer.classList.toggle('fullscreen');
  youtubeFullscreen.textContent = youtubePlayer.classList.contains('fullscreen') ? 'Restore' : 'Full';
});

youtubeHeader.addEventListener('pointerdown', (event) => {
  if (youtubePlayer.classList.contains('fullscreen')) return;
  const rect = youtubePlayer.getBoundingClientRect();
  youtubeMove = {
    pointerId: event.pointerId,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    width: rect.width,
    height: rect.height
  };
  youtubeHeader.setPointerCapture(event.pointerId);
});

youtubeHeader.addEventListener('pointermove', (event) => {
  if (!youtubeMove || youtubeMove.pointerId !== event.pointerId) return;
  event.preventDefault();
  applyYouTubeBounds(event.clientX - youtubeMove.offsetX, event.clientY - youtubeMove.offsetY, youtubeMove.width, youtubeMove.height);
});

youtubeHeader.addEventListener('pointerup', (event) => {
  if (!youtubeMove || youtubeMove.pointerId !== event.pointerId) return;
  youtubeMove = null;
});

youtubeResize.addEventListener('pointerdown', (event) => {
  if (youtubePlayer.classList.contains('fullscreen')) return;
  const rect = youtubePlayer.getBoundingClientRect();
  youtubeSize = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height
  };
  youtubeResize.setPointerCapture(event.pointerId);
});

youtubeResize.addEventListener('pointermove', (event) => {
  if (!youtubeSize || youtubeSize.pointerId !== event.pointerId) return;
  event.preventDefault();
  applyYouTubeBounds(
    youtubeSize.left,
    youtubeSize.top,
    youtubeSize.width + event.clientX - youtubeSize.startX,
    youtubeSize.height + event.clientY - youtubeSize.startY
  );
});

youtubeResize.addEventListener('pointerup', (event) => {
  if (!youtubeSize || youtubeSize.pointerId !== event.pointerId) return;
  youtubeSize = null;
});

toolbar.addEventListener('pointerenter', wakeToolbar);
toolbar.addEventListener('pointermove', wakeToolbar);
toolbar.addEventListener('pointerdown', (event) => {
  wakeToolbar();
  if (!standaloneMode || !shouldDragToolbar(event.target)) return;
  const rect = toolbar.getBoundingClientRect();
  toolbarDrag = {
    pointerId: event.pointerId,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top
  };
  toolbar.classList.add('dragging');
  toolbar.setPointerCapture(event.pointerId);
});

toolbar.addEventListener('pointermove', (event) => {
  if (!toolbarDrag || toolbarDrag.pointerId !== event.pointerId) return;
  event.preventDefault();
  applyToolbarPosition(event.clientX - toolbarDrag.offsetX, event.clientY - toolbarDrag.offsetY);
});

toolbar.addEventListener('pointerup', (event) => {
  if (!toolbarDrag || toolbarDrag.pointerId !== event.pointerId) return;
  toolbarDrag = null;
  toolbar.classList.remove('dragging');
});

toolbar.addEventListener('pointercancel', () => {
  toolbarDrag = null;
  toolbar.classList.remove('dragging');
});
canvas.addEventListener('pointermove', () => {
  if (toolbarCollapsed || drawing) return;
  scheduleAutoHide();
});

collapsedTool.addEventListener('click', wakeToolbar);

inputModeButton.addEventListener('click', () => {
  setInputMode(!inputEnabled);
});

canvas.addEventListener('pointerdown', beginObject);
canvas.addEventListener('pointermove', updateObject);
canvas.addEventListener('pointerup', commitObject);
canvas.addEventListener('pointerleave', commitObject);

undoButton.addEventListener('click', () => {
  undoObject();
});

clearButton.addEventListener('click', () => {
  clearObjects();
});

deleteObjectButton.addEventListener('click', () => {
  deleteSelectedObject();
});

stopButton.addEventListener('click', () => {
  window.screenStudioAnnotation.stopRecording();
});

closeButton.addEventListener('click', () => {
  setInputMode(false);
});

toolbarCloseButton.addEventListener('click', () => {
  window.screenStudioAnnotation.close();
});

window.addEventListener('keydown', (event) => {
  if (!textEditor.classList.contains('hidden') && event.key === 'Escape') {
    closeTextEditor();
  } else if (event.ctrlKey && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    undoObject();
  } else if (event.key === 'Delete') {
    if (!deleteSelectedObject()) clearObjects();
  } else if (event.key === 'Escape') {
    if (!youtubePlayer.classList.contains('hidden')) closeYouTubePlayer();
    else setInputMode(false);
  } else if (event.key.toLowerCase() === 'a') {
    setInputMode(!inputEnabled);
  }
});

window.addEventListener('resize', resizeCanvas);
window.screenStudioAnnotation.onInputModeChange((enabled) => {
  applyInputMode(enabled);
});
window.screenStudioAnnotation.onClear(clearObjects);
resizeCanvas();
if (standaloneMode) {
  document.body.classList.add('standalone-mode');
  document.title = 'Annotation Tools';
  stopButton.textContent = 'Hide';
  stopButton.title = 'Hide annotation tools';
  closeButton.textContent = 'Navigate';
  toolbar.classList.add('toolbar-drag-handle');
  document.querySelector('.annotation-brand')?.classList.add('toolbar-drag-handle');
}
restoreToolbarPosition();
renderEmojiCategories();
renderAnimatedEmojiRow();
renderEmojiGrid();
applyInputMode(true);
scheduleAutoHide();
window.screenStudioAnnotation.ready({
  ready: true,
  tools: Array.from(document.querySelectorAll('.tool, .supplement-tool')).map((button) => button.dataset.tool),
  supplementary: ['blur', 'formula', 'youtube', 'emoji', 'animated-emoji'],
  inputModes: ['annotate', 'navigate'],
  autoHide: false,
  undo: Boolean(undoButton),
  deleteObject: Boolean(deleteObjectButton),
  clear: Boolean(clearButton)
});
