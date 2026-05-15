const projectList = document.getElementById('projectList');
const projectRoot = document.getElementById('projectRoot');
const projectBrowser = document.querySelector('.project-browser');
const projectResizeHandle = document.getElementById('projectResizeHandle');
const activeTitle = document.getElementById('activeTitle');
const activeMeta = document.getElementById('activeMeta');
const preview = document.getElementById('preview');
const imagePreview = document.getElementById('imagePreview');
const recordCanvas = document.getElementById('recordCanvas');
const regionOverlay = document.getElementById('regionOverlay');
const regionBox = document.getElementById('regionBox');
const countdownOverlay = document.getElementById('countdownOverlay');
const emptyState = document.getElementById('emptyState');
const startCapture = document.getElementById('startCapture');
const pauseCapture = document.getElementById('pauseCapture');
const stopCapture = document.getElementById('stopCapture');
const topPlayPreview = document.getElementById('topPlayPreview');
const topStopPreview = document.getElementById('topStopPreview');
const topStartCapture = document.getElementById('topStartCapture');
const topStopCapture = document.getElementById('topStopCapture');
const toggleTheme = document.getElementById('toggleTheme');
const toggleMinimalMode = document.getElementById('toggleMinimalMode');
const dockPlayPreview = document.getElementById('dockPlayPreview');
const dockStopPreview = document.getElementById('dockStopPreview');
const stagePlayPreview = document.getElementById('stagePlayPreview');
const stageStopPreview = document.getElementById('stageStopPreview');
const stageStartCapture = document.getElementById('stageStartCapture');
const stageStopCapture = document.getElementById('stageStopCapture');
const recordDot = document.getElementById('recordDot');
const recordStatusText = document.getElementById('recordStatusText');
const recordTimer = document.getElementById('recordTimer');
const exportProject = document.getElementById('exportProject');
const uploadProject = document.getElementById('uploadProject');
const minioSettings = document.getElementById('minioSettings');
const projectActionsMenu = document.getElementById('projectActionsMenu');
const openFolder = document.getElementById('openFolder');
const renameProject = document.getElementById('renameProject');
const dockRenameProject = document.getElementById('dockRenameProject');
const stageRenameProject = document.getElementById('stageRenameProject');
const deleteProject = document.getElementById('deleteProject');
const refreshProjects = document.getElementById('refreshProjects');
const newRecording = document.getElementById('newRecording');
const takeScreenshot = document.getElementById('takeScreenshot');
const captureMode = document.getElementById('captureMode');
const systemAudio = document.getElementById('systemAudio');
const micAudio = document.getElementById('micAudio');
const micDevice = document.getElementById('micDevice');
const countdown = document.getElementById('countdown');
const recordingQuality = document.getElementById('recordingQuality');
const trimStart = document.getElementById('trimStart');
const trimEnd = document.getElementById('trimEnd');
const trimStartText = document.getElementById('trimStartText');
const trimEndText = document.getElementById('trimEndText');
const playbackRate = document.getElementById('playbackRate');
const watermarkText = document.getElementById('watermarkText');
const captionText = document.getElementById('captionText');
const saveTools = document.getElementById('saveTools');
const timelineFill = document.getElementById('timelineFill');
const previewTimeline = document.getElementById('previewTimeline');
const previewCurrentTime = document.getElementById('previewCurrentTime');
const previewDuration = document.getElementById('previewDuration');
const miniRecorder = document.getElementById('miniRecorder');
const miniRecorderTitle = document.getElementById('miniRecorderTitle');
const miniRecorderMeta = document.getElementById('miniRecorderMeta');
const miniAnnotationToggle = document.getElementById('miniAnnotationToggle');
const miniStopCapture = document.getElementById('miniStopCapture');
const jobPanel = document.getElementById('jobPanel');
const jobText = document.getElementById('jobText');
const jobProgress = document.getElementById('jobProgress');
const healthEncoder = document.getElementById('healthEncoder');
const healthAudio = document.getElementById('healthAudio');
const healthFfmpeg = document.getElementById('healthFfmpeg');
const healthMinio = document.getElementById('healthMinio');
const minioDialog = document.getElementById('minioDialog');
const minioForm = document.getElementById('minioForm');
const closeMinioSettings = document.getElementById('closeMinioSettings');
const testMinioSettings = document.getElementById('testMinioSettings');
const minioEndpoint = document.getElementById('minioEndpoint');
const minioBucket = document.getElementById('minioBucket');
const minioAccessKey = document.getElementById('minioAccessKey');
const minioSecretKey = document.getElementById('minioSecretKey');
const minioRegion = document.getElementById('minioRegion');
const minioUploadMode = document.getElementById('minioUploadMode');
const minioPublicBaseUrl = document.getElementById('minioPublicBaseUrl');
const minioSettingsStatus = document.getElementById('minioSettingsStatus');
const projectTabs = Array.from(document.querySelectorAll('.project-tab'));

let projects = [];
let activeProject = null;
let projectTab = 'all';
let projectRenderLimit = 80;
let mediaRecorder = null;
let recordingChunks = [];
let recordingStartedAt = 0;
let pausedMs = 0;
let pausedAt = 0;
let timerHandle = null;
let displayStream = null;
let micStream = null;
let mixedStream = null;
let canvasStream = null;
let sourceVideo = null;
let drawFrameHandle = null;
let audioContext = null;
let audioDestination = null;
let selectedRegion = null;
let regionDrag = null;
let recorderState = 'idle';
let nativeCaptureSession = null;
let scrubbingPreview = false;
let lastMiniRecorderCheck = null;
let minioConfig = null;
let nativeAudioRecorder = null;
let nativeAudioChunks = [];
let nativeAudioStreams = [];
let nativeAudioContext = null;
let nativeAudioDestination = null;
let nativeAudioStartedAt = 0;
let nativeAudioFlags = null;
let jobHideTimer = null;
let lastCountdownCheck = null;
let lastAnnotationCheck = null;
let annotationInputEnabled = true;
const selfTestMode = new URLSearchParams(window.location.search).get('selftest') === '1';
const projectBrowserHeightKey = 'screenStudio.projectBrowserHeight';
const previewHeightKey = 'screenStudio.previewHeight';
const themeKey = 'screenStudio.theme';
const baseProjectRenderLimit = 80;
const projectRenderBatchSize = 60;
const resizeMinPreviewHeight = 220;

preview.controls = false;
preview.disablePictureInPicture = true;
preview.controlsList = 'nodownload nofullscreen noremoteplayback';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function formatSize(bytes) {
  if (!bytes) return '0 MB';
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, Number(value || 0)));
}

function setProjectBrowserSize(projectHeight, previewHeight, persist = true) {
  const maxProjectHeight = Math.max(180, Math.min(Math.round(window.innerHeight * 0.68), 680));
  const nextProjectHeight = clampNumber(projectHeight, 160, maxProjectHeight);
  const nextPreviewHeight = clampNumber(previewHeight, resizeMinPreviewHeight, Math.max(360, Math.round(window.innerHeight * 0.76)));
  document.documentElement.style.setProperty('--project-browser-height', `${Math.round(nextProjectHeight)}px`);
  document.documentElement.style.setProperty('--preview-height', `${Math.round(nextPreviewHeight)}px`);
  projectResizeHandle.setAttribute('aria-valuemin', '160');
  projectResizeHandle.setAttribute('aria-valuemax', String(maxProjectHeight));
  projectResizeHandle.setAttribute('aria-valuenow', String(Math.round(nextProjectHeight)));
  if (persist) {
    localStorage.setItem(projectBrowserHeightKey, String(Math.round(nextProjectHeight)));
    localStorage.setItem(previewHeightKey, String(Math.round(nextPreviewHeight)));
  }
}

function persistProjectBrowserSize() {
  localStorage.setItem(projectBrowserHeightKey, String(Math.round(projectBrowser.getBoundingClientRect().height)));
  localStorage.setItem(previewHeightKey, String(Math.round(document.querySelector('.stage').getBoundingClientRect().height)));
}

function loadProjectBrowserSize() {
  const projectHeight = Number(localStorage.getItem(projectBrowserHeightKey));
  const previewHeight = Number(localStorage.getItem(previewHeightKey));
  if (Number.isFinite(projectHeight) && projectHeight > 0 && Number.isFinite(previewHeight) && previewHeight > 0) {
    setProjectBrowserSize(projectHeight, previewHeight, false);
  }
}

function setTheme(theme, persist = true) {
  const dark = theme === 'dark';
  document.body.classList.toggle('dark-theme', dark);
  toggleTheme.textContent = dark ? 'Light' : 'Dark';
  toggleTheme.setAttribute('aria-pressed', dark ? 'true' : 'false');
  if (persist) localStorage.setItem(themeKey, dark ? 'dark' : 'light');
}

function loadTheme() {
  setTheme(localStorage.getItem(themeKey) === 'dark' ? 'dark' : 'light', false);
}

function toggleAppTheme() {
  setTheme(document.body.classList.contains('dark-theme') ? 'light' : 'dark');
}

function mediaUrl(filePath) {
  return `file:///${filePath.replace(/\\/g, '/')}`;
}

function isImageProject(project = activeProject) {
  return Boolean(project?.media?.mimeType?.startsWith('image/'));
}

function projectMatchesTab(project) {
  if (projectTab === 'videos') return !isImageProject(project);
  if (projectTab === 'images') return isImageProject(project);
  return true;
}

function setProjectTab(tab) {
  projectTab = tab || 'all';
  projectRenderLimit = baseProjectRenderLimit;
  projectTabs.forEach((button) => {
    const active = button.dataset.projectTab === projectTab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  renderProjects();
  requestAnimationFrame(() => {
    projectList.scrollTop = 0;
  });
}

function visibleProjectsForCurrentTab() {
  return projects.filter(projectMatchesTab);
}

function updateProjectSelectionStyles() {
  projectList.querySelectorAll('.project-row').forEach((row) => {
    const active = row.dataset.projectId === activeProject?.id;
    row.classList.toggle('active', active);
  });
  projectList.querySelectorAll('.project-main').forEach((button) => {
    const active = button.dataset.projectId === activeProject?.id;
    button.classList.toggle('active', active);
  });
}

function renderMoreProjectsIfNeeded() {
  const visibleProjects = visibleProjectsForCurrentTab();
  if (projectRenderLimit >= visibleProjects.length) return;
  projectRenderLimit = Math.min(projectRenderLimit + projectRenderBatchSize, visibleProjects.length);
  const scrollTop = projectList.scrollTop;
  renderProjects();
  projectList.scrollTop = scrollTop;
}

function startProjectResize(event) {
  if (document.body.classList.contains('minimal-ui')) return;
  event.preventDefault();
  const startY = event.clientY;
  const startProjectHeight = projectBrowser.getBoundingClientRect().height;
  const startPreviewHeight = document.querySelector('.stage').getBoundingClientRect().height;
  let pendingDelta = 0;
  let resizeFrame = 0;
  projectBrowser.classList.add('resizing');
  document.body.classList.add('split-resizing');
  projectResizeHandle.setPointerCapture?.(event.pointerId);

  function applyResizeFrame() {
    resizeFrame = 0;
    setProjectBrowserSize(startProjectHeight + pendingDelta, startPreviewHeight - pendingDelta, false);
  }

  function onPointerMove(moveEvent) {
    pendingDelta = startY - moveEvent.clientY;
    if (!resizeFrame) resizeFrame = requestAnimationFrame(applyResizeFrame);
  }

  function stopResize() {
    if (resizeFrame) {
      cancelAnimationFrame(resizeFrame);
      applyResizeFrame();
    }
    persistProjectBrowserSize();
    projectBrowser.classList.remove('resizing');
    document.body.classList.remove('split-resizing');
    projectResizeHandle.releasePointerCapture?.(event.pointerId);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stopResize);
    window.removeEventListener('pointercancel', stopResize);
  }

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', stopResize, { once: true });
  window.addEventListener('pointercancel', stopResize, { once: true });
}

function nudgeProjectBrowser(delta, persist = true) {
  const projectHeight = projectBrowser.getBoundingClientRect().height;
  const previewHeight = document.querySelector('.stage').getBoundingClientRect().height;
  setProjectBrowserSize(projectHeight + delta, previewHeight - delta, persist);
}

function setStatus(text) {
  activeMeta.textContent = text;
}

function askTextDialog({ title, label, initialValue = '', inputType = 'text', allowEmpty = false }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';

    const form = document.createElement('form');
    form.className = 'text-dialog';

    const heading = document.createElement('h2');
    heading.textContent = title;

    const fieldLabel = document.createElement('label');
    fieldLabel.textContent = label;

    const input = document.createElement('input');
    input.type = inputType;
    input.value = initialValue;
    input.autocomplete = 'off';
    input.spellcheck = false;

    const actions = document.createElement('div');
    actions.className = 'dialog-actions';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'secondary-action';
    cancelButton.textContent = 'Cancel';

    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.className = 'primary-action';
    saveButton.textContent = 'Save';

    function close(value) {
      document.removeEventListener('keydown', onKeyDown);
      backdrop.remove();
      resolve(value);
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') close(null);
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = input.value.trim();
      if (!allowEmpty && !value) {
        input.focus();
        return;
      }
      close(value);
    });
    cancelButton.addEventListener('click', () => close(null));
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) close(null);
    });
    document.addEventListener('keydown', onKeyDown);

    fieldLabel.appendChild(input);
    actions.append(cancelButton, saveButton);
    form.append(heading, fieldLabel, actions);
    backdrop.appendChild(form);
    document.body.appendChild(backdrop);
    input.focus();
    input.select();
  });
}

