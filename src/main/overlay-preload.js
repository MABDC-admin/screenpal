const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('screenStudioOverlay', {
  select: (region) => ipcRenderer.invoke('overlay:region-selected', region),
  cancel: () => ipcRenderer.invoke('overlay:cancel')
});

