const { app, BrowserWindow, Menu, Tray, ipcMain, dialog, shell, nativeImage, desktopCapturer, session, screen, globalShortcut } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs/promises');
const fss = require('fs');
const path = require('path');
const os = require('os');
const ffmpegPath = require('ffmpeg-static');
const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const FormData = require('form-data');

const appRoot = path.join(os.homedir(), 'ScreenStudio');
const videoRoot = path.join(appRoot, 'Video Projects');
const logRoot = path.join(appRoot, 'Logs');
const minioConfigPath = path.join(appRoot, 'minio-config.json');
const capturePipelineCachePath = path.join(appRoot, 'capture-pipeline.json');
const defaultMinioConfigPath = path.join(__dirname, '..', 'assets', 'default-minio-config.json');
const appBrandName = 'M.A Brain Screen Studio';
const appIconPngPath = path.join(__dirname, '..', 'assets', 'icon.png');
const appIconIcoPath = path.join(__dirname, '..', 'assets', 'icon.ico');

let mainWindow;
let guideWindow;
let guideResolver;
let tray;
let isQuitting = false;
let activeNativeCapture = null;
let normalWindowBounds = null;
let miniRecorderMode = false;
let cachedCapturePipeline = null;
let screenshotWindowWasVisible = false;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

async function ensureRoots() {
  await fs.mkdir(videoRoot, { recursive: true });
  await fs.mkdir(logRoot, { recursive: true });
}

function log(message, extra = '') {
  const line = `[${new Date().toISOString()}] ${message}${extra ? ` ${extra}` : ''}\n`;
  fss.appendFile(path.join(logRoot, 'app.log'), line, () => {});
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 1040,
    minHeight: 760,
    backgroundColor: '#f7f8fa',
    title: appBrandName,
    icon: appIconIcoPath,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    log('Renderer console', `${level} ${message} (${sourceId}:${line})`);
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    log('Renderer process gone', JSON.stringify(details));
  });
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'), {
    query: process.env.SCREEN_STUDIO_SELF_TEST ? { selftest: '1' } : undefined
  });
  if (process.env.SCREEN_STUDIO_SELF_TEST) {
    setTimeout(async () => {
      const resultPath = path.join(logRoot, 'selftest.json');
      if (!fss.existsSync(resultPath)) {
        if (activeNativeCapture) {
          try {
            activeNativeCapture.process.stdin.write('q');
            activeNativeCapture.process.stdin.end();
          } catch {
            activeNativeCapture.process.kill('SIGTERM');
          }
        }
        await fs.writeFile(resultPath, JSON.stringify({
          ok: false,
          error: 'Self-test timed out before renderer reported completion',
          completedAt: new Date().toISOString()
        }, null, 2));
        log('Self-test timeout');
        isQuitting = true;
        app.quit();
      }
    }, 45000);
  }
}

function setupDisplayMediaHandler() {
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 320, height: 180 },
        fetchWindowIcons: true
      });
      const screen = sources.find((source) => source.id.startsWith('screen:')) || sources[0];
      if (!screen) {
        callback({});
        return;
      }
      callback({ video: screen, audio: 'loopback' });
    } catch (error) {
      log('Display media handler failed', error.message);
      callback({});
    }
  });
}

function showWindow() {
  if (!mainWindow) createWindow();
  mainWindow.show();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

function enterMiniRecorder() {
  if (!mainWindow) createWindow();
  if (!miniRecorderMode) normalWindowBounds = mainWindow.getBounds();
  const display = screen.getDisplayMatching(mainWindow.getBounds());
  const area = display.workArea;
  const width = 440;
  const height = 150;
  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.setResizable(false);
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setMinimumSize(width, height);
  mainWindow.setSize(width, height);
  mainWindow.setPosition(area.x + area.width - width - 22, area.y + 22);
  mainWindow.show();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
  miniRecorderMode = true;
  return true;
}

function exitMiniRecorder() {
  if (!mainWindow) createWindow();
  mainWindow.setAlwaysOnTop(false);
  mainWindow.setResizable(true);
  mainWindow.setMenuBarVisibility(true);
  mainWindow.setMinimumSize(1040, 760);
  if (normalWindowBounds) {
    mainWindow.setBounds(normalWindowBounds);
  } else {
    mainWindow.setSize(1500, 940);
  }
  miniRecorderMode = false;
  normalWindowBounds = null;
  showWindow();
  return true;
}

async function hideWindowForScreenshot() {
  if (!mainWindow) return true;
  screenshotWindowWasVisible = mainWindow.isVisible();
  mainWindow.hide();
  await new Promise((resolve) => setTimeout(resolve, 350));
  return true;
}

function showWindowAfterScreenshot() {
  if (!mainWindow) createWindow();
  if (screenshotWindowWasVisible || !process.env.SCREEN_STUDIO_SELF_TEST) {
    mainWindow.show();
    mainWindow.focus();
  }
  screenshotWindowWasVisible = false;
  return true;
}

function createTray() {
  const icon = nativeImage.createFromPath(appIconPngPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip(appBrandName);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: `Open ${appBrandName}`, click: showWindow },
    { label: 'New Recording', click: () => mainWindow?.webContents.send('app:new-recording') },
    { label: 'Stop Recording', click: () => mainWindow?.webContents.send('app:stop-recording') },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]));
  tray.on('click', showWindow);
}

function createMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        { label: 'New Recording', accelerator: 'Ctrl+N', click: () => mainWindow?.webContents.send('app:new-recording') },
        { label: 'Stop Recording', accelerator: 'Ctrl+Shift+S', click: () => mainWindow?.webContents.send('app:stop-recording') },
        { label: 'Open Projects Folder', click: () => shell.openPath(videoRoot) },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'Ctrl+Q', click: () => { isQuitting = true; app.quit(); } }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' }
      ]
    }
  ]));
}

function createGuideWindow() {
  const display = screen.getPrimaryDisplay();
  guideWindow = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreenable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'overlay-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  guideWindow.setAlwaysOnTop(true, 'screen-saver');
  guideWindow.loadFile(path.join(__dirname, '..', 'overlay', 'index.html'));
  guideWindow.on('closed', () => {
    guideWindow = null;
    if (guideResolver) {
      guideResolver(null);
      guideResolver = null;
    }
  });
}