function showPostRecordDialog(project, options = {}) {
  if (!project || (selfTestMode && !options.test)) return null;

  const backdrop = document.createElement('div');
  backdrop.className = 'dialog-backdrop';

  const dialog = document.createElement('section');
  dialog.className = 'text-dialog post-record-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'postRecordTitle');

  const title = document.createElement('h2');
  title.id = 'postRecordTitle';
  title.textContent = 'Recording Saved';

  const summary = document.createElement('div');
  summary.className = 'record-save-summary';

  const summaryTitle = document.createElement('strong');
  summaryTitle.textContent = project.title;

  const summaryMeta = document.createElement('span');
  summaryMeta.textContent = `${formatDuration(project.durationMs || 0)} · ${formatSize(project.sizeBytes || 0)}`;

  const summaryAutosave = document.createElement('small');
  summaryAutosave.textContent = 'Realtime autosave is already active: the recorder writes a crash-safe working MKV while recording, then finalizes the MP4 when you stop.';

  summary.append(summaryTitle, summaryMeta, summaryAutosave);

  const primaryActions = document.createElement('div');
  primaryActions.className = 'post-record-actions';

  const exportButton = document.createElement('button');
  exportButton.type = 'button';
  exportButton.className = 'primary-action';
  exportButton.textContent = 'Export / Save Local';

  const uploadButton = document.createElement('button');
  uploadButton.type = 'button';
  uploadButton.className = 'secondary-action';
  uploadButton.textContent = 'Upload to Cloud';

  const openButton = document.createElement('button');
  openButton.type = 'button';
  openButton.className = 'secondary-action';
  openButton.textContent = 'Open Video';

  const folderButton = document.createElement('button');
  folderButton.type = 'button';
  folderButton.className = 'secondary-action';
  folderButton.textContent = 'Open Folder';

  const closeRow = document.createElement('div');
  closeRow.className = 'dialog-actions';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'secondary-action';
  closeButton.textContent = 'Close';

  function close() {
    document.removeEventListener('keydown', onKeyDown);
    backdrop.remove();
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') close();
  }

  exportButton.addEventListener('click', async () => {
    await exportProjectByProject(project);
  });
  uploadButton.addEventListener('click', async () => {
    await uploadProjectByProject(project);
  });
  openButton.addEventListener('click', async () => {
    await window.screenStudio.openMedia(project.path).catch((error) => {
      showJob(error.message || 'Open video failed', 0, 'error');
    });
  });
  folderButton.addEventListener('click', async () => {
    await window.screenStudio.openFolder(project.path).catch((error) => {
      showJob(error.message || 'Open folder failed', 0, 'error');
    });
  });
  closeButton.addEventListener('click', close);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });
  document.addEventListener('keydown', onKeyDown);

  primaryActions.append(exportButton, uploadButton, openButton, folderButton);
  closeRow.appendChild(closeButton);
  dialog.append(title, summary, primaryActions, closeRow);
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  exportButton.focus();
  return backdrop;
}

function showCloudUploadDialog(uploaded, project, options = {}) {
  if (!uploaded?.url || (selfTestMode && !options.test)) return null;

  const backdrop = document.createElement('div');
  backdrop.className = 'dialog-backdrop';

  const dialog = document.createElement('section');
  dialog.className = 'text-dialog cloud-upload-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'cloudUploadTitle');

  const title = document.createElement('h2');
  title.id = 'cloudUploadTitle';
  title.textContent = 'Cloud Link Ready';

  const summary = document.createElement('div');
  summary.className = 'record-save-summary cloud-upload-summary';

  const summaryTitle = document.createElement('strong');
  summaryTitle.textContent = project?.title || 'Uploaded project';

  const summaryMeta = document.createElement('span');
  summaryMeta.textContent = `${uploaded.bucket || 'Cloud'} · ${formatSize(uploaded.sizeBytes || project?.sizeBytes || 0)}`;

  const urlLabel = document.createElement('label');
  urlLabel.className = 'cloud-url-label';
  urlLabel.textContent = 'Preview and download URL';

  const urlInput = document.createElement('input');
  urlInput.className = 'cloud-url-input';
  urlInput.type = 'url';
  urlInput.readOnly = true;
  urlInput.value = uploaded.url;
  urlInput.setAttribute('aria-label', 'Cloud preview and download URL');

  urlLabel.appendChild(urlInput);
  summary.append(summaryTitle, summaryMeta, urlLabel);

  const actions = document.createElement('div');
  actions.className = 'cloud-url-actions';

  const previewButton = document.createElement('button');
  previewButton.type = 'button';
  previewButton.className = 'primary-action';
  previewButton.textContent = 'Preview';

  const downloadButton = document.createElement('button');
  downloadButton.type = 'button';
  downloadButton.className = 'secondary-action';
  downloadButton.textContent = 'Download';

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.className = 'secondary-action';
  copyButton.textContent = 'Copy URL';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'secondary-action';
  closeButton.textContent = 'Close';

  function close() {
    document.removeEventListener('keydown', onKeyDown);
    backdrop.remove();
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') close();
  }

  previewButton.addEventListener('click', async () => {
    await window.screenStudio.openExternalUrl(uploaded.url).catch((error) => {
      showJob(error.message || 'Unable to open Cloud preview', 0, 'error');
    });
  });
  downloadButton.addEventListener('click', async () => {
    await window.screenStudio.downloadUrl(uploaded.url).then(() => {
      showJob('Cloud download started', 100, 'done');
      hideJobSoon();
    }).catch(async (error) => {
      await window.screenStudio.openExternalUrl(uploaded.url).catch(() => {
        showJob(error.message || 'Unable to download Cloud file', 0, 'error');
      });
    });
  });
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(uploaded.url);
      showJob('Cloud URL copied', 100, 'done');
      hideJobSoon();
    } catch {
      urlInput.focus();
      urlInput.select();
      showJob('Cloud URL selected', 100, 'done');
      hideJobSoon();
    }
  });
  closeButton.addEventListener('click', close);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });
  document.addEventListener('keydown', onKeyDown);

  actions.append(previewButton, downloadButton, copyButton, closeButton);
  dialog.append(title, summary, actions);
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  urlInput.focus();
  urlInput.select();
  return backdrop;
}

function hideCountdownOverlay() {
  countdownOverlay.hidden = true;
  countdownOverlay.textContent = '';
}

function updatePlaybackControls() {
  preview.controls = false;
  const hasPlayableProject = Boolean(activeProject && !isImageProject() && preview.src && !preview.srcObject);
  const playLabel = hasPlayableProject && !preview.paused && !preview.ended ? 'Pause' : 'Play';
  topPlayPreview.disabled = !hasPlayableProject;
  topStopPreview.disabled = !hasPlayableProject;
  dockPlayPreview.disabled = !hasPlayableProject;
  dockStopPreview.disabled = !hasPlayableProject;
  stagePlayPreview.disabled = !hasPlayableProject;
  stageStopPreview.disabled = !hasPlayableProject;
  topPlayPreview.textContent = playLabel;
  dockPlayPreview.textContent = playLabel;
  stagePlayPreview.textContent = playLabel;
}

function updatePreviewTimeline() {
  const durationMs = Number.isFinite(preview.duration) && preview.duration > 0
    ? Math.round(preview.duration * 1000)
    : Math.max(0, Number(activeProject?.durationMs || 0));
  const currentMs = Number.isFinite(preview.currentTime) ? Math.round(preview.currentTime * 1000) : 0;
  const hasTimeline = Boolean(activeProject && !isImageProject() && preview.src && !preview.srcObject && durationMs > 0);
  previewTimeline.disabled = !hasTimeline;
  previewTimeline.max = String(durationMs);
  if (!scrubbingPreview) previewTimeline.value = String(Math.min(durationMs, currentMs));
  previewCurrentTime.textContent = formatDuration(Math.min(durationMs, currentMs));
  previewDuration.textContent = formatDuration(durationMs);
}

async function playOrPausePreview() {
  if (!activeProject || isImageProject() || !preview.src || preview.srcObject) return;
  hideCountdownOverlay();
  if (!preview.paused && !preview.ended) {
    preview.pause();
    updatePlaybackControls();
    return;
  }
  try {
    await preview.play();
    updatePlaybackControls();
  } catch (error) {
    setStatus(error.message || 'Unable to play video preview');
  }
}

function stopPreviewPlayback() {
  if (!activeProject || isImageProject() || !preview.src || preview.srcObject) return;
  hideCountdownOverlay();
  preview.pause();
  preview.currentTime = 0;
  updatePreviewTimeline();
  updatePlaybackControls();
}

