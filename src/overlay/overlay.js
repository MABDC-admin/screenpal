const box = document.getElementById('box');
let dragStart = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setBox(a, b) {
  const left = clamp(Math.min(a.x, b.x), 0, window.innerWidth);
  const top = clamp(Math.min(a.y, b.y), 0, window.innerHeight);
  const right = clamp(Math.max(a.x, b.x), 0, window.innerWidth);
  const bottom = clamp(Math.max(a.y, b.y), 0, window.innerHeight);
  box.style.left = `${left}px`;
  box.style.top = `${top}px`;
  box.style.width = `${Math.max(40, right - left)}px`;
  box.style.height = `${Math.max(40, bottom - top)}px`;
}

function currentRegion() {
  const rect = box.getBoundingClientRect();
  return {
    x: rect.left / window.innerWidth,
    y: rect.top / window.innerHeight,
    width: rect.width / window.innerWidth,
    height: rect.height / window.innerHeight
  };
}

window.addEventListener('pointerdown', (event) => {
  dragStart = { x: event.clientX, y: event.clientY };
  setBox(dragStart, dragStart);
});

window.addEventListener('pointermove', (event) => {
  if (!dragStart) return;
  setBox(dragStart, { x: event.clientX, y: event.clientY });
});

window.addEventListener('pointerup', (event) => {
  if (!dragStart) return;
  setBox(dragStart, { x: event.clientX, y: event.clientY });
  dragStart = null;
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') window.screenStudioOverlay.cancel();
  if (event.key === 'Enter') window.screenStudioOverlay.select(currentRegion());
});

window.addEventListener('dblclick', () => {
  window.screenStudioOverlay.select(currentRegion());
});