function safeProjectName(name) {
  const cleaned = String(name || 'Recording')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'Recording';
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function assertProjectPath(projectPath) {
  const resolved = path.resolve(projectPath || '');
  const root = path.resolve(videoRoot);
  if (!isInside(root, resolved)) throw new Error('Invalid project path');
  return resolved;
}

async function uniqueProjectDir(baseName) {
  const name = safeProjectName(baseName);
  let candidate = path.join(videoRoot, name);
  let index = 2;
  while (true) {
    try {
      await fs.access(candidate);
      candidate = path.join(videoRoot, `${name} ${index++}`);
    } catch {
      return candidate;
    }
  }
}

async function readProject(projectDir) {
  const safeDir = assertProjectPath(projectDir);
  const raw = await fs.readFile(path.join(safeDir, 'project.json'), 'utf8');
  const meta = JSON.parse(raw);
  return {
    ...meta,
    path: safeDir,
    mediaPath: path.join(safeDir, meta.media?.source || 'media/capture.webm')
  };
}

async function recoverProjectFromMedia(projectDir) {
  const projectJson = path.join(projectDir, 'project.json');
  if (fss.existsSync(projectJson)) return null;
  await finalizeRecoveredWorkingVideo(projectDir);
  const candidates = [
    { file: path.join(projectDir, 'media', 'capture.mp4'), mimeType: 'video/mp4', engine: 'ffmpeg-recovered', durationMs: 0 },
    { file: path.join(projectDir, 'media', 'capture-working.mkv'), mimeType: 'video/x-matroska', engine: 'ffmpeg-autosave-recovered', durationMs: 0 },
    { file: path.join(projectDir, 'media', 'capture.webm'), mimeType: 'video/webm', engine: 'browser-recovered', durationMs: 0 },
    { file: path.join(projectDir, 'media', 'screenshot.png'), mimeType: 'image/png', engine: 'screenshot', durationMs: 0 }
  ];
  const candidate = candidates.find((entry) => fss.existsSync(entry.file) && fss.statSync(entry.file).size > 0);
  if (!candidate) return null;
  const stat = await fs.stat(candidate.file);
  const createdAt = stat.birthtime?.toISOString?.() || new Date().toISOString();
  const mediaSource = path.relative(projectDir, candidate.file).replace(/\\/g, '/');
  const meta = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: path.basename(projectDir),
    createdAt,
    updatedAt: new Date().toISOString(),
    durationMs: candidate.durationMs,
    sizeBytes: stat.size,
    media: {
      source: mediaSource,
      mimeType: candidate.mimeType,
      engine: candidate.engine,
      recovered: true
    },
    edit: {
      trimStartMs: 0,
      trimEndMs: candidate.durationMs,
      playbackRate: 1,
      overlays: [],
      captions: []
    },
    capture: {
      recovered: true,
      engine: candidate.engine
    },
    exports: []
  };
  await fs.mkdir(path.join(projectDir, 'edits'), { recursive: true });
  await writeProject(projectDir, meta);
  await fs.writeFile(path.join(projectDir, 'edits', 'timeline.json'), JSON.stringify(meta.edit, null, 2));
  await fs.writeFile(path.join(projectDir, 'edits', 'undo-log.jsonl'), JSON.stringify({ at: meta.updatedAt, recovered: true }) + '\n');
  log('Recovered unfinished project', projectDir);
  return await readProject(projectDir);
}

async function finalizeRecoveredWorkingVideo(projectDir) {
  const workingPath = path.join(projectDir, 'media', 'capture-working.mkv');
  const outputPath = path.join(projectDir, 'media', 'capture.mp4');
  if (!fss.existsSync(workingPath)) return false;
  const stat = fss.statSync(workingPath);
  if (!stat.size) return false;
  if (fss.existsSync(outputPath) && fss.statSync(outputPath).size > 0) return true;
  try {
    await remuxToMp4(workingPath, outputPath);
    log('Finalized recovered autosave video', outputPath);
    return true;
  } catch (error) {
    log('Recovered autosave remux failed', error.message);
    return false;
  }
}

async function writeProject(projectDir, meta) {
  await fs.writeFile(path.join(projectDir, 'project.json'), JSON.stringify(meta, null, 2));
}

async function renameWithRetry(source, target, attempts = 8) {
  let lastError = null;
  for (let i = 0; i < attempts; i++) {
    try {
      await fs.rename(source, target);
      return;
    } catch (error) {
      lastError = error;
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(error.code) || i === attempts - 1) break;
      await new Promise((resolve) => setTimeout(resolve, 180 * (i + 1)));
    }
  }
  throw lastError;
}

function sendExportProgress(jobId, payload) {
  mainWindow?.webContents.send('export:progress', { jobId, ...payload });
}

function sendUploadProgress(jobId, payload) {
  mainWindow?.webContents.send('upload:progress', { jobId, ...payload });
}

function normalizeEndpoint(endpoint) {
  const trimmed = String(endpoint || '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(trimmed)) throw new Error('MinIO endpoint must start with http:// or https://');
  return trimmed;
}

function normalizeMinioConfig(payload = {}) {
  const endpoint = normalizeEndpoint(payload.endpoint);
  const bucket = String(payload.bucket || '').trim();
  const accessKeyId = String(payload.accessKeyId || '').trim();
  const secretAccessKey = String(payload.secretAccessKey || '').trim();
  const region = String(payload.region || 'us-east-1').trim() || 'us-east-1';
  const publicBaseUrl = String(payload.publicBaseUrl || '').trim().replace(/\/+$/, '');
  if (!bucket) throw new Error('MinIO bucket is required');
  if (!accessKeyId) throw new Error('MinIO access key is required');
  if (!secretAccessKey) throw new Error('MinIO secret key is required');
  const uploadMode = payload.uploadMode === 'console-api' || /\/api\/v1$/i.test(endpoint) ? 'console-api' : 's3';
  return { endpoint, bucket, accessKeyId, secretAccessKey, region, publicBaseUrl, uploadMode };
}

function publicMinioConfig(config) {
  return {
    configured: Boolean(config?.endpoint && config?.bucket && config?.accessKeyId && config?.secretAccessKey),
    hasSecret: Boolean(config?.secretAccessKey),
    endpoint: config?.endpoint || '',
    bucket: config?.bucket || '',
    accessKeyId: config?.accessKeyId || '',
    region: config?.region || 'us-east-1',
    publicBaseUrl: config?.publicBaseUrl || '',
    uploadMode: config?.uploadMode || 's3'
  };
}

function createMinioS3Client(config) {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region || 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });
}

async function mergedMinioConfig(payload = {}) {
  const existing = await readMinioConfig({ includeSecret: true });
  const merged = {
    ...(existing || {}),
    ...payload
  };
  if (!String(payload.secretAccessKey || '').trim() && existing?.secretAccessKey) {
    merged.secretAccessKey = existing.secretAccessKey;
  }
  return normalizeMinioConfig(merged);
}

async function testMinioConfig(config) {
  if (config.uploadMode === 'console-api') {
    await consoleApiLogin(config);
    return { ok: true, mode: 'console-api', bucket: config.bucket };
  }
  const client = createMinioS3Client(config);
  await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
  return { ok: true, mode: 's3', bucket: config.bucket };
}