async function verifyPlaybackControls() {
  await new Promise((resolve) => requestAnimationFrame(resolve));
  updatePlaybackControls();
  const buttons = [topPlayPreview, topStopPreview, dockPlayPreview, dockStopPreview];
  const visible = buttons.every((button) => {
    const rect = button.getBoundingClientRect();
    return rect.width > 20 && rect.height > 20;
  });
  if (!visible) throw new Error('Playback controls are not visible');
  if (buttons.some((button) => button.disabled)) {
    throw new Error(`Playback controls are disabled after selecting a project: ${JSON.stringify({
      activeProject: activeProject?.title,
      mimeType: activeProject?.media?.mimeType,
      previewSrc: Boolean(preview.src),
      srcObject: Boolean(preview.srcObject),
      disabled: buttons.map((button) => button.disabled)
    })}`);
  }
  if (preview.controls) throw new Error('Native video controls are visible in the stage preview');
  projectActionsMenu.open = true;
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const uploadVisible = uploadProject.getBoundingClientRect().width > 40 && !uploadProject.disabled;
  if (!uploadVisible) throw new Error('Upload button is not visible after selecting a project');
  const projectMenuVisible = projectActionsMenu.getBoundingClientRect().width > 40;
  if (!projectMenuVisible) throw new Error('Project actions menu is not visible');
  const externalOpenVisible = Array.from(document.querySelectorAll('.project-open')).some((button) => {
    const rect = button.getBoundingClientRect();
    return rect.width > 20 && rect.height > 20;
  });
  if (!externalOpenVisible) throw new Error('External open button is not visible in the project browser');
  const projectDeleteVisible = Array.from(document.querySelectorAll('.project-delete')).some((button) => {
    const rect = button.getBoundingClientRect();
    return rect.width > 40 && rect.height > 20;
  });
  if (!projectDeleteVisible) throw new Error('Project delete button is not visible in the project browser');
  const projectThumbnailVisible = Array.from(document.querySelectorAll('.project-thumb')).some((thumb) => {
    const rect = thumb.getBoundingClientRect();
    return rect.width > 80 && rect.height > 40;
  });
  if (!projectThumbnailVisible) throw new Error('Project thumbnail grid is not visible');
  await new Promise((resolve, reject) => {
    if (preview.readyState >= 1) {
      resolve();
      return;
    }
    const timeout = setTimeout(() => {
      reject(new Error('Preview video metadata did not load'));
    }, 5000);
    preview.addEventListener('loadedmetadata', () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
    preview.addEventListener('error', () => {
      clearTimeout(timeout);
      reject(new Error('Preview video failed to load'));
    }, { once: true });
    preview.load();
  });
  await playOrPausePreview();
  await new Promise((resolve) => setTimeout(resolve, 250));
  const played = !preview.paused || preview.currentTime > 0;
  updatePreviewTimeline();
  const timeline = previewTimelineMetrics();
  if (!timeline.visible || timeline.disabled || timeline.max <= 0) throw new Error(`Preview timeline is not ready: ${JSON.stringify(timeline)}`);
  stopPreviewPlayback();
  if (!played) throw new Error('Preview video did not respond to Play');
  return {
    visible,
    uploadVisible,
    externalOpenVisible,
    timeline,
    projectMenuVisible,
    topPlayLabel: topPlayPreview.textContent,
    dockPlayLabel: dockPlayPreview.textContent,
    stoppedAt: preview.currentTime
  };
}

function previewFrameMetrics() {
  const stage = document.querySelector('.stage');
  const workspace = document.querySelector('.workspace');
  const stageRect = stage.getBoundingClientRect();
  const previewRect = preview.getBoundingClientRect();
  const imageRect = imagePreview.getBoundingClientRect();
  const workspaceRect = workspace.getBoundingClientRect();
  return {
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    workspaceWidth: Math.round(workspaceRect.width),
    stageHeight: Math.round(stageRect.height),
    stageWidth: Math.round(stageRect.width),
    previewHeight: Math.round(previewRect.height),
    imagePreviewHeight: Math.round(imageRect.height),
    minimalUi: document.body.classList.contains('minimal-ui')
  };
}

function sectionOverlapMetrics() {
  const selectors = ['.topbar', '.stage', '.playback-panel', '.project-browser', '.record-panel', '.editor-panel', '.tools-panel'];
  const rects = selectors.map((selector) => {
    const rect = document.querySelector(selector).getBoundingClientRect();
    return {
      selector,
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  });
  const overlaps = [];
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      const a = rects[i];
      const b = rects[j];
      const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      if (width * height > 4) overlaps.push({ a: a.selector, b: b.selector, area: width * height });
    }
  }
  return { rects, overlaps };
}

async function verifyFixedPreviewFrame() {
  const before = previewFrameMetrics();
  window.resizeTo(1180, 720);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const after = previewFrameMetrics();
  const layout = sectionOverlapMetrics();
  const cleanLayout = [before, after].every((metrics) => (
    metrics.workspaceWidth >= 520 &&
    metrics.stageWidth >= 520 &&
    metrics.stageHeight >= resizeMinPreviewHeight &&
    metrics.stageHeight <= 620 &&
    Math.abs(metrics.stageHeight - metrics.previewHeight) <= 1
  )) && layout.overlaps.length === 0;
  if (!cleanLayout) {
    throw new Error(`Preview frame did not adapt cleanly: ${JSON.stringify({ before, after, layout })}`);
  }
  return { expected: 'responsive-no-overlap', before, after, layout };
}

async function verifyMinimalUi() {
  setMinimalUi(true);
  await new Promise((resolve) => setTimeout(resolve, 150));
  const minimal = previewFrameMetrics();
  const sidebarRect = document.querySelector('.sidebar').getBoundingClientRect();
  const controlsRect = document.querySelector('.playback-panel').getBoundingClientRect();
  if (
    !document.body.classList.contains('minimal-ui') ||
    sidebarRect.width !== 0 ||
    controlsRect.width < 300 ||
    toggleMinimalMode.textContent !== 'Full App' ||
    minimal.stageHeight < 320
  ) {
    throw new Error(`Minimal UI did not activate cleanly: ${JSON.stringify({ minimal, sidebarWidth: sidebarRect.width, controlsWidth: controlsRect.width })}`);
  }
  setMinimalUi(false);
  await new Promise((resolve) => setTimeout(resolve, 150));
  const restored = previewFrameMetrics();
  if (document.body.classList.contains('minimal-ui') || toggleMinimalMode.textContent !== 'Minimal') {
    throw new Error(`Minimal UI did not restore cleanly: ${JSON.stringify({ restored })}`);
  }
  return { minimal, restored };
}

async function verifyProjectBrowserResize() {
  window.resizeTo(1380, 900);
  await new Promise((resolve) => setTimeout(resolve, 220));
  setProjectBrowserSize(220, 480, false);
  await new Promise((resolve) => setTimeout(resolve, 120));
  const beforeProjectHeight = projectBrowser.getBoundingClientRect().height;
  const beforeStageHeight = document.querySelector('.stage').getBoundingClientRect().height;
  nudgeProjectBrowser(130, false);
  await new Promise((resolve) => setTimeout(resolve, 160));
  const afterProjectHeight = projectBrowser.getBoundingClientRect().height;
  const afterStageHeight = document.querySelector('.stage').getBoundingClientRect().height;
  const handleRect = projectResizeHandle.getBoundingClientRect();
  const layout = sectionOverlapMetrics();
  if (
    handleRect.height < 8 ||
    afterProjectHeight < beforeProjectHeight + 90 ||
    afterStageHeight > beforeStageHeight - 90 ||
    layout.overlaps.length > 0
  ) {
    throw new Error(`Project browser resize failed: ${JSON.stringify({ beforeProjectHeight, beforeStageHeight, afterProjectHeight, afterStageHeight, handleHeight: handleRect.height, layout })}`);
  }
  return {
    beforeProjectHeight: Math.round(beforeProjectHeight),
    afterProjectHeight: Math.round(afterProjectHeight),
    beforeStageHeight: Math.round(beforeStageHeight),
    afterStageHeight: Math.round(afterStageHeight),
    handleVisible: handleRect.width > 80 && handleRect.height >= 8,
    layout
  };
}

async function verifyThemeToggle() {
  setTheme('dark', false);
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const dark = {
    enabled: document.body.classList.contains('dark-theme'),
    buttonLabel: toggleTheme.textContent,
    background: getComputedStyle(document.body).backgroundColor || getComputedStyle(document.body).background,
    topbar: getComputedStyle(document.querySelector('.topbar')).backgroundColor,
    sidebar: getComputedStyle(document.querySelector('.sidebar')).backgroundColor
  };
  setTheme('light', false);
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const restored = {
    enabled: !document.body.classList.contains('dark-theme'),
    buttonLabel: toggleTheme.textContent
  };
  if (!dark.enabled || dark.buttonLabel !== 'Light' || !restored.enabled || restored.buttonLabel !== 'Dark') {
    throw new Error(`Dark theme toggle failed: ${JSON.stringify({ dark, restored })}`);
  }
  return { dark, restored };
}

async function verifyMinioSettingsDialog() {
  await openMinioSettings();
  await new Promise((resolve) => setTimeout(resolve, 120));
  const dialogRect = minioForm.getBoundingClientRect();
  const saveButton = minioForm.querySelector('button[type="submit"]');
  const result = {
    visible: !minioDialog.hidden && dialogRect.width > 420 && dialogRect.height > 260,
    endpointPresent: minioEndpoint.value.length > 0,
    bucketPresent: minioBucket.value.length > 0,
    accessKeyPresent: minioAccessKey.value.length > 0,
    testButtonVisible: testMinioSettings.getBoundingClientRect().width > 40,
    saveButtonVisible: saveButton?.getBoundingClientRect().width > 40,
    mode: minioUploadMode.value,
    status: minioSettingsStatus.textContent
  };
  closeMinioSettingsDialog();
  if (!result.visible || !result.endpointPresent || !result.bucketPresent || !result.testButtonVisible || !result.saveButtonVisible) {
    throw new Error(`Cloud settings dialog is not usable: ${JSON.stringify(result)}`);
  }
  return result;
}

async function verifyPostRecordDialog(project) {
  const dialog = showPostRecordDialog(project, { test: true });
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const actions = Array.from(dialog.querySelectorAll('.post-record-actions button')).map((button) => button.textContent);
  const summary = dialog.querySelector('.record-save-summary');
  const result = {
    visible: dialog.querySelector('.post-record-dialog')?.getBoundingClientRect().width > 400,
    actions,
    hasRealtimeAutosaveText: /Realtime autosave/i.test(summary?.textContent || '')
  };
  dialog.querySelector('.dialog-actions button')?.click();
  if (!result.visible || !actions.includes('Export / Save Local') || !actions.includes('Upload to Cloud') || !actions.includes('Open Video') || !actions.includes('Open Folder') || !result.hasRealtimeAutosaveText) {
    throw new Error(`Post-record dialog is not usable: ${JSON.stringify(result)}`);
  }
  return result;
}

async function verifyCloudUploadDialog(upload, project) {
  const dialog = showCloudUploadDialog(upload, project, { test: true });
  await new Promise((resolve) => setTimeout(resolve, 120));
  const actions = Array.from(dialog.querySelectorAll('.cloud-url-actions button')).map((button) => button.textContent);
  const urlInput = dialog.querySelector('.cloud-url-input');
  const result = {
    visible: dialog.querySelector('.cloud-upload-dialog')?.getBoundingClientRect().width > 440,
    actions,
    url: urlInput?.value || ''
  };
  actions.includes('Close') && Array.from(dialog.querySelectorAll('.cloud-url-actions button')).find((button) => button.textContent === 'Close')?.click();
  if (!result.visible || !result.url.startsWith('http') || !actions.includes('Preview') || !actions.includes('Download') || !actions.includes('Copy URL')) {
    throw new Error(`Cloud upload dialog is not usable: ${JSON.stringify(result)}`);
  }
  return result;
}

function previewTimelineMetrics() {
  return {
    visible: previewTimeline.getBoundingClientRect().width > 80,
    disabled: previewTimeline.disabled,
    max: Number(previewTimeline.max || 0),
    value: Number(previewTimeline.value || 0),
    currentLabel: previewCurrentTime.textContent,
    durationLabel: previewDuration.textContent
  };
}

function verifyAnnotationTools(metrics) {
  const tools = metrics?.tools || [];
  const inputModes = metrics?.inputModes || [];
  const required = ['pen', 'arrow', 'rect', 'ellipse', 'spotlight', 'text'];
  const result = {
    ready: Boolean(metrics?.ready),
    tools,
    inputModes,
    autoHide: Boolean(metrics?.autoHide),
    undo: Boolean(metrics?.undo),
    clear: Boolean(metrics?.clear),
    skippedForSelfTest: Boolean(metrics?.skippedForSelfTest)
  };
  if (!result.ready || !result.undo || !result.clear || !result.autoHide || !inputModes.includes('annotate') || !inputModes.includes('navigate') || required.some((tool) => !tools.includes(tool))) {
    throw new Error(`Annotation tools are not ready: ${JSON.stringify(result)}`);
  }
  return result;
}

