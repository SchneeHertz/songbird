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
})