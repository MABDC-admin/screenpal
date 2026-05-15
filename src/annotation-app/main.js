const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, screen, globalShortcut, session } = require('electron');
const fs = require('fs');
const path = require('path');

const appBrandName = 'M.A Brain Annotation Tools';
const appLogoPath = path.join(__dirname, 'assets', 'mabdc-logo-circle.png');
const appIconPngPath = path.join(__dirname, 'assets', 'icon.png');
const appIconIcoPath = path.join(__dirname, 'assets', 'icon.ico');

let annotationWindow;
let controlWindow;
let tray;
let isQuitting = false;
let inputEnabled = true;
let controlWindowPosition = null;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

function configureYouTubeEmbedding() {
  const filter = {
    urls: [
      '*://*.youtube.com/*',
      '*://*.youtube-nocookie.com/*',
      '*://*.googlevideo.com/*',
      '*://*.ytimg.com/*'
    ]
  };
  session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    const requestHeaders = {
      ...details.requestHeaders,
      Referer: 'https://www.youtube.com/',
      Origin: 'https://www.youtube.com'
    };
    callback({ requestHeaders });
  });
}

function logoDataUri() {
  try {
    const buffer = fs.readFileSync(appLogoPath);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  } catch {
    return '';
  }
}

function closeControlWindow() {
  const target = controlWindow;
  controlWindow = null;
  if (target && !target.isDestroyed()) {
    controlWindowPosition = target.getBounds();
    target.close();
  }
}

function clampControlWindowPosition(bounds) {
  const display = screen.getDisplayMatching(bounds);
  const area = display.workArea;
  return {
    x: Math.max(area.x + 8, Math.min(bounds.x, area.x + area.width - bounds.width - 8)),
    y: Math.max(area.y + 8, Math.min(bounds.y, area.y + area.height - bounds.height - 8)),
    width: bounds.width,
    height: bounds.height
  };
}

function moveControlWindow(deltaX, deltaY) {
  if (!controlWindow || controlWindow.isDestroyed()) return false;
  const current = controlWindow.getBounds();
  const next = clampControlWindowPosition({
    ...current,
    x: current.x + Number(deltaX || 0),
    y: current.y + Number(deltaY || 0)
  });
  controlWindow.setBounds(next);
  controlWindowPosition = next;
  return true;
}

function showControlWindow() {
  if (!annotationWindow || annotationWindow.isDestroyed()) return;
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.showInactive();
    return;
  }
  const display = screen.getPrimaryDisplay();
  const area = display.workArea;
  const width = 98;
  const height = 58;
  const initialBounds = clampControlWindowPosition(controlWindowPosition || {
    x: area.x + area.width - width - 20,
    y: area.y + area.height - height - 84,
    width,
    height
  });
  controlWindow = new BrowserWindow({
    x: initialBounds.x,
    y: initialBounds.y,
    width: initialBounds.width,
    height: initialBounds.height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreenable: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '..', 'main', 'annotation-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  controlWindow.setAlwaysOnTop(true, 'screen-saver');
  controlWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: transparent; font-family: Segoe UI, Arial, sans-serif; }
      button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; width: 86px; height: 46px; margin: 6px; border: 1px solid rgba(98, 221, 234, 0.86); border-radius: 999px; background: rgba(35, 138, 154, 0.96); color: white; font-size: 12px; font-weight: 900; box-shadow: 0 14px 40px rgba(0,0,0,.28); cursor: grab; }
      button:active { cursor: grabbing; }
      img { width: 22px; height: 22px; border-radius: 999px; background: white; object-fit: cover; }
      button:hover { background: rgba(45, 164, 181, 0.98); }
    </style>
  </head>
  <body>
    <button id="tools" type="button" title="Turn annotation tools on"><img src="${logoDataUri()}" alt="" />Tools</button>
    <script>
      const tools = document.getElementById('tools');
      let dragging = false;
      let moved = false;
      let lastX = 0;
      let lastY = 0;
      tools.addEventListener('pointerdown', (event) => {
        dragging = true;
        moved = false;
        lastX = event.screenX;
        lastY = event.screenY;
        tools.setPointerCapture(event.pointerId);
      });
      tools.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        const deltaX = event.screenX - lastX;
        const deltaY = event.screenY - lastY;
        if (Math.abs(deltaX) + Math.abs(deltaY) < 1) return;
        moved = true;
        lastX = event.screenX;
        lastY = event.screenY;
        window.screenStudioAnnotation.moveControlWindow(deltaX, deltaY);
      });
      tools.addEventListener('pointerup', () => {
        dragging = false;
      });
      tools.addEventListener('click', () => {
        if (moved) {
          moved = false;
          return;
        }
        window.screenStudioAnnotation.setInputMode(true);
      });
    </script>
  </body>