function miniRecorderMetrics() {
  const rect = miniRecorder.getBoundingClientRect();
  const stopRect = miniStopCapture.getBoundingClientRect();
  const annotationRect = miniAnnotationToggle.getBoundingClientRect();
  return {
    bodyMiniMode: document.body.classList.contains('mini-mode'),
    visible: !miniRecorder.hidden && rect.width > 120 && rect.height > 60,
    stopVisible: !miniStopCapture.disabled && stopRect.width > 40 && stopRect.height > 30,
    annotationToggleVisible: !miniAnnotationToggle.disabled && !miniAnnotationToggle.hidden && annotationRect.width > 70 && annotationRect.height > 30,
    annotationToggleText: miniAnnotationToggle.textContent,
    title: miniRecorderTitle.textContent,
    timer: miniRecorderMeta.textContent
  };
}

function defaultCaptureMetrics() {
  return {
    captureMode: captureMode.value,
    audioSource: micDevice.value || 'auto-detect',
    recordingQuality: recordingQuality.value,
    projectRenameButtons: document.querySelectorAll('.project-rename').length,
    projectOpenButtons: document.querySelectorAll('.project-open').length,
    projectDeleteButtons: document.querySelectorAll('.project-delete').length,
    projectThumbnails: document.querySelectorAll('.project-thumb').length,
    projectGridColumns: getComputedStyle(projectList).gridTemplateColumns,
    projectMenuVisible: projectActionsMenu.getBoundingClientRect().width > 40,
    minioConfigured: Boolean(minioConfig?.configured),
    minioSettingsButtonVisible: minioSettings.getBoundingClientRect().width > 40,
    screenshotButtonVisible: takeScreenshot.getBoundingClientRect().width > 40,
    darkThemeButtonVisible: toggleTheme.getBoundingClientRect().width > 40,
    minimalModeButtonVisible: toggleMinimalMode.getBoundingClientRect().width > 40,
    healthPanelVisible: healthEncoder.getBoundingClientRect().width > 40
  };
}

function setMinimalUi(enabled) {
  document.body.classList.toggle('minimal-ui', enabled);
  toggleMinimalMode.textContent = enabled ? 'Full App' : 'Minimal';
  toggleMinimalMode.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  requestAnimationFrame(() => {
    updatePreviewTimeline();
    updatePlaybackControls();
  });
}

async function refreshDiagnostics() {
  try {
    const diagnostics = await window.screenStudio.diagnostics();
    const pipeline = diagnostics.pipeline || {};
    healthEncoder.textContent = `Encoder: ${pipeline.encoder || 'detecting'}`;
    healthAudio.textContent = `Audio: ${diagnostics.audioDevices?.length ? 'device ready' : 'loopback/default'}`;
    healthFfmpeg.textContent = diagnostics.ffmpegAvailable ? 'FFmpeg: ready' : 'FFmpeg: missing';
    healthMinio.textContent = minioConfig?.configured ? `Cloud: ${minioConfig.bucket}` : 'Cloud: setup needed';
  } catch {
    healthEncoder.textContent = 'Encoder: unknown';
    healthAudio.textContent = 'Audio: unknown';
    healthFfmpeg.textContent = 'FFmpeg: unknown';
    healthMinio.textContent = minioConfig?.configured ? `Cloud: ${minioConfig.bucket}` : 'Cloud: setup needed';
  }
}

function setMiniRecorderMode(enabled, title = 'Recording') {
  document.body.classList.toggle('mini-mode', enabled);
  miniRecorder.hidden = !enabled;
  miniRecorderTitle.textContent = title;
  miniStopCapture.disabled = !enabled;
  miniAnnotationToggle.disabled = !enabled;
  miniAnnotationToggle.hidden = !enabled;
  miniRecorderMeta.textContent = recordTimer.textContent;
}

function syncMiniAnnotationButton() {
  miniAnnotationToggle.textContent = annotationInputEnabled ? 'Tools On' : 'Tools Off';
  miniAnnotationToggle.classList.toggle('active-tool', annotationInputEnabled);
  miniAnnotationToggle.title = annotationInputEnabled
    ? 'Annotation tools are active. Use Navigate Off in the toolbar to scroll or click through.'
    : 'Annotation tools are in pass-through mode. Click to draw again.';
}

async function setAnnotationInput(enabled) {
  annotationInputEnabled = Boolean(enabled);
  syncMiniAnnotationButton();
  if (selfTestMode) return { enabled: annotationInputEnabled, selfTest: true };
  return await window.screenStudio.setAnnotationInputMode(annotationInputEnabled);
}

function playbackControlsVisible() {
  return [topPlayPreview, topStopPreview, dockPlayPreview, dockStopPreview].every((button) => {
    const rect = button.getBoundingClientRect();
    return rect.width > 20 && rect.height > 20;
  });
}

async function loadDevices() {
  try {
    const devices = await window.screenStudio.audioDevices();
    micDevice.innerHTML = '<option value="">Auto-detect FFmpeg audio</option>';
    for (const device of devices) {
      const option = document.createElement('option');
      option.value = device.name;
      option.textContent = `${device.name} (${device.kind})`;
      micDevice.appendChild(option);
    }
    micDevice.value = '';
    if (!devices.length) {
      systemAudio.checked = false;
      setStatus('No FFmpeg DirectShow audio source found. Video recording is available without audio.');
    }
    refreshDiagnostics();
  } catch {
    micDevice.innerHTML = '<option value="">No FFmpeg audio source found</option>';
    refreshDiagnostics();
  }
}

async function loadProjects() {
  projects = await window.screenStudio.listProjects();
  projectRenderLimit = Math.max(baseProjectRenderLimit, Math.min(projectRenderLimit, projects.length || baseProjectRenderLimit));
  renderProjects();
  if (activeProject) activeProject = projects.find((project) => project.id === activeProject.id) || null;
  if (!activeProject && projects.length) selectProject(projects[0].id);
  if (!projects.length) selectProject(null);
  requestAnimationFrame(() => {
    projectList.scrollTop = 0;
  });
}

function renderProjects() {
  projectList.innerHTML = '';
  if (!projects.length) {
    const empty = document.createElement('div');
    empty.className = 'project-item';
    empty.innerHTML = '<strong>No recordings</strong><span>Create the first project.</span>';
    projectList.appendChild(empty);
    return;
  }

  const visibleProjects = visibleProjectsForCurrentTab();
  if (!visibleProjects.length) {
    const empty = document.createElement('div');
    empty.className = 'project-item';
    empty.innerHTML = '<strong>No projects here</strong><span>Switch tabs or record a new item.</span>';
    projectList.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  const renderedProjects = visibleProjects.slice(0, projectRenderLimit);
  for (const project of renderedProjects) {
    const row = document.createElement('div');
    row.className = `project-row ${activeProject?.id === project.id ? 'active' : ''}`;
    row.dataset.projectId = project.id;
    const selectButton = document.createElement('button');
    selectButton.className = `project-main ${activeProject?.id === project.id ? 'active' : ''}`;
    selectButton.dataset.projectId = project.id;
    const thumbnail = project.thumbnailPath ? mediaUrl(project.thumbnailPath) : '';
    const thumbnailMarkup = thumbnail
      ? `<img class="project-thumb" src="${thumbnail}" alt="" loading="lazy" />`
      : `<div class="project-thumb project-thumb-empty">${isImageProject(project) ? 'Image' : 'Video'}</div>`;
    selectButton.innerHTML = `
      <span class="project-thumb-wrap">${thumbnailMarkup}<span class="project-kind">${isImageProject(project) ? 'Image' : 'Video'}</span></span>
      <span class="project-info">
        <strong>${escapeHtml(project.title)}</strong>
        <span>${formatDuration(project.durationMs)} · ${formatSize(project.sizeBytes)}</span>
      </span>
    `;
    selectButton.addEventListener('click', () => selectProject(project.id));
    selectButton.addEventListener('dblclick', () => openProjectMediaById(project.id));
    const openButton = document.createElement('button');
    openButton.className = 'project-open';
    openButton.title = 'Open in default app';
    openButton.setAttribute('aria-label', `Open ${project.title} in default app`);
    openButton.textContent = '↗';
    openButton.addEventListener('click', () => openProjectMediaById(project.id));
    const renameButton = document.createElement('button');
    renameButton.className = 'project-rename';
    renameButton.title = 'Rename video';
    renameButton.setAttribute('aria-label', `Rename ${project.title}`);
    renameButton.textContent = '✎';
    renameButton.addEventListener('click', () => renameProjectById(project.id));
    const deleteButton = document.createElement('button');
    deleteButton.className = 'project-delete';
    deleteButton.title = 'Delete project';
    deleteButton.setAttribute('aria-label', `Delete ${project.title}`);
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => deleteProjectById(project.id));
    const actionBar = document.createElement('div');
    actionBar.className = 'project-card-actions';
    actionBar.append(openButton, renameButton, deleteButton);
    row.append(selectButton, actionBar);
    fragment.appendChild(row);
  }
  if (projectRenderLimit < visibleProjects.length) {
    const more = document.createElement('button');
    more.className = 'project-more';
    more.type = 'button';
    more.textContent = `Show ${Math.min(projectRenderBatchSize, visibleProjects.length - projectRenderLimit)} more projects`;
    more.addEventListener('click', renderMoreProjectsIfNeeded);
    fragment.appendChild(more);
  }
  projectList.appendChild(fragment);
}

function selectProject(id) {
  hideCountdownOverlay();
  activeProject = projects.find((project) => project.id === id) || null;
  updateProjectSelectionStyles();

  if (!activeProject) {
    activeTitle.textContent = 'New recording';
    setStatus('Ready');
    preview.removeAttribute('src');
    preview.srcObject = null;
    imagePreview.hidden = true;
    imagePreview.removeAttribute('src');
    emptyState.style.display = 'grid';
    exportProject.disabled = true;
    uploadProject.disabled = true;
    renameProject.disabled = true;
    dockRenameProject.disabled = true;
    stageRenameProject.disabled = true;
    deleteProject.disabled = true;
    saveTools.disabled = true;
    watermarkText.value = '';
    captionText.value = '';
    trimStart.disabled = true;
    trimEnd.disabled = true;
    trimStartText.textContent = '00:00';
    trimEndText.textContent = '00:00';
    timelineFill.style.width = '0%';
    previewTimeline.value = '0';
    previewTimeline.max = '0';
    updatePreviewTimeline();
    updatePlaybackControls();
    return;
  }

  activeTitle.textContent = activeProject.title;
  const engine = activeProject.capture?.engine || activeProject.media?.engine || 'browser';
  const audio = activeProject.capture?.audioDevice ? ` · audio: ${activeProject.capture.audioDevice}` : ' · no audio source';
  const kind = isImageProject(activeProject) ? 'screenshot' : engine;
  const imageCompression = activeProject.media?.compression?.codec ? ` · ${activeProject.media.compression.codec}` : '';
  setStatus(`${formatDuration(activeProject.durationMs)} · ${formatSize(activeProject.sizeBytes)} · ${kind}${isImageProject(activeProject) ? imageCompression : audio}`);
  preview.srcObject = null;
  if (isImageProject(activeProject)) {
    preview.pause();
    preview.removeAttribute('src');
    imagePreview.src = mediaUrl(activeProject.mediaPath);
    imagePreview.hidden = false;
  } else {
    imagePreview.hidden = true;
    imagePreview.removeAttribute('src');
    preview.src = mediaUrl(activeProject.mediaPath);
    preview.muted = false;
  }
  preview.playbackRate = Number(playbackRate.value);
  emptyState.style.display = 'none';
  exportProject.disabled = false;
  uploadProject.disabled = false;
  renameProject.disabled = false;
  dockRenameProject.disabled = false;
  stageRenameProject.disabled = false;
  deleteProject.disabled = false;
  saveTools.disabled = false;
  watermarkText.value = activeProject.edit?.watermarkText || '';
  captionText.value = activeProject.edit?.captionText || '';

  const duration = Math.max(0, Math.round(activeProject.durationMs));
  trimStart.max = String(duration);
  trimEnd.max = String(duration);
  trimStart.value = String(activeProject.edit?.trimStartMs || 0);
  trimEnd.value = String(activeProject.edit?.trimEndMs || duration);
  trimStart.disabled = isImageProject(activeProject);
  trimEnd.disabled = isImageProject(activeProject);
  updateTimelineFill();
  updatePreviewTimeline();
  updatePlaybackControls();
}

