const { app, BrowserWindow } =require('electron')
const path = require('path')
const fs = require('fs')

let STORE_PATH = app.getPath('userData')
if (!fs.existsSync(STORE_PATH)) {
  fs.mkdirSync(STORE_PATH)
}

let mainWindow

function createWindow () {
  const win = new BrowserWindow({
    width: 1560,
    height: 1000,
    webPreferences: {
      webSecurity: app.isPackaged ? true : false,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  })

  if (app.isPackaged) {
    win.loadFile('dist/index.html')
  } else {
    win.loadURL('http://localhost:5173')
  }
  win.setMenuBarVisibility(false)
  win.webContents.on('did-finish-load', ()=>{
    let name = require('./package.json').name
    let version = require('./package.json').version
    win.setTitle(name + ' ' + version)
  })
  win.once('ready-to-show', () => {
    win.show()
  })
  return win
}

app.disableHardwareAcceleration()
app.whenReady().then(()=>{
  mainWindow = createWindow()
})
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createWindow()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})