async function readMinioConfig({ includeSecret = false } = {}) {
  try {
    const config = JSON.parse(await fs.readFile(minioConfigPath, 'utf8'));
    return includeSecret ? config : publicMinioConfig(config);
  } catch {
    try {
      const bundledConfig = normalizeMinioConfig(JSON.parse(await fs.readFile(defaultMinioConfigPath, 'utf8')));
      await fs.writeFile(minioConfigPath, JSON.stringify(bundledConfig, null, 2));
      log('Installed bundled MinIO config', `${bundledConfig.endpoint} ${bundledConfig.bucket}`);
      return includeSecret ? bundledConfig : publicMinioConfig(bundledConfig);
    } catch {
      return includeSecret ? null : publicMinioConfig(null);
    }
  }
}

function encodeS3Path(key) {
  return key.split('/').map((part) => encodeURIComponent(part)).join('/');
}

function minioUploadUrl(config, key) {
  const base = config.publicBaseUrl || `${config.endpoint}/${config.bucket}`;
  if (base.endsWith('=') || base.includes('prefix=')) return `${base}${encodeURIComponent(key)}`;
  return `${base.replace(/\/+$/, '')}/${encodeS3Path(key)}`;
}

function consoleApiBase(config) {
  const endpoint = config.endpoint.replace(/\/+$/, '');
  return endpoint.endsWith('/api/v1') ? endpoint : `${endpoint}/api/v1`;
}