function setRecordingState(state) {
  recorderState = state;
  const isRecording = state === 'recording';
  const isPaused = state === 'paused';
  const isSelecting = state === 'selecting';
  const startDisabled = isRecording || isPaused;
  const stopDisabled = !(isRecording || isPaused || isSelecting);
  recordDot.classList.toggle('live', isRecording);
  recordStatusText.textContent = isPaused ? 'Paused' : isSelecting ? 'Select region' : isRecording ? 'Recording' : 'Idle';
  startCapture.disabled = startDisabled;
  topStartCapture.disabled = startDisabled;
  stageStartCapture.disabled = startDisabled;
  const startLabel = isSelecting ? 'Record Region' : 'Record';
  startCapture.textContent = isSelecting ? 'Record Region' : 'Start Capture';
  topStartCapture.textContent = startLabel;
  stageStartCapture.textContent = startLabel;
  pauseCapture.disabled = Boolean(nativeCaptureSession) || !(isRecording || isPaused);
  pauseCapture.textContent = isPaused ? 'Resume' : 'Pause';
  stopCapture.disabled = stopDisabled;
  topStopCapture.disabled = stopDisabled;
  stageStopCapture.disabled = stopDisabled;
  topStopCapture.textContent = 'Stop Rec';
  stageStopCapture.textContent = 'Stop Rec';
  setMiniRecorderMode(isRecording || isPaused, isPaused ? 'Recording paused' : 'Recording desktop');
}

function updateTimer() {
  const currentPause = pausedAt ? Date.now() - pausedAt : 0;
  const elapsed = formatDuration(Date.now() - recordingStartedAt - pausedMs - currentPause);
  recordTimer.textContent = elapsed;
  miniRecorderMeta.textContent = elapsed;
}

async function getDisplayStream() {
  const video = {
    frameRate: 30,
    width: { ideal: 1920 },
    height: { ideal: 1080 }
  };
  if (!systemAudio.checked) {
    return await navigator.mediaDevices.getDisplayMedia({ video, audio: false });
  }
  try {
    return await navigator.mediaDevices.getDisplayMedia({ video, audio: true });
  } catch (error) {
    setStatus('Computer sound was not available for that source. Retrying screen capture without computer sound.');
    return await navigator.mediaDevices.getDisplayMedia({ video, audio: false });
  }
}

async function getMicStream() {
  if (!micAudio.checked) return null;
  const audio = micDevice.value ? { deviceId: { exact: micDevice.value } } : true;
  try {
    return await navigator.mediaDevices.getUserMedia({ audio, video: false });
  } catch {
    setStatus('Microphone was not available. Recording will continue without mic audio.');
    return null;
  }
}

function createSourceVideo(stream) {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  return video;
}

async function waitForVideoReady(video) {
  if (video.readyState >= 2 && video.videoWidth) return;
  await new Promise((resolve) => {
    video.onloadedmetadata = resolve;
  });
}

function videoDisplayRect() {
  const bounds = preview.getBoundingClientRect();
  const videoRatio = sourceVideo.videoWidth / sourceVideo.videoHeight;
  const boundsRatio = bounds.width / bounds.height;
  let width = bounds.width;
  let height = bounds.height;
  let left = bounds.left;
  let top = bounds.top;
  if (boundsRatio > videoRatio) {
    width = bounds.height * videoRatio;
    left = bounds.left + (bounds.width - width) / 2;
  } else {
    height = bounds.width / videoRatio;
    top = bounds.top + (bounds.height - height) / 2;
  }
  return { left, top, width, height };
}

function setRegionBoxFromPoints(a, b) {
  const rect = videoDisplayRect();
  const left = Math.max(rect.left, Math.min(a.x, b.x));
  const top = Math.max(rect.top, Math.min(a.y, b.y));
  const right = Math.min(rect.left + rect.width, Math.max(a.x, b.x));
  const bottom = Math.min(rect.top + rect.height, Math.max(a.y, b.y));
  const width = Math.max(32, right - left);
  const height = Math.max(32, bottom - top);
  selectedRegion = {
    x: (left - rect.left) / rect.width,
    y: (top - rect.top) / rect.height,
    width: width / rect.width,
    height: height / rect.height
  };
  regionBox.style.left = `${left - regionOverlay.getBoundingClientRect().left}px`;
  regionBox.style.top = `${top - regionOverlay.getBoundingClientRect().top}px`;
  regionBox.style.width = `${width}px`;
  regionBox.style.height = `${height}px`;
}

function defaultRegion() {
  const rect = videoDisplayRect();
  const left = rect.left + rect.width * 0.1;
  const top = rect.top + rect.height * 0.1;
  const right = rect.left + rect.width * 0.9;
  const bottom = rect.top + rect.height * 0.9;
  setRegionBoxFromPoints({ x: left, y: top }, { x: right, y: bottom });
}

async function countdownDelay() {
  let remaining = Number(countdown.value || 0);
  if (!remaining) {
    lastCountdownCheck = { visible: false, seconds: 0, skipped: true };
    return;
  }
  setStatus(`Recording starts in ${remaining} seconds`);
  if (window.screenStudio.recordCountdown) {
    lastCountdownCheck = await window.screenStudio.recordCountdown(remaining);
    hideCountdownOverlay();
    return;
  }
  countdownOverlay.hidden = false;
  lastCountdownCheck = { visible: true, seconds: remaining, surface: 'app-overlay' };
  while (remaining > 0) {
    countdownOverlay.textContent = String(remaining);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    remaining -= 1;
  }
  hideCountdownOverlay();
}

function addAudioTracksToDestination(stream) {
  if (!stream || !stream.getAudioTracks().length) return;
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(audioDestination);
}

function connectNativeAudioSource(stream) {
  if (!stream || !nativeAudioContext || !nativeAudioDestination) return false;
  if (!stream.getAudioTracks().length) return false;
  const source = nativeAudioContext.createMediaStreamSource(stream);
  source.connect(nativeAudioDestination);
  return true;
}

async function startNativeCompanionAudio() {
  await stopNativeCompanionAudio();
  nativeAudioChunks = [];
  nativeAudioStreams = [];
  nativeAudioFlags = { hasSystemAudio: false, hasMicAudio: false };
  if (!systemAudio.checked && !micAudio.checked) return null;

  nativeAudioContext = new AudioContext();
  nativeAudioDestination = nativeAudioContext.createMediaStreamDestination();

  if (systemAudio.checked) {
    try {
      const loopbackStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 1, width: { ideal: 2 }, height: { ideal: 2 } },
        audio: true
      });
      nativeAudioStreams.push(loopbackStream);
      nativeAudioFlags.hasSystemAudio = connectNativeAudioSource(loopbackStream);
    } catch {
      setStatus('Windows loopback audio was not available. Recording will continue without system sound.');
    }
  }

  if (micAudio.checked) {
    try {
      const micStreamForNative = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      nativeAudioStreams.push(micStreamForNative);
      nativeAudioFlags.hasMicAudio = connectNativeAudioSource(micStreamForNative);
    } catch {
      setStatus('Microphone was not available. Recording will continue without mic audio.');
    }
  }

  const tracks = nativeAudioDestination.stream.getAudioTracks();
  if (!tracks.length) {
    await stopNativeCompanionAudio();
    return null;
  }

  const preferredTypes = [
    'audio/webm;codecs=opus',
    'audio/webm'
  ];
  const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  nativeAudioRecorder = new MediaRecorder(nativeAudioDestination.stream, mimeType ? { mimeType } : undefined);
  nativeAudioRecorder.addEventListener('dataavailable', (event) => {
    if (event.data.size) nativeAudioChunks.push(event.data);
  });
  nativeAudioStartedAt = Date.now();
  nativeAudioRecorder.start(250);
  return nativeAudioFlags;
}

async function stopNativeCompanionAudio() {
  const recorder = nativeAudioRecorder;
  nativeAudioRecorder = null;
  if (!recorder) {
    nativeAudioStreams.forEach((stream) => stream.getTracks().forEach((track) => track.stop()));
    nativeAudioStreams = [];
    if (nativeAudioContext) await nativeAudioContext.close().catch(() => {});
    nativeAudioContext = null;
    nativeAudioDestination = null;
    return null;
  }

  const stopped = new Promise((resolve) => {
    recorder.addEventListener('stop', resolve, { once: true });
  });
  if (recorder.state !== 'inactive') recorder.stop();
  await stopped;
  nativeAudioStreams.forEach((stream) => stream.getTracks().forEach((track) => track.stop()));
  nativeAudioStreams = [];
  if (nativeAudioContext) await nativeAudioContext.close().catch(() => {});
  nativeAudioContext = null;
  nativeAudioDestination = null;

  const blob = new Blob(nativeAudioChunks, { type: recorder.mimeType || 'audio/webm' });
  nativeAudioChunks = [];
  if (!blob.size) return null;
  return {
    buffer: await blob.arrayBuffer(),
    mimeType: blob.type || recorder.mimeType || 'audio/webm',
    durationMs: Date.now() - nativeAudioStartedAt,
    source: 'Electron system loopback',
    hasSystemAudio: Boolean(nativeAudioFlags?.hasSystemAudio),
    hasMicAudio: Boolean(nativeAudioFlags?.hasMicAudio)
  };
}

function buildMixedStream() {
  canvasStream = recordCanvas.captureStream(30);
  audioContext = new AudioContext();
  audioDestination = audioContext.createMediaStreamDestination();
  addAudioTracksToDestination(displayStream);
  addAudioTracksToDestination(micStream);
  mixedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDestination.stream.getAudioTracks()
  ]);
}

function currentCrop() {
  const w = sourceVideo.videoWidth;
  const h = sourceVideo.videoHeight;
  if (captureMode.value !== 'region' || !selectedRegion) {
    return { sx: 0, sy: 0, sw: w, sh: h };
  }
  return {
    sx: Math.max(0, Math.round(selectedRegion.x * w)),
    sy: Math.max(0, Math.round(selectedRegion.y * h)),
    sw: Math.max(64, Math.round(selectedRegion.width * w)),
    sh: Math.max(64, Math.round(selectedRegion.height * h))
  };
}

function startDrawing() {
  const ctx = recordCanvas.getContext('2d', { alpha: false });
  const crop = currentCrop();
  recordCanvas.width = crop.sw;
  recordCanvas.height = crop.sh;

  function draw() {
    if (recorderState === 'recording' || recorderState === 'paused') {
      const c = currentCrop();
      if (recordCanvas.width !== c.sw || recordCanvas.height !== c.sh) {
        recordCanvas.width = c.sw;
        recordCanvas.height = c.sh;
      }
      ctx.drawImage(sourceVideo, c.sx, c.sy, c.sw, c.sh, 0, 0, recordCanvas.width, recordCanvas.height);
      drawToolOverlays(ctx);
    }
    drawFrameHandle = requestAnimationFrame(draw);
  }
  draw();
}

