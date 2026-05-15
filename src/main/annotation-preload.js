const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('screenStudioAnnotation', {
  close: () => ipcRenderer.invoke('annotation:close'),
  setInputMode: (enabled) => ipcRenderer.invoke('annotation:set-input-mode', enabled),
  moveControlWindow: (deltaX, deltaY) => ipcRenderer.invoke('annotation:move-control-window', deltaX, deltaY),
  stopRecording: () => ipcRenderer.invoke('annotation:stop-recording'),
  ready: (metrics) => ipcRenderer.invoke('annotation:ready', metrics),
  onInputModeChange: (callback) => {
    ipcRenderer.on('annotation:input-mode', (_event, enabled) => callback(Boolean(enabled)));
  },
  onClear: (callback) => {
    ipcRenderer.on('annotation:clear', () => callback());
  }
});