</html>`)}`);
  controlWindow.on('closed', () => {
    controlWindow = null;
  });
}

function setInputMode(enabled) {
  inputEnabled = Boolean(enabled);
  if (!annotationWindow || annotationWindow.isDestroyed()) {
    createAnnotationWindow();
    return { enabled: inputEnabled, reopened: true };
  }
  annotationWindow.setIgnoreMouseEvents(!inputEnabled, { forward: true });
  annotationWindow.webContents.send('annotation:input-mode', inputEnabled);
  if (inputEnabled) {
    closeControlWindow();
    annotationWindow.showInactive();
    annotationWindow.setAlwaysOnTop(true, 'screen-saver');
  } else {
    showControlWindow();
  }
  updateTray();
  return { enabled: inputEnabled };
}

function createAnnotationWindow() {
  const display = screen.getPrimaryDisplay();
  annotationWindow = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    fullscreenable: false,
    hasShadow: false,
    title: appBrandName,
    icon: appIconIcoPath,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '..', 'main', 'annotation-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  annotationWindow.setAlwaysOnTop(true, 'screen-saver');
  annotationWindow.setIgnoreMouseEvents(false);
  annotationWindow.loadFile(path.join(__dirname, '..', 'annotation', 'index.html'), {
    query: { standalone: '1' }
  });
  annotationWindow.on('closed', () => {
    annotationWindow = null;
    closeControlWindow();
    if (!isQuitting) app.quit();
  });
  inputEnabled = true;
  updateTray();
}

function showTools() {
  if (!annotationWindow || annotationWindow.isDestroyed()) createAnnotationWindow();
  setInputMode(true);
}

function hideTools() {
  setInputMode(false);
}

function updateTray() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show Tools', click: showTools },
    { label: 'Navigate / Pass Through', type: 'checkbox', checked: !inputEnabled, click: hideTools },
    { label: 'Clear Objects', click: () => annotationWindow?.webContents.send('annotation:clear') },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]));
}

function createTray() {
  const icon = nativeImage.createFromPath(appIconPngPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip(appBrandName);
  tray.on('click', showTools);
  updateTray();
}

function createMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'Annotation',
      submenu: [
        { label: 'Show Tools', accelerator: 'Ctrl+Shift+A', click: showTools },
        { label: 'Navigate / Pass Through', accelerator: 'Ctrl+Shift+N', click: hideTools },
        { label: 'Clear Objects', accelerator: 'Ctrl+Shift+C', click: () => annotationWindow?.webContents.send('annotation:clear') },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'Ctrl+Q', click: () => { isQuitting = true; app.quit(); } }
      ]
    }
  ]));
}

ipcMain.handle('annotation:set-input-mode', (_event, enabled) => setInputMode(enabled));
ipcMain.handle('annotation:move-control-window', (_event, deltaX, deltaY) => moveControlWindow(deltaX, deltaY));
ipcMain.handle('annotation:close', () => {
  isQuitting = true;
  closeControlWindow();
  app.quit();
  return true;
});
ipcMain.handle('annotation:stop-recording', () => {
  hideTools();
  return true;
});
ipcMain.handle('annotation:ready', (_event, metrics) => {
  return { ready: true, standalone: true, ...(metrics || {}) };
});

app.whenReady().then(() => {
  configureYouTubeEmbedding();
  createMenu();
  createTray();
  createAnnotationWindow();
  globalShortcut.register('CommandOrControl+Shift+A', showTools);
  globalShortcut.register('CommandOrControl+Shift+N', hideTools);
  globalShortcut.register('CommandOrControl+Shift+C', () => annotationWindow?.webContents.send('annotation:clear'));
});

app.on('second-instance', showTools);

app.on('before-quit', () => {
  isQuitting = true;
  closeControlWindow();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  app.quit();
});