function drawToolOverlays(ctx) {
  const label = watermarkText.value || '';
  if (!label) return;
  ctx.font = '24px Segoe UI';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(16, recordCanvas.height - 58, ctx.measureText(label).width + 28, 42);
  ctx.fillStyle = 'white';
  ctx.fillText(label, 30, recordCanvas.height - 30);
}

async function prepareCapture() {
  if (captureMode.value === 'region') {
    setRecordingState('selecting');
    setStatus('Choose a region on the desktop guide. Press Enter or double-click to record.');
    selectedRegion = await window.screenStudio.selectRegion();
    if (!selectedRegion) {
      cleanupCapture();
      setRecordingState('idle');
      return false;
    }
  }
  await window.screenStudio.enterMiniRecorder();
  setMiniRecorderMode(true, 'Starting recording');
  displayStream = await getDisplayStream();
  micStream = await getMicStream();
  sourceVideo = createSourceVideo(displayStream);
  await sourceVideo.play();
  await waitForVideoReady(sourceVideo);

  preview.srcObject = displayStream;
  preview.removeAttribute('src');
  preview.muted = true;
  await preview.play();
  emptyState.style.display = 'none';

  displayStream.getVideoTracks()[0]?.addEventListener('ended', () => {
    if (recorderState === 'recording' || recorderState === 'paused') stopRecording();
    if (recorderState === 'selecting') cleanupCapture();
  });

  return true;
}

async function startRecording() {
  if (nativeCaptureSession || (mediaRecorder && mediaRecorder.state !== 'inactive')) return;
  selectedRegion = null;
  await beginNativeRecording();
}

function buildCaptureConfig() {
  return {
    mode: captureMode.value,
    quality: recordingQuality.value,
    recordAudio: systemAudio.checked,
    preferMicrophone: micAudio.checked,
    audioDevice: micDevice.value || '',
    audioDeviceLabel: micDevice.options[micDevice.selectedIndex]?.textContent || 'Auto-detect FFmpeg audio',
    region: selectedRegion
  };
}

async function beginNativeRecording() {
  hideCountdownOverlay();
  if (captureMode.value === 'region') {
    setRecordingState('selecting');
    setStatus('Choose a region on the desktop guide. Press Enter or double-click to record.');
    selectedRegion = await window.screenStudio.selectRegion();
    if (!selectedRegion) {
      setRecordingState('idle');
      return;
    }
  }

  await window.screenStudio.enterMiniRecorder();
  setMiniRecorderMode(true, 'Starting recording');
  await countdownDelay();
  hideCountdownOverlay();
  const captureConfig = buildCaptureConfig();
  const companionAudio = await startNativeCompanionAudio();
  nativeCaptureSession = await window.screenStudio.startNativeCapture({
    title: `Recording ${new Date().toLocaleString().replace(/[/:]/g, '-')}`,
    captureConfig,
    frameRate: recordingQuality.value === 'ultra' ? 60 : 30
  });
  refreshDiagnostics();

  recordingStartedAt = Date.now();
  pausedMs = 0;
  pausedAt = 0;
  timerHandle = setInterval(updateTimer, 250);
  setRecordingState('recording');
  updateTimer();
  lastAnnotationCheck = await window.screenStudio.showAnnotations().catch((error) => ({
    ready: false,
    error: error.message || String(error)
  }));
  await setAnnotationInput(true).catch(() => {});
  if (companionAudio?.hasSystemAudio) {
    setStatus(`Recording smooth desktop video · annotation tools ready · system sound ${companionAudio.hasMicAudio ? '+ microphone ' : ''}will be muxed into MP4`);
  } else {
    setStatus(nativeCaptureSession.audioDevice
      ? `Recording FFmpeg desktop video · audio source: ${nativeCaptureSession.audioDevice} (${nativeCaptureSession.audioKind})`
      : 'Recording FFmpeg desktop video only · no audio source selected or available');
  }
}

async function beginRecording() {
  await countdownDelay();
  buildMixedStream();
  preview.srcObject = mixedStream;
  preview.muted = true;
  recordingChunks = [];

  const preferredTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  mediaRecorder = new MediaRecorder(mixedStream, mimeType ? { mimeType } : undefined);
  mediaRecorder.addEventListener('dataavailable', (event) => {
    if (event.data.size) recordingChunks.push(event.data);
  });
  mediaRecorder.addEventListener('stop', saveRecording, { once: true });

  recordingStartedAt = Date.now();
  pausedMs = 0;
  pausedAt = 0;
  timerHandle = setInterval(updateTimer, 250);
  setRecordingState('recording');
  updateTimer();
  startDrawing();
  mediaRecorder.start(1000);
}

function pauseOrResumeRecording() {
  if (nativeCaptureSession) {
    setStatus('Pause is not available during native FFmpeg desktop capture. Stop to save the recording.');
    return;
  }
  if (!mediaRecorder) return;
  if (mediaRecorder.state === 'recording') {
    mediaRecorder.pause();
    pausedAt = Date.now();
    setRecordingState('paused');
    return;
  }
  if (mediaRecorder.state === 'paused') {
    pausedMs += Date.now() - pausedAt;
    pausedAt = 0;
    mediaRecorder.resume();
    setRecordingState('recording');
  }
}

async function stopRecording() {
  if (recorderState === 'selecting') {
    cleanupCapture();
    setRecordingState('idle');
    await window.screenStudio.showAfterCapture();
    return;
  }
  if (nativeCaptureSession) {
    const session = nativeCaptureSession;
    nativeCaptureSession = null;
    clearInterval(timerHandle);
    timerHandle = null;
    setStatus('Stopping FFmpeg recording...');
    try {
      await window.screenStudio.closeAnnotations().catch(() => {});
      annotationInputEnabled = true;
      syncMiniAnnotationButton();
      const companionAudio = await stopNativeCompanionAudio();
      const project = await window.screenStudio.stopNativeCapture(session.id, companionAudio);
      setRecordingState('idle');
      refreshDiagnostics();
      await window.screenStudio.showAfterCapture();
      if (!project) {
        setStatus('Recording stopped without a saved project');
        return;
      }
      projects = await window.screenStudio.listProjects();
      activeProject = project;
      selectProject(project.id);
      loadDevices();
      if (!selfTestMode) showPostRecordDialog(project);
      if (selfTestMode) {
        const renamedProject = await window.screenStudio.renameProject({
          path: project.path,
          title: `Self-test Video ${Date.now()}`
        });
        projects = (await window.screenStudio.listProjects()).map((item) => item.id === renamedProject.id ? renamedProject : item);
        activeProject = renamedProject;
        selectProject(renamedProject.id);
        const postRecordDialog = await verifyPostRecordDialog(renamedProject);
        if (!lastCountdownCheck?.visible || !lastCountdownCheck.seconds || !/overlay/i.test(lastCountdownCheck.surface || '') || !lastCountdownCheck.closedBeforeCapture || lastCountdownCheck.settleMs < 500) {
          throw new Error(`Recording countdown overlay did not run: ${JSON.stringify(lastCountdownCheck)}`);
        }
        const annotationTools = verifyAnnotationTools(lastAnnotationCheck);
        const fixedPreviewFrame = await verifyFixedPreviewFrame();
        const projectBrowserResize = await verifyProjectBrowserResize();
        const darkTheme = await verifyThemeToggle();
        const minimalUi = await verifyMinimalUi();
        const minioSettingsDialog = await verifyMinioSettingsDialog();
        const playback = await verifyPlaybackControls();
        const upload = minioConfig?.configured ? await window.screenStudio.uploadProject(renamedProject.path) : null;
        const cloudUploadDialog = upload ? await verifyCloudUploadDialog(upload, renamedProject) : null;
        await window.screenStudio.hideForScreenshot();
        const screenshot = await window.screenStudio.captureScreenshot({
          title: `Self-test Screenshot ${Date.now()}`,
          captureConfig: { mode: 'full', quality: recordingQuality.value, screenshotQuality: '8k-sharp' }
        });
        await window.screenStudio.showAfterScreenshot();
        projects = await window.screenStudio.listProjects();
        selectProject(screenshot.id);
        const screenshotPreview = {
          visible: !imagePreview.hidden && imagePreview.getBoundingClientRect().width > 80,
          mimeType: screenshot.media?.mimeType,
          width: screenshot.media?.width,
          height: screenshot.media?.height,
          engine: screenshot.media?.engine,
          compression: screenshot.media?.compression || null,
          bytes: screenshot.sizeBytes,
          uploadVisible: uploadProject.getBoundingClientRect().width > 40 && !uploadProject.disabled
        };
        if (!screenshotPreview.visible || screenshotPreview.mimeType !== 'image/png' || screenshotPreview.bytes <= 0 || screenshotPreview.width < 7680 || !screenshotPreview.engine?.startsWith('ffmpeg-') || screenshotPreview.compression?.codec !== 'png-high-res') {
          throw new Error(`Screenshot project did not preview correctly: ${JSON.stringify(screenshotPreview)}`);
        }
        await window.screenStudio.hideForScreenshot();
        const regionScreenshot = await window.screenStudio.captureScreenshot({
          title: `Self-test Region Screenshot ${Date.now()}`,
          captureConfig: {
            mode: 'region',
            quality: recordingQuality.value,
            region: { x: 0.1, y: 0.1, width: 0.5, height: 0.5 },
            screenshotQuality: '8k-sharp'
          }
        });
        await window.screenStudio.showAfterScreenshot();
        const regionScreenshotPreview = {
          mimeType: regionScreenshot.media?.mimeType,
          width: regionScreenshot.media?.width,
          height: regionScreenshot.media?.height,
          engine: regionScreenshot.media?.engine,
          compression: regionScreenshot.media?.compression || null,
          bytes: regionScreenshot.sizeBytes
        };
        if (regionScreenshotPreview.mimeType !== 'image/png' || regionScreenshotPreview.bytes <= 0 || regionScreenshotPreview.width < 7680 || !regionScreenshotPreview.engine?.startsWith('ffmpeg-') || regionScreenshotPreview.compression?.codec !== 'png-high-res') {
          throw new Error(`Region screenshot did not save as high-resolution PNG image: ${JSON.stringify(regionScreenshotPreview)}`);
        }
        await window.screenStudio.completeSelfTest({
          ok: true,
          projectPath: renamedProject.path,
          renamedTitle: renamedProject.title,
          renameChangedPath: renamedProject.path !== project.path,
          bytes: renamedProject.sizeBytes,
          durationMs: renamedProject.durationMs,
          region: renamedProject.capture?.region,
          rect: renamedProject.capture?.rect,
          audioDevice: renamedProject.capture?.audioDevice || null,
          audioKind: renamedProject.capture?.audioKind || null,
          hasSystemAudio: Boolean(renamedProject.capture?.hasSystemAudio),
          companionAudio: renamedProject.capture?.companionAudio || null,
          engine: renamedProject.capture?.engine,
          captureBackend: renamedProject.capture?.captureBackend,
          videoEncoder: renamedProject.capture?.videoEncoder,
          autosave: renamedProject.capture?.autosave || null,
          recordAudioRequested: renamedProject.capture?.recordAudio,
          selectedAudioDevice: renamedProject.capture?.audioDevice || null,
          defaults: defaultCaptureMetrics(),
          quality: renamedProject.capture?.quality,
          frameRate: renamedProject.capture?.frameRate,
          videoCrf: renamedProject.capture?.videoCrf,
          countdownOverlay: lastCountdownCheck,
          annotationTools,
          postRecordDialog,
          fixedPreviewFrame,
          projectBrowserResize,
          darkTheme,
          minimalUi,
          minioSettingsDialog,
          miniRecorder: lastMiniRecorderCheck,
          playback,
          screenshot: screenshotPreview,
          regionScreenshot: regionScreenshotPreview,
          upload,
          cloudUploadDialog
        });
      }
    } catch (error) {
      await stopNativeCompanionAudio();
      setRecordingState('idle');
      refreshDiagnostics();
      await window.screenStudio.showAfterCapture();
      if (selfTestMode) {
        await window.screenStudio.completeSelfTest({ ok: false, error: error.message || String(error) });
      }
      setStatus(error.message || 'Unable to stop FFmpeg recording');
    }
    return;
  }
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
}

