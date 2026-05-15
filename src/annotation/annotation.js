const canvas = document.getElementById('drawCanvas');
const toolbar = document.getElementById('toolbar');
const collapsedTool = document.getElementById('collapsedTool');
const inputModeButton = document.getElementById('inputMode');
const colorInput = document.getElementById('color');
const strokeSizeInput = document.getElementById('strokeSize');
const undoButton = document.getElementById('undo');
const clearButton = document.getElementById('clear');
const stopButton = document.getElementById('stop');
const closeButton = document.getElementById('close');
const standaloneMode = new URLSearchParams(window.location.search).get('standalone') === '1';

const ctx = canvas.getContext('2d');
const objects = [];
let activeTool = 'pen';
let activeObject = null;
let drawing = false;
let dpr = 1;
let inputEnabled = true;
let toolbarCollapsed = false;
let autoHideTimer = null;

function setToolbarCollapsed(collapsed) {
  toolbarCollapsed = Boolean(collapsed);
  document.body.classList.toggle('toolbar-collapsed', toolbarCollapsed);
}

function scheduleAutoHide() {
  clearTimeout(autoHideTimer);
  if (!inputEnabled || drawing) return;
  autoHideTimer = setTimeout(() => setToolbarCollapsed(true), 4500);
}

function wakeToolbar() {
  setToolbarCollapsed(false);
  scheduleAutoHide();
}

function clearObjects() {
  objects.length = 0;
  activeObject = null;
  redraw();
  wakeToolbar();
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
}

function pointFromEvent(event) {
  return { x: event.clientX, y: event.clientY };
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
  } else if (item.type === 'text') {
    ctx.font = `${Math.max(20, item.width * 5)}px Segoe UI`;
    ctx.lineWidth = Math.max(3, item.width);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.strokeText(item.text, item.start.x, item.start.y);
    ctx.fillStyle = item.color;
    ctx.fillText(item.text, item.start.x, item.start.y);
  }
  ctx.restore();
}

function redraw() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  objects.forEach(drawObject);
  if (activeObject) drawObject(activeObject);
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
  drawing = true;

  if (activeTool === 'text') {
    const text = window.prompt('Text label');
    if (text && text.trim()) {
      objects.push({ type: 'text', start, text: text.trim(), ...style });
      redraw();
    }
    drawing = false;
    return;
  }

  activeObject = activeTool === 'pen'
    ? { type: 'pen', points: [start], ...style }
    : { type: activeTool, start, end: start, ...style };
  redraw();
}

function updateObject(event) {
  if (!inputEnabled || !drawing || !activeObject) return;
  const point = pointFromEvent(event);
  if (activeObject.type === 'pen') activeObject.points.push(point);
  else activeObject.end = point;
  redraw();
}

function commitObject() {
  if (!drawing || !activeObject) return;
  objects.push(activeObject);
  activeObject = null;
  drawing = false;
  redraw();
  scheduleAutoHide();
}

function selectTool(tool) {
  activeTool = tool;
  document.querySelectorAll('.tool').forEach((button) => {
    button.classList.toggle('active', button.dataset.tool === tool);
  });
}

toolbar.addEventListener('click', (event) => {
  wakeToolbar();
  const button = event.target.closest('.tool');
  if (button) selectTool(button.dataset.tool);
});

toolbar.addEventListener('pointerenter', wakeToolbar);
toolbar.addEventListener('pointermove', wakeToolbar);
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

stopButton.addEventListener('click', () => {
  window.screenStudioAnnotation.stopRecording();
});

closeButton.addEventListener('click', () => {
  setInputMode(false);
});

window.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    undoObject();
  } else if (event.key === 'Delete') {
    clearObjects();
  } else if (event.key === 'Escape') {
    setInputMode(false);
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
}
applyInputMode(true);
scheduleAutoHide();
window.screenStudioAnnotation.ready({
  ready: true,
  tools: Array.from(document.querySelectorAll('.tool')).map((button) => button.dataset.tool),
  inputModes: ['annotate', 'navigate'],
  autoHide: Boolean(collapsedTool),
  undo: Boolean(undoButton),
  clear: Boolean(clearButton)
});
