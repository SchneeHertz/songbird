const { contextBridge, ipcRenderer, clipboard, nativeImage } = require('electron')

contextBridge.exposeInMainWorld('ipcRenderer', {
  'load-setting': ()=>ipcRenderer.invoke('load-setting'),
  'save-setting': (receiveSetting)=>ipcRenderer.invoke('save-setting', receiveSetting),
  'select-folder': ()=>ipcRenderer.invoke('select-folder'),
  'select-file': ()=>ipcRenderer.invoke('select-file'),
  'send-message': (func)=>ipcRenderer.on('send-message', func),
  'load-image-list': (param)=>ipcRenderer.invoke('load-image-list', param),
  'force-load-image-list': ()=>ipcRenderer.invoke('force-load-image-list'),
  'send-image': (func)=>ipcRenderer.on('send-image', func),
  'update-image': (imageObject)=>ipcRenderer.invoke('update-image', imageObject),
  'set-progress-bar': (progress)=>ipcRenderer.invoke('set-progress-bar', progress),
  'open-local-image': (filepath)=>ipcRenderer.invoke('open-local-image', filepath),
  'show-file': (filepath)=>ipcRenderer.invoke('show-file', filepath),
  'search-folder': (param)=>ipcRenderer.invoke('search-folder', param),
  'get-locale': ()=>ipcRenderer.invoke('get-locale'),
  'refresh-thumb': ()=>ipcRenderer.invoke('refresh-thumb'),
  'get-crawler-list': ()=>ipcRenderer.invoke('get-crawler-list'),
  'get-tag-by-crawler': (param)=>ipcRenderer.invoke('get-tag-by-crawler', param),
  'open-tag-crawler-path': ()=>ipcRenderer.invoke('open-tag-crawler-path'),
  'open-store-path': ()=>ipcRenderer.invoke('open-store-path'),
})

contextBridge.exposeInMainWorld('electronFunction', {
  'copy-image-to-clipboard': (filepath)=>clipboard.writeImage(nativeImage.createFromPath(filepath)),
  'copy-text-to-clipboard': (text)=>clipboard.writeText(text),
  'read-text-from-clipboard': ()=>clipboard.readText()
})