function cleanupCapture() {
  regionOverlay.hidden = true;
  hideCountdownOverlay();
  if (drawFrameHandle) cancelAnimationFrame(drawFrameHandle);
  drawFrameHandle = null;
  for (const stream of [displayStream, micStream, mixedStream, canvasStream]) {
    stream?.getTracks().forEach((track) => track.stop());
  }
  nativeAudioStreams.forEach((stream) => stream.getTracks().forEach((track) => track.stop()));
  nativeAudioStreams = [];
  if (nativeAudioContext) nativeAudioContext.close().catch(() => {});
  nativeAudioRecorder = null;
  nativeAudioChunks = [];
  nativeAudioContext = null;
  nativeAudioDestination = null;
  displayStream = null;
  micStream = null;
  mixedStream = null;
  canvasStream = null;
  if (audioContext) audioContext.close().catch(() => {});
  audioContext = null;
  audioDestination = null;
  sourceVideo = null;
}

async function saveRecording() {
  clearInterval(timerHandle);
  timerHandle = null;
  setRecordingState('idle');

  const durationMs = Date.now() - recordingStartedAt - pausedMs;
  const blob = new Blob(recordingChunks, { type: mediaRecorder.mimeType || 'video/webm' });
  const buffer = await blob.arrayBuffer();
  const captureConfig = {
    mode: captureMode.value,
    quality: recordingQuality.value,
    recordAudio: systemAudio.checked,
    preferMicrophone: micAudio.checked,
    audioDevice: micDevice.value || '',
    audioDeviceLabel: micDevice.options[micDevice.selectedIndex]?.textContent || 'Auto-detect FFmpeg audio',
    region: selectedRegion
  };
  cleanupCapture();
  preview.srcObject = null;
  preview.muted = false;
  await window.screenStudio.showAfterCapture();

  if (!buffer.byteLength) {
    setStatus('Recording stopped without video data');
    return;
  }

  const project = await window.screenStudio.createRecording({
    title: `Recording ${new Date().toLocaleString().replace(/[/:]/g, '-')}`,
    durationMs,
    mimeType: blob.type,
    captureConfig,
    buffer
  });

  projects = await window.screenStudio.listProjects();
  activeProject = project;
  selectProject(project.id);
  loadDevices();
  if (!selfTestMode) showPostRecordDialog(project);
  if (selfTestMode) {
    const fixedPreviewFrame = await verifyFixedPreviewFrame();
    const projectBrowserResize = await verifyProjectBrowserResize();
    const darkTheme = await verifyThemeToggle();
    const minimalUi = await verifyMinimalUi();
    const minioSettingsDialog = await verifyMinioSettingsDialog();
    const postRecordDialog = await verifyPostRecordDialog(project);
    await window.screenStudio.completeSelfTest({
      ok: true,
      projectPath: project.path,
      bytes: buffer.byteLength,
      durationMs,
      region: captureConfig.region,
      recordAudioRequested: captureConfig.recordAudio,
      fixedPreviewFrame,
      projectBrowserResize,
      darkTheme,
      minimalUi,
      minioSettingsDialog,
      countdownOverlay: lastCountdownCheck,
      postRecordDialog,
      miniRecorder: lastMiniRecorderCheck,
      playbackControlsVisible: playbackControlsVisible()
    });
  }
}

function updateTimelineFill() {
  if (!activeProject) return;
  const duration = Math.max(1, activeProject.durationMs || 1);
  const start = Number(trimStart.value || 0);
  const end = Math.max(start, Number(trimEnd.value || duration));
  trimStartText.textContent = formatDuration(start);
  trimEndText.textContent = formatDuration(end);
  timelineFill.style.width = `${Math.max(0, end - start) / duration * 100}%`;
}

async function persistTrim() {
  if (!activeProject) return;
  const start = Number(trimStart.value || 0);
  const end = Math.max(start, Number(trimEnd.value || activeProject.durationMs || 0));
  trimEnd.value = String(end);
  activeProject = await window.screenStudio.updateEdit({
    path: activeProject.path,
    edit: {
      trimStartMs: start,
      trimEndMs: end,
      playbackRate: Number(playbackRate.value),
      watermarkText: watermarkText.value,
      captionText: captionText.value
    }
  });
  projects = projects.map((project) => project.id === activeProject.id ? activeProject : project);
  updateTimelineFill();
  setStatus(`Trim saved · ${formatDuration(end - start)}`);
}

async function saveToolMetadata() {
  if (!activeProject) return;
  activeProject = await window.screenStudio.updateEdit({
    path: activeProject.path,
    edit: {
      watermarkText: watermarkText.value,
      captionText: captionText.value,
      playbackRate: Number(playbackRate.value)
    }
  });
  projects = projects.map((project) => project.id === activeProject.id ? activeProject : project);
  setStatus('Tools saved');
}

async function renameActiveProject() {
  if (!activeProject) return;
  await renameProjectById(activeProject.id);
}

async function renameProjectById(projectId) {
  const projectToRename = projects.find((project) => project.id === projectId);
  if (!projectToRename) return;
  const title = await askTextDialog({
    title: 'Rename Video',
    label: 'Video name',
    initialValue: projectToRename.title
  });
  if (!title || title.trim() === projectToRename.title) return;
  const renamedProject = await window.screenStudio.renameProject({ path: projectToRename.path, title });
  projects = projects.map((project) => project.id === projectToRename.id ? renamedProject : project);
  if (activeProject?.id === projectToRename.id) {
    activeProject = renamedProject;
    selectProject(renamedProject.id);
  } else {
    renderProjects();
  }
  setStatus(`Renamed video to ${renamedProject.title}`);
}

async function openProjectMediaById(projectId) {
  const projectToOpen = projects.find((project) => project.id === projectId);
  if (!projectToOpen) return;
  try {
    await window.screenStudio.openMedia(projectToOpen.path);
    setStatus(`Opened ${projectToOpen.title} in the default app`);
  } catch (error) {
    setStatus(error.message || 'Unable to open project media');
  }
}

async function exportProjectByProject(project = activeProject) {
  if (!project) return null;
  exportProject.disabled = true;
  showJob('Preparing export', 0);
  try {
    const exported = await window.screenStudio.exportProject(project.path);
    if (exported) {
      setStatus(`Exported to ${exported.path}`);
      await loadProjects();
      selectProject(project.id);
      showJob('Export complete', 100, 'done');
      hideJobSoon();
      return exported;
    }
    hideJob();
    return null;
  } catch (error) {
    setStatus(error.message || 'Export failed');
    showJob('Export failed', 0, 'error');
    return null;
  } finally {
    exportProject.disabled = !activeProject;
  }
}

async function uploadProjectByProject(project = activeProject) {
  if (!project) return null;
  uploadProject.disabled = true;
  showJob('Preparing cloud upload', 0);
  try {
    const configured = await configureMinioIfNeeded(false);
    if (!configured) {
      hideJob();
      return null;
    }
    const uploaded = await window.screenStudio.uploadProject(project.path);
    showJob('Upload complete', 100, 'done');
    await loadProjects();
    selectProject(project.id);
    hideJobSoon();
    showCloudUploadDialog(uploaded, project);
    return uploaded;
  } catch (error) {
    const retry = window.confirm(`${error.message || 'Upload failed'}\n\nOpen Cloud settings and try again?`);
    if (retry) {
      await configureMinioIfNeeded(true);
    }
    showJob(error.message || 'Upload failed', 0, 'error');
    return null;
  } finally {
    uploadProject.disabled = !activeProject;
  }
}

async function deleteActiveProject() {
  if (!activeProject) return;
  await deleteProjectById(activeProject.id);
}

async function deleteProjectById(id) {
  const target = projects.find((project) => project.id === id);
  if (!target) return;
  const deleted = await window.screenStudio.deleteProject(target.path);
  if (!deleted) return;
  if (activeProject?.id === target.id) activeProject = null;
  await loadProjects();
}

async function captureScreenshotProject() {
  takeScreenshot.disabled = true;
  hideCountdownOverlay();
  showJob('Capturing screenshot', 0);
  let screenshotWindowHidden = false;
  try {
    let screenshotRegion = null;
    if (captureMode.value === 'region') {
      setRecordingState('selecting');
      setStatus('Choose a region for the screenshot. Press Enter or double-click to capture.');
      screenshotRegion = await window.screenStudio.selectRegion();
      setRecordingState('idle');
      if (!screenshotRegion) {
        hideJob();
        setStatus('Screenshot cancelled');
        return;
      }
    }
    await window.screenStudio.hideForScreenshot();
    screenshotWindowHidden = true;
    await new Promise((resolve) => setTimeout(resolve, 150));
    const project = await window.screenStudio.captureScreenshot({
      title: `Screenshot ${new Date().toLocaleString().replace(/[/:]/g, '-')}`,
      captureConfig: {
        ...buildCaptureConfig(),
        region: screenshotRegion,
        screenshotQuality: '8k-sharp-png'
      }
    });
    await window.screenStudio.showAfterScreenshot();
    screenshotWindowHidden = false;
    await loadProjects();
    selectProject(project.id);
    showJob('Screenshot saved', 100, 'done');
    hideJobSoon();
  } catch (error) {
    setStatus(error.message || 'Unable to capture screenshot');
    showJob(error.message || 'Screenshot failed', 0, 'error');
  } finally {
    if (screenshotWindowHidden) {
      await window.screenStudio.showAfterScreenshot().catch(() => {});
    }
    takeScreenshot.disabled = false;
  }
}

function showJob(message, percent = 0, state = 'running') {
  if (jobHideTimer) {
    clearTimeout(jobHideTimer);
    jobHideTimer = null;
  }
  jobPanel.hidden = false;
  jobPanel.dataset.state = state;
  jobText.textContent = message;
  jobProgress.value = Math.max(0, Math.min(100, Number(percent || 0)));
}

function hideJob() {
  jobPanel.hidden = true;
  jobPanel.dataset.state = '';
}

function hideJobSoon() {
  if (jobHideTimer) clearTimeout(jobHideTimer);
  jobHideTimer = setTimeout(() => {
    hideJob();
    jobHideTimer = null;
  }, 1600);
}

function minioFormPayload() {
  return {
    endpoint: minioEndpoint.value.trim(),
    bucket: minioBucket.value.trim(),
    accessKeyId: minioAccessKey.value.trim(),
    secretAccessKey: minioSecretKey.value,
    region: minioRegion.value.trim() || 'us-east-1',
    uploadMode: minioUploadMode.value,
    publicBaseUrl: minioPublicBaseUrl.value.trim()
  };
}

function fillMinioForm(existing = {}) {
  minioEndpoint.value = existing.endpoint || 'https://minio.web.mabdc.org/api/v1';
  minioBucket.value = existing.bucket || 'screen-studio';
  minioAccessKey.value = existing.accessKeyId || '';
  minioSecretKey.value = '';
  minioRegion.value = existing.region || 'us-east-1';
  minioUploadMode.value = existing.uploadMode || (/\/api\/v1$/i.test(existing.endpoint || '') ? 'console-api' : 's3');
  minioPublicBaseUrl.value = existing.publicBaseUrl || '';
  minioSecretKey.placeholder = existing.hasSecret ? 'Saved secret kept if blank' : 'Required on first setup';
  minioSettingsStatus.textContent = existing.configured ? `Configured for ${existing.bucket}` : 'Enter cloud credentials for this PC';
  minioSettingsStatus.dataset.state = existing.configured ? 'done' : 'idle';
}

