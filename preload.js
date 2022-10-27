const { contextBridge, ipcRenderer, clipboard, nativeImage } = require('electron')

contextBridge.exposeInMainWorld('ipcRenderer', {})