const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, screen, globalShortcut } = require('electron');
const path = require('path');

const appBrandName = 'M.A Brain Annotation Tools';
const appIconPngPath = path.join(__dirname, '..', 'assets', 'icon.png');
const appIconIcoPath = path.join(__dirname, '..', 'assets', 'icon.ico');

let annotationWindow;
let controlWindow;
let tray;
let isQuitting = false;
let inputEnabled = true;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

function closeControlWindow() {
  const target = controlWindow;
  controlWindow = null;
  if (target && !target.isDestroyed()) target.close();
}

function showControlWindow() {
  if (!annotationWindow || annotationWindow.isDestroyed()) return;
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.showInactive();
    return;
  }
  const display = screen.getPrimaryDisplay();
  const area = display.workArea;
  controlWindow = new BrowserWindow({
    x: area.x + area.width - 110,
    y: area.y + 188,
    width: 88,
    height: 56,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
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
      button { width: 76px; height: 44px; margin: 6px; border: 1px solid rgba(98, 221, 234, 0.86); border-radius: 999px; background: rgba(35, 138, 154, 0.96); color: white; font-size: 12px; font-weight: 900; box-shadow: 0 14px 40px rgba(0,0,0,.28); }
      button:hover { background: rgba(45, 164, 181, 0.98); }
    </style>
  </head>
  <body>
    <button id="tools" type="button" title="Turn annotation tools on">Tools</button>
    <script>
      document.getElementById('tools').addEventListener('click', () => {
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
ipcMain.handle('annotation:close', () => {
  hideTools();
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
