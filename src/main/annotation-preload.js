const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('screenStudioAnnotation', {
  close: () => ipcRenderer.invoke('annotation:close'),
  stopRecording: () => ipcRenderer.invoke('annotation:stop-recording'),
  ready: (metrics) => ipcRenderer.invoke('annotation:ready', metrics)
});