async function consoleApiLogin(config) {
  const response = await fetch(`${consoleApiBase(config)}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ accessKey: config.accessKeyId, secretKey: config.secretAccessKey })
  });
  if (!response.ok && response.status !== 204) throw new Error(`MinIO console login failed with ${response.status}`);
  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  if (!cookie) throw new Error('MinIO console login did not return a session cookie');
  return cookie;
}

async function uploadViaConsoleApi(config, project, stat, key, jobId) {
  const cookie = await consoleApiLogin(config);
  const uploadUrl = new URL(`${consoleApiBase(config)}/buckets/${encodeURIComponent(config.bucket)}/objects/upload`);
  uploadUrl.searchParams.set('prefix', key);
  let loaded = 0;
  const stream = fss.createReadStream(project.mediaPath);
  stream.on('data', (chunk) => {
    loaded += chunk.length;
    sendUploadProgress(jobId, {
      state: 'running',
      percent: stat.size ? Math.min(99, Math.round((loaded / stat.size) * 100)) : 0,
      message: 'Uploading to MinIO'
    });
  });
  const form = new FormData();
  form.append(String(stat.size), stream, {
    filename: path.basename(project.mediaPath),
    contentType: project.media?.mimeType || 'video/mp4',
    knownLength: stat.size
  });
  await new Promise((resolve, reject) => {
    const request = form.submit({
      protocol: uploadUrl.protocol,
      hostname: uploadUrl.hostname,
      port: uploadUrl.port,
      path: `${uploadUrl.pathname}${uploadUrl.search}`,
      method: 'POST',
      headers: { ...form.getHeaders(), Cookie: cookie }
    }, (error, response) => {
      if (error) {
        reject(error);
        return;
      }
      let body = '';
      response.on('data', (chunk) => {
        body += chunk.toString();
      });
      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) resolve();
        else reject(new Error(body || `MinIO console upload failed with ${response.statusCode}`));
      });
    });
    request.on('error', reject);
  });
}

function projectUploadKey(project) {
  const extension = path.extname(project.mediaPath) || '.mp4';
  const title = safeProjectName(project.title).replace(/\s+/g, '-').toLowerCase();
  return `screen-studio/${title}-${project.id}${extension}`;
}

function ffmpegTimeToMs(line) {
  const match = /time=(\d+):(\d+):(\d+)\.(\d+)/.exec(line);
  if (!match) return null;
  const [, h, m, s, frac] = match;
  return ((Number(h) * 3600) + (Number(m) * 60) + Number(s)) * 1000 + Number(frac.padEnd(3, '0').slice(0, 3));
}

function resolveFfmpegPath() {
  if (!ffmpegPath) throw new Error('FFmpeg binary is unavailable');
  const unpackedPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
  if (fss.existsSync(unpackedPath)) return unpackedPath;
  if (fss.existsSync(ffmpegPath)) return ffmpegPath;
  throw new Error(`FFmpeg binary was not found at ${ffmpegPath}`);
}

function parseDshowAudioDevices(stderr) {
  const devices = [];
  const pattern = /\[dshow[^\]]*\]\s+"([^"]+)"\s+\(audio\)/g;
  let match;
  while ((match = pattern.exec(stderr))) devices.push(match[1]);
  return devices;
}

async function listDshowAudioDevices() {
  const binary = resolveFfmpegPath();
  return await new Promise((resolve) => {
    const child = spawn(binary, ['-hide_banner', '-list_devices', 'true', '-f', 'dshow', '-i', 'dummy'], {
      windowsHide: true
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', () => resolve([]));
    child.on('close', () => resolve(parseDshowAudioDevices(stderr)));
  });
}

function classifyAudioDevice(device) {
  if (/virtual-audio-capturer|stereo mix|what u hear|speaker|loopback|cable output|vb-audio/i.test(device)) return 'system';
  if (/vmix audio/i.test(device)) return 'virtual-mixer';
  if (/microphone|mic/i.test(device)) return 'microphone';
  return 'audio-device';
}

function pickAudioDevice(devices, captureConfig) {
  if (!devices.length) return null;
  if (!captureConfig.recordAudio) return null;
  if (captureConfig.audioDevice) {
    const requestedDevice = devices.find((device) => device === captureConfig.audioDevice);
    if (requestedDevice) return requestedDevice;
  }
  // Auto mode uses Electron's Windows loopback capture and is muxed after FFmpeg video stops.
  return null;
}

function evenDimension(value, minimum = 64) {
  const rounded = Math.max(minimum, Math.round(value));
  return rounded % 2 === 0 ? rounded : rounded - 1;
}

function recordingProfile(captureConfig = {}, payload = {}) {
  const quality = captureConfig.quality || 'ultra';
  if (quality === 'ultra') {
    return {
      quality,
      frameRate: Number(payload.frameRate || 60),
      preset: 'ultrafast',
      crf: '18',
      hardwareCq: '18',
      audioBitrate: '192k'
    };
  }
  if (quality === 'high') {
    return {
      quality,
      frameRate: Number(payload.frameRate || 30),
      preset: 'ultrafast',
      crf: '18',
      hardwareCq: '20',
      audioBitrate: '160k'
    };
  }
  return {
    quality: 'standard',
    frameRate: Number(payload.frameRate || 30),
    preset: 'ultrafast',
    crf: '22',
    hardwareCq: '23',
    audioBitrate: '160k'
  };
}

function captureRect(captureConfig = {}) {
  const display = screen.getPrimaryDisplay();
  const bounds = display.bounds;
  const scale = display.scaleFactor || 1;
  const region = captureConfig.mode === 'region' ? captureConfig.region : null;
  const logical = region ? {
    x: bounds.x + (bounds.width * Number(region.x || 0)),
    y: bounds.y + (bounds.height * Number(region.y || 0)),
    width: bounds.width * Number(region.width || 1),
    height: bounds.height * Number(region.height || 1)
  } : bounds;

  return {
    x: Math.round(logical.x * scale),
    y: Math.round(logical.y * scale),
    width: evenDimension(logical.width * scale),
    height: evenDimension(logical.height * scale)
  };
}

function screenshotTargetSize(width, height) {
  const aspect = width / Math.max(1, height);
  if (aspect >= 1) {
    return {
      width: 7680,
      height: evenDimension(7680 / aspect)
    };
  }
  return {
    width: evenDimension(7680 * aspect),
    height: 7680
  };
}

function resizeImageTo8k(image) {
  const size = image.getSize();
  if (!size.width || !size.height) return image;
  const target = screenshotTargetSize(size.width, size.height);
  return image.resize({
    width: target.width,
    height: target.height,
    quality: 'best'
  });
}

function ddagrabScreenshotInput(rect) {
  return ddagrabInput(rect, 1);
}

function gdigrabScreenshotInput(rect) {
  return gdigrabInput(rect, 1);
}

function screenshotScaleFilter(rect) {
  const target = screenshotTargetSize(rect.width, rect.height);
  return `scale=${target.width}:${target.height}:flags=lanczos,unsharp=5:5:1.2:3:3:0.4`;
}

function screenshotPipelines(rect) {
  return [
    {
      backend: 'ddagrab',
      input: ddagrabScreenshotInput,
      vf: `hwdownload,format=bgra,${screenshotScaleFilter(rect)}`
    },
    {
      backend: 'gdigrab',
      input: gdigrabScreenshotInput,
      vf: `format=bgra,${screenshotScaleFilter(rect)}`
    }
  ];
}

async function captureSharpScreenshotPng(rect, outputPath) {
  let lastError = null;
  for (const pipeline of screenshotPipelines(rect)) {
    const args = [
      '-hide_banner',
      '-y',
      ...pipeline.input(rect),
      '-frames:v', '1',
      '-vf', pipeline.vf,
      '-compression_level', '4',
      '-pred', 'mixed',
      outputPath
    ];
    try {
      await runFfmpegProcess(args);
      const stat = await fs.stat(outputPath);
      if (stat.size > 0) {
        log('Captured sharp screenshot', `${pipeline.backend} ${rect.width}x${rect.height} -> ${outputPath}`);
        return pipeline.backend;
      }
      lastError = new Error('FFmpeg screenshot produced an empty image');
    } catch (error) {
      lastError = error;
      log('Sharp screenshot pipeline failed', `${pipeline.backend}: ${error.message}`);
    }
  }
  throw lastError || new Error('No screenshot pipeline worked');
}

function ddagrabInput(rect, frameRate) {
  const parts = [
    'output_idx=0',
    `framerate=${frameRate}`,
    `video_size=${rect.width}x${rect.height}`,
    `offset_x=${rect.x}`,
    `offset_y=${rect.y}`,
    'output_fmt=8bit'
  ];
  return ['-f', 'lavfi', '-i', `ddagrab=${parts.join(':')}`];
}

function gdigrabInput(rect, frameRate) {
  return [
    '-thread_queue_size', '4096',
    '-rtbufsize', '1024M',
    '-f', 'gdigrab',
    '-framerate', String(frameRate),
    '-draw_mouse', '1',
    '-offset_x', String(rect.x),
    '-offset_y', String(rect.y),
    '-video_size', `${rect.width}x${rect.height}`,
    '-i', 'desktop'
  ];
}

function capturePipelines(profile) {
  return [
    {
      backend: 'ddagrab',
      encoder: 'h264_nvenc',
      label: 'Desktop Duplication + NVIDIA NVENC',
      input: ddagrabInput,
      videoArgs: ['-c:v', 'h264_nvenc', '-preset', 'p4', '-tune', 'hq', '-cq', profile.hardwareCq, '-pix_fmt', 'yuv420p']
    },
    {
      backend: 'ddagrab',
      encoder: 'h264_amf',
      label: 'Desktop Duplication + AMD AMF',
      input: ddagrabInput,
      videoArgs: ['-vf', 'hwdownload,format=bgra,format=nv12', '-c:v', 'h264_amf', '-quality', 'speed', '-rc', 'cqp', '-qp_i', profile.hardwareCq, '-qp_p', profile.hardwareCq]
    },
    {
      backend: 'ddagrab',
      encoder: 'h264_qsv',
      label: 'Desktop Duplication + Intel QuickSync',
      input: ddagrabInput,
      videoArgs: ['-vf', 'hwdownload,format=bgra,format=nv12', '-c:v', 'h264_qsv', '-preset', 'veryfast', '-global_quality', profile.hardwareCq]
    },
    {
      backend: 'ddagrab',
      encoder: 'libx264',
      label: 'Desktop Duplication + x264 realtime',
      input: ddagrabInput,
      videoArgs: ['-vf', 'hwdownload,format=bgra,format=yuv420p', '-c:v', 'libx264', '-preset', profile.preset, '-tune', 'zerolatency', '-crf', profile.crf]
    },
    {
      backend: 'gdigrab',
      encoder: 'libx264',
      label: 'GDI fallback + x264 realtime',
      input: gdigrabInput,
      videoArgs: ['-c:v', 'libx264', '-preset', profile.preset, '-tune', 'zerolatency', '-crf', profile.crf, '-pix_fmt', 'yuv420p']
    }
  ];
}

async function runProbe(binary, args, timeoutMs = 7000) {
  return await new Promise((resolve) => {
    const child = spawn(binary, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ ok: false, stderr: stderr || 'Timed out' });
    }, timeoutMs);
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.once('error', (error) => {
      clearTimeout(timeout);
      resolve({ ok: false, stderr: error.message });
    });
    child.once('close', (code) => {
      clearTimeout(timeout);
      resolve({ ok: code === 0, stderr });
    });
  });
}

async function readCachedCapturePipeline() {
  if (cachedCapturePipeline) return cachedCapturePipeline;
  try {
    cachedCapturePipeline = JSON.parse(await fs.readFile(capturePipelineCachePath, 'utf8'));
    return cachedCapturePipeline;
  } catch {
    return null;
  }
}

async function detectCapturePipeline(binary, profile) {
  const cached = await readCachedCapturePipeline();
  const pipelines = capturePipelines(profile);
  if (cached) {
    const match = pipelines.find((pipeline) => pipeline.backend === cached.backend && pipeline.encoder === cached.encoder);
    if (match) return match;
  }

  const probeRect = { x: 0, y: 0, width: 640, height: 360 };
  const probeDir = path.join(logRoot, 'capture-probes');
  await fs.mkdir(probeDir, { recursive: true });
  for (const pipeline of pipelines) {
    const outputPath = path.join(probeDir, `${pipeline.backend}-${pipeline.encoder}.mp4`);
    const args = [
      '-hide_banner',
      '-y',
      ...pipeline.input(probeRect, 30),
      '-t', '1',
      '-map', '0:v:0',
      ...pipeline.videoArgs,
      '-an',
      '-movflags', '+faststart',
      outputPath
    ];
    const result = await runProbe(binary, args);
    const stat = result.ok && fss.existsSync(outputPath) ? fss.statSync(outputPath) : null;
    log('Capture pipeline probe', `${pipeline.label}: ${result.ok ? 'ok' : 'failed'}${stat ? ` ${stat.size} bytes` : ''}`);
    if (result.ok && stat?.size > 0) {
      cachedCapturePipeline = { backend: pipeline.backend, encoder: pipeline.encoder, label: pipeline.label, detectedAt: new Date().toISOString() };
      await fs.writeFile(capturePipelineCachePath, JSON.stringify(cachedCapturePipeline, null, 2));
      return pipeline;
    }
  }
  throw new Error('No working FFmpeg screen capture pipeline was detected');
}

function buildNativeCaptureArgs({ profile, rect, audioDevice, outputPath, pipeline }) {
  const args = [
    '-hide_banner',
    '-y',
    ...pipeline.input(rect, profile.frameRate)
  ];

  if (audioDevice) {
    args.push(
      '-thread_queue_size', '4096',
      '-rtbufsize', '512M',
      '-f', 'dshow',
      '-i', `audio=${audioDevice}`
    );
  }

  args.push('-map', '0:v:0');
  if (audioDevice) args.push('-map', '1:a:0');
  args.push(...pipeline.videoArgs);
  if (audioDevice) {
    args.push('-c:a', 'aac', '-b:a', profile.audioBitrate, '-ar', '48000', '-ac', '2');
  } else {
    args.push('-an');
  }
  args.push('-fps_mode', 'cfr');
  if (path.extname(outputPath).toLowerCase() === '.mp4') {
    args.push('-movflags', '+faststart', outputPath);
  } else {
    args.push('-f', 'matroska', outputPath);
  }
  return args;
}

async function remuxToMp4(inputPath, outputPath) {
  await runFfmpegProcess([
    '-hide_banner',
    '-y',
    '-i', inputPath,
    '-map', '0',
    '-c', 'copy',
    '-movflags', '+faststart',
    outputPath
  ]);
  const stat = await fs.stat(outputPath);
  if (!stat.size) throw new Error('Autosaved video remux produced an empty MP4');
}

async function runFfmpegProcess(args) {
  const binary = resolveFfmpegPath();
  return await new Promise((resolve, reject) => {
    const child = spawn(binary, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) resolve(stderr);
      else reject(new Error(stderr.split(/\r?\n/).slice(-10).join('\n') || `FFmpeg exited with ${code}`));
    });
  });
}

async function muxCompanionAudio(capture, audioPayload) {
  const bytes = audioPayload?.buffer ? Buffer.from(audioPayload.buffer) : null;
  if (!bytes?.length) return false;
  const audioPath = path.join(capture.projectDir, 'media', 'system-loopback.webm');
  const videoOnlyPath = path.join(capture.projectDir, 'media', 'capture-video-only.mp4');
  const muxedPath = path.join(capture.projectDir, 'media', 'capture-with-audio.mp4');
  await fs.writeFile(audioPath, bytes);
  const args = [
    '-hide_banner',
    '-y',
    '-i', capture.outputPath,
    '-i', audioPath,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '48000',
    '-ac', '2',
    '-shortest',
    '-movflags', '+faststart',
    muxedPath
  ];
  await runFfmpegProcess(args);
  await renameWithRetry(capture.outputPath, videoOnlyPath);
  await renameWithRetry(muxedPath, capture.outputPath);
  capture.audioDevice = audioPayload.source || 'Electron system loopback';
  capture.audioKind = audioPayload.hasMicAudio ? 'system-loopback+microphone' : 'system-loopback';
  capture.companionAudio = {
    source: audioPayload.source || 'electron-loopback',
    mimeType: audioPayload.mimeType || 'audio/webm',
    sizeBytes: bytes.length,
    durationMs: Math.round(audioPayload.durationMs || 0),
    hasSystemAudio: Boolean(audioPayload.hasSystemAudio),
    hasMicAudio: Boolean(audioPayload.hasMicAudio)
  };
  log('Muxed Electron loopback audio', `${bytes.length} bytes`);
  return true;
}

async function finalizeNativeVideo(capture) {
  if (!capture.workingPath || capture.workingPath === capture.outputPath) return false;
  const workingStat = await fs.stat(capture.workingPath);
  if (!workingStat.size) throw new Error('Autosave file is empty');
  await remuxToMp4(capture.workingPath, capture.outputPath);
  capture.autosave = {
    enabled: true,
    workingFile: path.relative(capture.projectDir, capture.workingPath).replace(/\\/g, '/'),
    finalizedFile: path.relative(capture.projectDir, capture.outputPath).replace(/\\/g, '/'),
    sizeBytes: workingStat.size
  };
  log('Finalized autosave video', `${capture.workingPath} -> ${capture.outputPath}`);
  return true;
}

async function createNativeProject(capture) {
  const stat = await fs.stat(capture.outputPath);
  if (!stat.size) throw new Error('FFmpeg stopped without writing video data');
  const createdAt = capture.createdAt;
  const durationMs = Math.max(0, Date.now() - capture.startedAt);
  const meta = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: path.basename(capture.projectDir),
    createdAt,
    updatedAt: new Date().toISOString(),
    durationMs,
    sizeBytes: stat.size,
    media: {
      source: 'media/capture.mp4',
      mimeType: 'video/mp4',
      engine: `ffmpeg-${capture.captureBackend}`
    },
    edit: {
      trimStartMs: 0,
      trimEndMs: durationMs,
      playbackRate: 1,
      overlays: [],
      captions: []
    },
    capture: {
      ...capture.captureConfig,
      rect: capture.rect,
      autosave: capture.autosave || null,
      audioDevice: capture.audioDevice,
      audioKind: capture.audioKind,
      engine: `ffmpeg-${capture.captureBackend}`,
      captureBackend: capture.captureBackend,
      videoEncoder: capture.videoEncoder,
      companionAudio: capture.companionAudio || null,
      hasSystemAudio: Boolean(capture.companionAudio?.hasSystemAudio || classifyAudioDevice(capture.audioDevice || '') === 'system')
    },
    exports: []
  };
  await writeProject(capture.projectDir, meta);
  await fs.writeFile(path.join(capture.projectDir, 'edits', 'timeline.json'), JSON.stringify(meta.edit, null, 2));
  await fs.writeFile(path.join(capture.projectDir, 'edits', 'undo-log.jsonl'), '');
  log('Created native FFmpeg project', capture.projectDir);
  return await readProject(capture.projectDir);
}

async function stopNativeCapture(audioPayload = null) {
  const capture = activeNativeCapture;
  if (!capture) return null;
  activeNativeCapture = null;
  return await new Promise((resolve, reject) => {
    let settled = false;
    const finish = async (error) => {
      if (settled) return;
      settled = true;
      if (error) {
        reject(error);
        return;
      }
      try {
        await finalizeNativeVideo(capture);
        if (audioPayload?.buffer) await muxCompanionAudio(capture, audioPayload);
        resolve(await createNativeProject(capture));
      } catch (createError) {
        reject(createError);
      }
    };
    capture.process.once('close', (code) => {
      if (code === 0 || code === 255) finish();
      else finish(new Error(capture.stderr.split(/\r?\n/).slice(-8).join('\n') || `FFmpeg exited with ${code}`));
    });
    capture.process.once('error', finish);
    try {
      capture.process.stdin.write('q');
      capture.process.stdin.end();
    } catch {
      capture.process.kill('SIGTERM');
    }
    setTimeout(() => {
      if (!settled && !capture.process.killed) capture.process.kill('SIGKILL');
    }, 3000);
  });
}

ipcMain.handle('projects:list', async () => {
  await ensureRoots();
  const entries = await fs.readdir(videoRoot, { withFileTypes: true });
  const projects = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const projectDir = path.join(videoRoot, entry.name);
    try {
      const recovered = await recoverProjectFromMedia(projectDir);
      projects.push(recovered || await readProject(projectDir));
    } catch {
      // Ignore folders that are not Screen Studio projects.
    }
  }
  return projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
});

ipcMain.handle('projects:createRecording', async (_event, payload) => {
  await ensureRoots();
  if (!payload?.buffer) throw new Error('No recording data received');

  const createdAt = new Date().toISOString();
  const projectDir = await uniqueProjectDir(payload.title || `Recording ${createdAt.slice(0, 19).replace(/[:T]/g, '-')}`);
  const mediaDir = path.join(projectDir, 'media');
  const editsDir = path.join(projectDir, 'edits');
  await fs.mkdir(mediaDir, { recursive: true });
  await fs.mkdir(editsDir, { recursive: true });

  const mediaPath = path.join(mediaDir, 'capture.webm');
  const bytes = Buffer.from(payload.buffer);
  await fs.writeFile(mediaPath, bytes);

  const meta = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: path.basename(projectDir),
    createdAt,
    updatedAt: createdAt,
    durationMs: Math.round(payload.durationMs || 0),
    sizeBytes: bytes.length,
    media: {
      source: 'media/capture.webm',
      mimeType: payload.mimeType || 'video/webm'
    },
    edit: {
      trimStartMs: 0,
      trimEndMs: Math.round(payload.durationMs || 0),
      playbackRate: 1,
      overlays: [],
      captions: []
    },
    capture: payload.captureConfig || {},
    exports: []
  };

  await writeProject(projectDir, meta);
  await fs.writeFile(path.join(editsDir, 'timeline.json'), JSON.stringify(meta.edit, null, 2));
  await fs.writeFile(path.join(editsDir, 'undo-log.jsonl'), '');
  log('Created project', projectDir);
  return await readProject(projectDir);
});

ipcMain.handle('projects:capture-screenshot', async (_event, payload = {}) => {
  await ensureRoots();
  const captureConfig = payload.captureConfig || {};
  const rect = captureRect(captureConfig);
  const createdAt = new Date().toISOString();
  const projectDir = await uniqueProjectDir(payload.title || `Screenshot ${createdAt.slice(0, 19).replace(/[:T]/g, '-')}`);
  const mediaDir = path.join(projectDir, 'media');
  const editsDir = path.join(projectDir, 'edits');
  await fs.mkdir(mediaDir, { recursive: true });
  await fs.mkdir(editsDir, { recursive: true });
  const mediaPath = path.join(mediaDir, 'screenshot.png');
  const screenshotBackend = await captureSharpScreenshotPng(rect, mediaPath);
  const stat = await fs.stat(mediaPath);
  const image = nativeImage.createFromPath(mediaPath);
  if (image.isEmpty()) throw new Error('Screenshot capture produced an unreadable PNG');
  const imageSize = image.getSize();
  const meta = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: path.basename(projectDir),
    createdAt,
    updatedAt: createdAt,
    durationMs: 0,
    sizeBytes: stat.size,
    media: {
      source: 'media/screenshot.png',
      mimeType: 'image/png',
      engine: `ffmpeg-${screenshotBackend}-screenshot`,
      width: imageSize.width,
      height: imageSize.height,
      quality: '8k-sharp'
    },
    edit: {
      trimStartMs: 0,
      trimEndMs: 0,
      playbackRate: 1,
      overlays: [],
      captions: []
    },
    capture: {
      ...captureConfig,
      rect,
      engine: `ffmpeg-${screenshotBackend}-screenshot`,
      screenshotQuality: '8k-sharp',
      screenshotBackend
    },
    exports: []
  };
  await writeProject(projectDir, meta);
  await fs.writeFile(path.join(editsDir, 'timeline.json'), JSON.stringify(meta.edit, null, 2));
  await fs.writeFile(path.join(editsDir, 'undo-log.jsonl'), '');
  log('Created screenshot project', projectDir);
  return await readProject(projectDir);
});

ipcMain.handle('projects:updateEdit', async (_event, payload) => {
  const projectDir = assertProjectPath(payload.path);
  const meta = JSON.parse(await fs.readFile(path.join(projectDir, 'project.json'), 'utf8'));
  const duration = Math.max(0, Number(meta.durationMs || 0));
  const trimStartMs = Math.min(duration, Math.max(0, Number(payload.edit?.trimStartMs ?? meta.edit?.trimStartMs ?? 0)));
  const trimEndMs = Math.min(duration, Math.max(trimStartMs, Number(payload.edit?.trimEndMs ?? meta.edit?.trimEndMs ?? duration)));

  meta.updatedAt = new Date().toISOString();
  meta.edit = { ...meta.edit, ...payload.edit, trimStartMs, trimEndMs };
  await writeProject(projectDir, meta);
  await fs.writeFile(path.join(projectDir, 'edits', 'timeline.json'), JSON.stringify(meta.edit, null, 2));
  await fs.appendFile(path.join(projectDir, 'edits', 'undo-log.jsonl'), JSON.stringify({ at: meta.updatedAt, edit: meta.edit }) + '\n');
  return await readProject(projectDir);
});

ipcMain.handle('projects:rename', async (_event, payload) => {
  const projectDir = assertProjectPath(payload.path);
  const meta = JSON.parse(await fs.readFile(path.join(projectDir, 'project.json'), 'utf8'));
  const title = safeProjectName(payload.title);
  if (!title) throw new Error('Video name is required');
  let targetDir = projectDir;
  if (path.basename(projectDir) !== title) {
    targetDir = await uniqueProjectDir(title);
    await renameWithRetry(projectDir, targetDir);
  }
  meta.title = title;
  meta.updatedAt = new Date().toISOString();
  await writeProject(targetDir, meta);
  log('Renamed project', `${projectDir} -> ${targetDir}`);
  return await readProject(targetDir);
});

ipcMain.handle('projects:delete', async (_event, projectPath) => {
  const projectDir = assertProjectPath(projectPath);
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: ['Delete', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    title: 'Delete Project',
    message: 'Delete this recording project?',
    detail: 'This moves the local project folder to the Recycle Bin.'
  });
  if (result.response !== 0) return false;
  await shell.trashItem(projectDir);
  return true;
});

ipcMain.handle('projects:export', async (_event, projectPath) => {
  const project = await readProject(projectPath);
  if (project.media?.mimeType?.startsWith('image/')) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export PNG',
      defaultPath: `${safeProjectName(project.title)}.png`,
      filters: [{ name: 'PNG image', extensions: ['png'] }]
    });
    if (result.canceled || !result.filePath) return null;
    await fs.copyFile(project.mediaPath, result.filePath);
    const meta = JSON.parse(await fs.readFile(path.join(project.path, 'project.json'), 'utf8'));
    meta.updatedAt = new Date().toISOString();
    meta.exports = [
      ...(meta.exports || []),
      { path: result.filePath, type: 'png', exportedAt: meta.updatedAt }
    ];
    await writeProject(project.path, meta);
    sendExportProgress(`${Date.now()}-${Math.random().toString(16).slice(2)}`, { state: 'done', percent: 100, message: 'Export complete' });
    log('Exported screenshot project', result.filePath);
    return { path: result.filePath };
  }
  const binary = resolveFfmpegPath();

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export MP4',
    defaultPath: `${safeProjectName(project.title)}.mp4`,
    filters: [{ name: 'MP4 video', extensions: ['mp4'] }]
  });
  if (result.canceled || !result.filePath) return null;

  const jobId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const startMs = Number(project.edit?.trimStartMs || 0);
  const endMs = Math.max(Number(project.edit?.trimEndMs || project.durationMs || 0), startMs);
  const startSec = Math.max(0, startMs / 1000);
  const durationSec = Math.max(0.1, (endMs - startMs) / 1000);
  const args = [
    '-y',
    '-ss', String(startSec),
    '-i', project.mediaPath,
    '-t', String(durationSec),
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '22',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '160k',
    '-movflags', '+faststart',
    result.filePath
  ];

  sendExportProgress(jobId, { state: 'running', percent: 0, message: 'Starting MP4 export' });

  await new Promise((resolve, reject) => {
    const child = spawn(binary, args, { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      const ms = ffmpegTimeToMs(text);
      if (ms !== null) {
        sendExportProgress(jobId, {
          state: 'running',
          percent: Math.min(99, Math.round((ms / (durationSec * 1000)) * 100)),
          message: 'Encoding MP4'
        });
      }
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.split(/\r?\n/).slice(-8).join('\n') || `FFmpeg exited with ${code}`));
    });
  });

  const meta = JSON.parse(await fs.readFile(path.join(project.path, 'project.json'), 'utf8'));
  meta.updatedAt = new Date().toISOString();
  meta.exports = [
    ...(meta.exports || []),
    { path: result.filePath, type: 'mp4', createdAt: meta.updatedAt }
  ];
  await writeProject(project.path, meta);
  sendExportProgress(jobId, { state: 'done', percent: 100, message: 'Export complete' });
  log('Exported project', result.filePath);
  return { path: result.filePath, jobId };
});

ipcMain.handle('minio:get-config', async () => {
  await ensureRoots();
  return await readMinioConfig();
});

ipcMain.handle('minio:save-config', async (_event, payload) => {
  await ensureRoots();
  const config = await mergedMinioConfig(payload);
  await fs.writeFile(minioConfigPath, JSON.stringify(config, null, 2));
  log('Saved MinIO config', `${config.endpoint} ${config.bucket}`);
  return publicMinioConfig(config);
});

ipcMain.handle('minio:test-config', async (_event, payload) => {
  await ensureRoots();
  const config = await mergedMinioConfig(payload);
  return await testMinioConfig(config);
});

ipcMain.handle('projects:upload-minio', async (_event, projectPath) => {
  await ensureRoots();
  const savedConfig = await readMinioConfig({ includeSecret: true });
  if (!savedConfig) throw new Error('MinIO is not configured');
  const config = normalizeMinioConfig(savedConfig);

  const project = await readProject(projectPath);
  const stat = await fs.stat(project.mediaPath);
  const key = projectUploadKey(project);
  const jobId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  sendUploadProgress(jobId, { state: 'running', percent: 0, message: 'Starting MinIO upload' });
  if (config.uploadMode === 'console-api') {
    await uploadViaConsoleApi(config, project, stat, key, jobId);
  } else {
    const client = createMinioS3Client(config);
    const uploader = new Upload({
      client,
      params: {
        Bucket: config.bucket,
        Key: key,
        Body: fss.createReadStream(project.mediaPath),
        ContentType: project.media?.mimeType || 'video/mp4',
        Metadata: {
          title: project.title,
          projectId: project.id
        }
      },
      queueSize: 4,
      partSize: 8 * 1024 * 1024
    });

    uploader.on('httpUploadProgress', (progress) => {
      const loaded = Number(progress.loaded || 0);
      const total = Number(progress.total || stat.size || 0);
      sendUploadProgress(jobId, {
        state: 'running',
        percent: total ? Math.min(99, Math.round((loaded / total) * 100)) : 0,
        message: 'Uploading to MinIO'
      });
    });

    await uploader.done();
  }
  const url = minioUploadUrl(config, key);
  const meta = JSON.parse(await fs.readFile(path.join(project.path, 'project.json'), 'utf8'));
  meta.updatedAt = new Date().toISOString();
  meta.uploads = [
    ...(meta.uploads || []),
    { provider: 'minio', bucket: config.bucket, key, url, sizeBytes: stat.size, uploadedAt: meta.updatedAt }
  ];
  await writeProject(project.path, meta);
  sendUploadProgress(jobId, { state: 'done', percent: 100, message: 'Upload complete' });
  log('Uploaded project to MinIO', `${config.bucket}/${key}`);
  return { bucket: config.bucket, key, url, sizeBytes: stat.size, jobId };
});

ipcMain.handle('projects:openFolder', async (_event, projectPath) => {
  const target = projectPath ? assertProjectPath(projectPath) : videoRoot;
  await shell.openPath(target);
});

ipcMain.handle('projects:openMedia', async (_event, projectPath) => {
  const project = await readProject(projectPath);
  const stat = await fs.stat(project.mediaPath);
  if (!stat.size) throw new Error('Project media file is empty');
  const error = await shell.openPath(project.mediaPath);
  if (error) throw new Error(error);
  log('Opened project media externally', project.mediaPath);
  return true;
});

ipcMain.handle('app:paths', async () => {
  await ensureRoots();
  return { appRoot, videoRoot, logRoot, ffmpegPath: resolveFfmpegPath() };
});

ipcMain.handle('window:hide-for-capture', async () => {
  return enterMiniRecorder();
});

ipcMain.handle('window:enter-mini-recorder', async () => {
  return enterMiniRecorder();
});

ipcMain.handle('window:show-after-capture', async () => {
  return exitMiniRecorder();
});

ipcMain.handle('window:hide-for-screenshot', async () => {
  return await hideWindowForScreenshot();
});

ipcMain.handle('window:show-after-screenshot', async () => {
  return showWindowAfterScreenshot();
});

ipcMain.handle('capture:select-region', async () => {
  if (process.env.SCREEN_STUDIO_SELF_TEST) {
    return {
      x: 0.1,
      y: 0.1,
      width: 0.8,
      height: 0.8
    };
  }
  if (guideWindow) guideWindow.close();
  return await new Promise((resolve) => {
    guideResolver = resolve;
    createGuideWindow();
  });
});

ipcMain.handle('capture:start-native', async (_event, payload = {}) => {
  await ensureRoots();
  if (activeNativeCapture) throw new Error('A recording is already running');
  const binary = resolveFfmpegPath();
  const captureConfig = payload.captureConfig || {};
  const profile = recordingProfile(captureConfig, payload);
  const rect = captureRect(captureConfig);
  const createdAt = new Date().toISOString();
  const projectDir = await uniqueProjectDir(payload.title || `Recording ${createdAt.slice(0, 19).replace(/[:T]/g, '-')}`);
  const mediaDir = path.join(projectDir, 'media');
  const editsDir = path.join(projectDir, 'edits');
  await fs.mkdir(mediaDir, { recursive: true });
  await fs.mkdir(editsDir, { recursive: true });
  const workingPath = path.join(mediaDir, 'capture-working.mkv');
  const outputPath = path.join(mediaDir, 'capture.mp4');
  const audioDevices = await listDshowAudioDevices();
  const audioDevice = pickAudioDevice(audioDevices, captureConfig);
  const pipeline = await detectCapturePipeline(binary, profile);
  const args = buildNativeCaptureArgs({ profile, rect, audioDevice, outputPath: workingPath, pipeline });

  const child = spawn(binary, args, {
    windowsHide: true,
    stdio: ['pipe', 'ignore', 'pipe']
  });
  const captureId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  activeNativeCapture = {
    id: captureId,
    process: child,
    projectDir,
    workingPath,
    outputPath,
    createdAt,
    startedAt: Date.now(),
    captureConfig: {
      ...captureConfig,
      quality: profile.quality,
      frameRate: profile.frameRate,
      videoPreset: profile.preset,
      videoCrf: Number(profile.crf),
      hardwareCq: Number(profile.hardwareCq),
      captureBackend: pipeline.backend,
      videoEncoder: pipeline.encoder
    },
    rect,
    audioDevice,
    audioKind: audioDevice ? classifyAudioDevice(audioDevice) : null,
    captureBackend: pipeline.backend,
    videoEncoder: pipeline.encoder,
    stderr: ''
  };
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    activeNativeCapture && (activeNativeCapture.stderr += text);
    log('FFmpeg capture', text.trim().slice(0, 500));
  });
  child.once('error', (error) => {
    if (activeNativeCapture?.id === captureId) activeNativeCapture = null;
    log('FFmpeg capture failed', error.message);
  });
  child.once('close', (code) => {
    if (activeNativeCapture?.id === captureId) {
      log('FFmpeg capture exited before stop', String(code));
      activeNativeCapture = null;
    }
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, 900);
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('exit', (code) => {
      if (code !== null && code !== 0 && code !== 255) {
        clearTimeout(timeout);
        reject(new Error(activeNativeCapture?.stderr || `FFmpeg exited with ${code}`));
      }
    });
  });

  return {
    id: captureId,
    rect,
    projectDir,
    audioDevice,
    audioKind: audioDevice ? classifyAudioDevice(audioDevice) : null,
    captureBackend: pipeline.backend,
    videoEncoder: pipeline.encoder,
    audioDevices: audioDevices.map((device) => ({ name: device, kind: classifyAudioDevice(device) }))
  };
});

ipcMain.handle('capture:audio-devices', async () => {
  const devices = await listDshowAudioDevices();
  return devices.map((device) => ({ name: device, kind: classifyAudioDevice(device) }));
});

ipcMain.handle('capture:diagnostics', async () => {
  await ensureRoots();
  const ffmpegAvailable = (() => {
    try {
      return fss.existsSync(resolveFfmpegPath());
    } catch {
      return false;
    }
  })();
  const audioDevices = await listDshowAudioDevices();
  const minio = await readMinioConfig();
  return {
    ffmpegAvailable,
    ffmpegPath: ffmpegAvailable ? resolveFfmpegPath() : '',
    pipeline: await readCachedCapturePipeline(),
    audioDevices: audioDevices.map((device) => ({ name: device, kind: classifyAudioDevice(device) })),
    minio,
    activeCapture: activeNativeCapture ? {
      id: activeNativeCapture.id,
      startedAt: activeNativeCapture.startedAt,
      captureBackend: activeNativeCapture.captureBackend,
      videoEncoder: activeNativeCapture.videoEncoder,
      audioDevice: activeNativeCapture.audioDevice || ''
    } : null
  };
});

ipcMain.handle('capture:stop-native', async (_event, captureId, audioPayload = null) => {
  if (!activeNativeCapture) return null;
  if (captureId && activeNativeCapture.id !== captureId) throw new Error('Recording session mismatch');
  return await stopNativeCapture(audioPayload);
});

ipcMain.handle('overlay:region-selected', async (_event, region) => {
  if (guideResolver) {
    guideResolver(region);
    guideResolver = null;
  }
  guideWindow?.close();
  return true;
});

ipcMain.handle('overlay:cancel', async () => {
  if (guideResolver) {
    guideResolver(null);
    guideResolver = null;
  }
  guideWindow?.close();
  return true;
});

ipcMain.handle('selftest:complete', async (_event, payload) => {
  await ensureRoots();
  const result = {
    ...payload,
    completedAt: new Date().toISOString()
  };
  await fs.writeFile(path.join(logRoot, 'selftest.json'), JSON.stringify(result, null, 2));
  log('Self-test complete', JSON.stringify(result));
  if (process.env.SCREEN_STUDIO_SELF_TEST) {
    setTimeout(() => {
      isQuitting = true;
      app.quit();
    }, 500);
  }
  return true;
});

app.on('second-instance', showWindow);

app.whenReady().then(async () => {
  await ensureRoots();
  app.setName(appBrandName);
  setupDisplayMediaHandler();
  createMenu();
  createWindow();
  createTray();
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    mainWindow?.webContents.send('app:stop-recording');
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    showWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  if (activeNativeCapture) {
    try {
      activeNativeCapture.process.stdin.write('q');
      activeNativeCapture.process.stdin.end();
    } catch {
      activeNativeCapture.process.kill('SIGTERM');
    }
  }
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});