async function openMinioSettings() {
  minioConfig = await window.screenStudio.getMinioConfig();
  fillMinioForm(minioConfig || {});
  minioDialog.hidden = false;
  minioEndpoint.focus();
  minioEndpoint.select();
}

function closeMinioSettingsDialog() {
  minioDialog.hidden = true;
}

async function testMinioForm() {
  testMinioSettings.disabled = true;
  minioSettingsStatus.textContent = 'Testing cloud connection...';
  minioSettingsStatus.dataset.state = 'running';
  try {
    const result = await window.screenStudio.testMinioConfig(minioFormPayload());
    minioSettingsStatus.textContent = `Connection OK · ${result.mode} · ${result.bucket}`;
    minioSettingsStatus.dataset.state = 'done';
    return true;
  } catch (error) {
    minioSettingsStatus.textContent = error.message || 'Cloud test failed';
    minioSettingsStatus.dataset.state = 'error';
    return false;
  } finally {
    testMinioSettings.disabled = false;
  }
}

async function saveMinioForm() {
  minioSettingsStatus.textContent = 'Saving cloud settings...';
  minioSettingsStatus.dataset.state = 'running';
  minioConfig = await window.screenStudio.saveMinioConfig(minioFormPayload());
  fillMinioForm(minioConfig);
  refreshDiagnostics();
  setStatus(`Cloud configured · ${minioConfig.bucket}`);
  minioSettingsStatus.textContent = `Saved · ${minioConfig.bucket}`;
  minioSettingsStatus.dataset.state = 'done';
  showJob('Cloud settings saved', 100, 'done');
  hideJobSoon();
  closeMinioSettingsDialog();
}

async function configureMinioIfNeeded(force = false) {
  minioConfig = minioConfig || await window.screenStudio.getMinioConfig();
  if (!force && minioConfig?.configured) return true;
  await openMinioSettings();
  return false;
}

projectResizeHandle.addEventListener('pointerdown', startProjectResize);
projectResizeHandle.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    nudgeProjectBrowser(event.shiftKey ? 80 : 24);
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    nudgeProjectBrowser(event.shiftKey ? -80 : -24);
  }
});

projectList.addEventListener('scroll', () => {
  if (projectList.scrollTop + projectList.clientHeight >= projectList.scrollHeight - 260) {
    renderMoreProjectsIfNeeded();
  }
});

regionOverlay.addEventListener('pointerdown', (event) => {
  regionDrag = { x: event.clientX, y: event.clientY };
  setRegionBoxFromPoints(regionDrag, regionDrag);
});

regionOverlay.addEventListener('pointermove', (event) => {
  if (!regionDrag) return;
  setRegionBoxFromPoints(regionDrag, { x: event.clientX, y: event.clientY });
});

regionOverlay.addEventListener('pointerup', (event) => {
  if (!regionDrag) return;
  setRegionBoxFromPoints(regionDrag, { x: event.clientX, y: event.clientY });
  regionDrag = null;
});

startCapture.addEventListener('click', () => {
  startRecording().catch((error) => {
    cleanupCapture();
    setRecordingState('idle');
    window.screenStudio.showAfterCapture();
    setStatus(error.message || 'Unable to start capture');
  });
});

function wireStartButton(button) {
  button.addEventListener('click', () => {
    selectProject(null);
    startRecording().catch((error) => {
      cleanupCapture();
      setRecordingState('idle');
      window.screenStudio.showAfterCapture();
      setStatus(error.message || 'Unable to start capture');
    });
  });
}

pauseCapture.addEventListener('click', pauseOrResumeRecording);
stopCapture.addEventListener('click', stopRecording);
topStopCapture.addEventListener('click', stopRecording);
stageStopCapture.addEventListener('click', stopRecording);
topPlayPreview.addEventListener('click', playOrPausePreview);
topStopPreview.addEventListener('click', stopPreviewPlayback);
dockPlayPreview.addEventListener('click', playOrPausePreview);
dockStopPreview.addEventListener('click', stopPreviewPlayback);
stagePlayPreview.addEventListener('click', playOrPausePreview);
stageStopPreview.addEventListener('click', stopPreviewPlayback);
previewTimeline.addEventListener('input', () => {
  scrubbingPreview = true;
  previewCurrentTime.textContent = formatDuration(Number(previewTimeline.value || 0));
});
previewTimeline.addEventListener('change', () => {
  if (!previewTimeline.disabled) preview.currentTime = Number(previewTimeline.value || 0) / 1000;
  scrubbingPreview = false;
  updatePreviewTimeline();
});
miniStopCapture.addEventListener('click', stopRecording);
miniAnnotationToggle.addEventListener('click', () => {
  setAnnotationInput(!annotationInputEnabled).catch((error) => {
    setStatus(error.message || 'Unable to toggle annotation tools');
  });
});
toggleTheme.addEventListener('click', toggleAppTheme);
toggleMinimalMode.addEventListener('click', () => setMinimalUi(!document.body.classList.contains('minimal-ui')));
document.addEventListener('click', (event) => {
  if (projectActionsMenu.open && !projectActionsMenu.contains(event.target)) {
    projectActionsMenu.open = false;
  }
});
preview.addEventListener('play', updatePlaybackControls);
preview.addEventListener('pause', updatePlaybackControls);
preview.addEventListener('ended', updatePlaybackControls);
preview.addEventListener('timeupdate', updatePreviewTimeline);
preview.addEventListener('loadedmetadata', () => {
  updatePlaybackControls();
  updatePreviewTimeline();
});
wireStartButton(topStartCapture);
wireStartButton(stageStartCapture);
refreshProjects.addEventListener('click', loadProjects);
projectTabs.forEach((button) => button.addEventListener('click', () => setProjectTab(button.dataset.projectTab)));
takeScreenshot.addEventListener('click', captureScreenshotProject);
newRecording.addEventListener('click', () => {
  selectProject(null);
  startRecording().catch((error) => {
    cleanupCapture();
    setRecordingState('idle');
    window.screenStudio.showAfterCapture();
    setStatus(error.message || 'Unable to start capture');
  });
});
renameProject.addEventListener('click', renameActiveProject);
dockRenameProject.addEventListener('click', renameActiveProject);
stageRenameProject.addEventListener('click', renameActiveProject);
deleteProject.addEventListener('click', deleteActiveProject);
openFolder.addEventListener('click', () => window.screenStudio.openFolder(activeProject?.path));
exportProject.addEventListener('click', () => exportProjectByProject(activeProject));
uploadProject.addEventListener('click', () => uploadProjectByProject(activeProject));

minioSettings.addEventListener('click', openMinioSettings);
closeMinioSettings.addEventListener('click', closeMinioSettingsDialog);
minioDialog.addEventListener('click', (event) => {
  if (event.target === minioDialog) closeMinioSettingsDialog();
});
testMinioSettings.addEventListener('click', testMinioForm);
minioForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await saveMinioForm();
  } catch (error) {
    minioSettingsStatus.textContent = error.message || 'Unable to save MinIO settings';
    minioSettingsStatus.dataset.state = 'error';
  }
});

trimStart.addEventListener('input', updateTimelineFill);
trimEnd.addEventListener('input', updateTimelineFill);
trimStart.addEventListener('change', persistTrim);
trimEnd.addEventListener('change', persistTrim);
playbackRate.addEventListener('change', () => {
  preview.playbackRate = Number(playbackRate.value);
  persistTrim();
});
saveTools.addEventListener('click', saveToolMetadata);

window.screenStudio.onNewRecording(() => selectProject(null));
window.screenStudio.onStopRecording(() => stopRecording());
window.screenStudio.onExportProgress((payload) => {
  const percent = Math.round(Number(payload.percent || 0));
  showJob(`${payload.message || 'Exporting'} · ${percent}%`, percent, payload.state === 'done' ? 'done' : 'running');
  if (payload.state === 'done') hideJobSoon();
});
window.screenStudio.onUploadProgress((payload) => {
  const percent = Math.round(Number(payload.percent || 0));
  showJob(`${payload.message || 'Uploading'} · ${percent}%`, percent, payload.state === 'done' ? 'done' : 'running');
  if (payload.state === 'done') hideJobSoon();
});

window.screenStudio.paths().then((paths) => {
  projectRoot.textContent = paths.videoRoot;
});
loadTheme();
loadProjectBrowserSize();
const minioConfigReady = window.screenStudio.getMinioConfig().then((config) => {
  minioConfig = config;
  refreshDiagnostics();
  return config;
});
loadDevices();
loadProjects();
refreshDiagnostics();

async function runSelfTest() {
  let watchdog = null;
  try {
    const defaultsBeforeTest = defaultCaptureMetrics();
    if (defaultsBeforeTest.captureMode !== 'full') throw new Error(`Default capture mode is not full screen: ${JSON.stringify(defaultsBeforeTest)}`);
    if (defaultsBeforeTest.audioSource !== 'auto-detect') throw new Error(`Default FFmpeg audio source is not auto-detect: ${JSON.stringify(defaultsBeforeTest)}`);
    if (defaultsBeforeTest.recordingQuality !== 'ultra') throw new Error(`Default recording quality is not ultra: ${JSON.stringify(defaultsBeforeTest)}`);
    await minioConfigReady;
    captureMode.value = 'full';
    systemAudio.checked = true;
    micAudio.checked = false;
    countdown.value = '1';
    recordingQuality.value = 'ultra';
    selectProject(null);
    watchdog = setTimeout(() => {
      if (recorderState === 'recording' || recorderState === 'selecting' || nativeCaptureSession) {
        stopRecording().catch(() => {});
      }
    }, 9000);
    await Promise.race([
      startRecording(),
      new Promise((resolve) => setTimeout(resolve, 5000))
    ]);
    if (captureMode.value === 'region' && !selectedRegion) {
      throw new Error('Region guide did not return a selection');
    }
    if (nativeCaptureSession || recorderState === 'recording') {
      await new Promise((resolve) => setTimeout(resolve, 300));
      lastMiniRecorderCheck = miniRecorderMetrics();
      if (!lastMiniRecorderCheck.bodyMiniMode || !lastMiniRecorderCheck.visible || !lastMiniRecorderCheck.stopVisible || !lastMiniRecorderCheck.annotationToggleVisible) {
        throw new Error(`Mini recorder did not appear during capture: ${JSON.stringify(lastMiniRecorderCheck)}`);
      }
      await setAnnotationInput(false);
      const toolsOffCheck = miniRecorderMetrics();
      if (toolsOffCheck.annotationToggleText !== 'Tools Off') {
        throw new Error(`Annotation tools could not turn off: ${JSON.stringify(toolsOffCheck)}`);
      }
      await setAnnotationInput(true);
      const toolsOnCheck = miniRecorderMetrics();
      if (toolsOnCheck.annotationToggleText !== 'Tools On') {
        throw new Error(`Annotation tools could not turn back on: ${JSON.stringify(toolsOnCheck)}`);
      }
      lastMiniRecorderCheck.annotationToggleCycle = {
        off: toolsOffCheck.annotationToggleText,
        on: toolsOnCheck.annotationToggleText
      };
      await new Promise((resolve) => setTimeout(resolve, 2200));
      await stopRecording();
    }
  } catch (error) {
    await window.screenStudio.completeSelfTest({
      ok: false,
      error: error.message || String(error)
    });
  } finally {
    if (watchdog) clearTimeout(watchdog);
  }
}

if (selfTestMode) {
  setTimeout(runSelfTest, 1200);
}
