const { contextBridge, ipcRenderer, clipboard, nativeImage } = require('electron')

contextBridge.exposeInMainWorld('ipcRenderer', {
  'load-setting': ()=>ipcRenderer.invoke('load-setting'),
  'save-setting': (receiveSetting)=>ipcRenderer.invoke('save-setting', receiveSetting),
  'select-folder': ()=>ipcRenderer.invoke('select-folder'),
  'select-file': ()=>ipcRenderer.invoke('select-file'),
  'send-message': (func)=>ipcRenderer.on('send-message', func),
  'load-image-list': (scan)=>ipcRenderer.invoke('load-image-list', scan),
  'force-load-image-list': ()=>ipcRenderer.invoke('force-load-image-list'),
  'send-image': (func)=>ipcRenderer.on('send-image', func),
  'update-image': (imageObject)=>ipcRenderer.invoke('update-image', imageObject),
  'set-progress-bar': (progress)=>ipcRenderer.invoke('set-progress-bar', progress),
  'open-local-image': (filepath)=>ipcRenderer.invoke('open-local-image', filepath),
  'show-file': (filepath)=>ipcRenderer.invoke('show-file', filepath),
  'search-folder': (folder)=>ipcRenderer.invoke('search-folder', folder),
  'get-locale': ()=>ipcRenderer.invoke('get-locale'),
  'refresh-thumb': ()=>ipcRenderer.invoke('refresh-thumb'),
})