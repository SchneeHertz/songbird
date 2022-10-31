const { app, BrowserWindow, ipcMain, session, dialog, shell } =require('electron')
const path = require('path')
const fs = require('fs')
const process = require('process')
const { spawn } = require('child_process')
const { promisify, format } = require('util')
const { createHash } = require('crypto')
const _ = require('lodash')
const sharp = require('sharp')
const glob = require('glob')
const { Sequelize, DataTypes, Op } = require('sequelize')

const STORE_PATH = app.getPath('userData')
const THUMB_PATH = path.join(STORE_PATH, 'thumb')
try {
  fs.mkdirSync(STORE_PATH)
  fs.mkdirSync(THUMB_PATH)
} catch (err) {}

let setting
try {
  setting = JSON.parse(fs.readFileSync(path.join(STORE_PATH, 'setting.json'), {encoding: 'utf-8'}))
} catch {
  setting = {
    library: [app.getPath('pictures')],
    imageExplorer: 'C:\\Windows\\explorer.exe',
    loadOnStart: false,
    language: 'default',
    deepdanbooruTagScoreThreshold: 0,
    waterfallGap: 10,
    waterfallThumbWidth: 200
  }
  fs.writeFileSync(path.join(STORE_PATH, 'setting.json'), JSON.stringify(setting, null, '  '), {encoding: 'utf-8'})
}

let logFile = fs.createWriteStream(path.join(STORE_PATH, 'log.txt'), {flags: 'w'})
let logStdout = process.stdout

console.log = (message)=>{
  logFile.write(format(message) + '\n')
  logStdout.write(format(message) + '\n')
}

let sendMessageToWebContents = (message)=>{
  console.log(message)
  mainWindow.webContents.send('send-message', message)
}

let mainWindow
function createWindow () {
  const win = new BrowserWindow({
    width: 1280,
    height: 768,
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
app.on('ready', async () => {
  if (!app.isPackaged) {
    await session.defaultSession.loadExtension(path.resolve(__dirname,'./devtools'))
  }
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})


// basic
ipcMain.handle('set-progress-bar', async(event, progress)=>{
  mainWindow.setProgressBar(progress)
})


//database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(STORE_PATH, 'database.sqlite'),
  logging: false
})
const Image = sequelize.define('Image', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true
  },
  filename: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  path: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  folder: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  library: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  addTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  modifyTime: {
    type: DataTypes.DATE
  },
  scanTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  mark: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  width: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  height: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  thumbPath: {
    type: DataTypes.TEXT
  },
  thumbWidth: {
    type: DataTypes.FLOAT
  },
  thumbHeight: {
    type: DataTypes.FLOAT
  },
})
;(async()=>{
  await Image.sync({ alter: true })
})()


// library
const getImageList = async (libraryPath)=>{
  let imageList = await promisify(glob)('**/*.@(jpg|jpeg|png|gif|webp|avif)', {
    cwd: libraryPath,
    nocase: true
  })
  return imageList.map(fn=>path.join(libraryPath, fn))
}

const createThumb = async (imagePath)=>{
  let imageHash = createHash('sha1').update(await fs.promises.readFile(imagePath)).digest('hex')
  let thumbPath = path.join(THUMB_PATH, imageHash + '.webp')
  await sharp(imagePath)
  .resize({width: 512})
  .toFormat('webp')
  .toFile(thumbPath)
  .catch((e)=>{
    sendMessageToWebContents(`generate cover from ${filepath} failed because ${e}`)
    return false
  })
  return thumbPath
}

ipcMain.handle('refresh-thumb', async ()=>{
  try {
    fs.mkdirSync(THUMB_PATH)
  } catch (err) {}
  let { count, rows } = await Image.findAndCountAll()
  let allCount = count
  let nowCount = 0
  for (let imageInd of rows) {
    let imageHash = createHash('sha1').update(await fs.promises.readFile(imageInd.path)).digest('hex')
    let thumbPath = path.join(THUMB_PATH, imageHash + '.webp')
    try {
      await fs.promises.access(thumbPath, fs.constants.R_OK)
    } catch {
      let {width, height} = await sharp(imageInd.path).metadata()
      await sharp(imageInd.path)
      .resize({width: 512})
      .toFormat('webp')
      .toFile(thumbPath)
      .catch((e)=>{
        sendMessageToWebContents(`generate thumb from ${imageInd.path} failed because ${e}`)
        return false
      })
      imageInd.thumbPath = thumbPath
      imageInd.thumbWidth = 512
      imageInd.thumbHeight = Math.floor(512 * height / width)
      await imageInd.save()
    }
    nowCount++
    mainWindow.setProgressBar(nowCount/allCount)
  }
  mainWindow.setProgressBar(-1)
  return
})

ipcMain.handle('load-image-list', async (event, scan)=>{
  if (scan) {
    let allCount = 0
    let nowCount = 0
    let dateStartScan = new Date()
    let libraryArray = []
    for (let libraryPath of setting.library) {
      try {
        let imageList = await getImageList(libraryPath)
        allCount += imageList.length
        libraryArray.push({
          libraryPath,
          imageList
        })
      } catch (error) {
        sendMessageToWebContents(`load library ${libraryPath} failed because ${error}`)
      }
    }
    for (let {libraryPath, imageList} of libraryArray) {
      try {
        for (let imagePath of imageList) {
          let findResult = await Image.findOne({
            where: {
              path: imagePath,
              library: libraryPath
            }
          })
          if (findResult) {
            findResult.update({scanTime: dateStartScan})
          } else {
            let subFolder = path.relative(libraryPath, path.dirname(imagePath))
            if (subFolder === '') {
              subFolder = []
            } else {
              subFolder = subFolder.split(path.sep)
            }
            let {width, height} = await sharp(imagePath).metadata()
            let thumbPath = await createThumb(imagePath)
            let thumbObj = {
              thumbPath,
              thumbWidth: 512,
              thumbHeight: Math.floor(512 * height / width)
            }
            await Image.create({
              filename: path.basename(imagePath),
              path: imagePath,
              folder: [path.basename(libraryPath), ...subFolder].join('||'),
              library: libraryPath,
              modifyTime: (await fs.promises.stat(imagePath)).mtime,
              width,
              height,
              ...thumbObj
            })
          }
          nowCount++
          mainWindow.setProgressBar(nowCount/allCount)
        }
        let scanResult = await Image.findAll({
          raw: true,
          where: {
            library: libraryPath,
            scanTime: {
              [Op.gte]: dateStartScan
            }
          }
        })
        mainWindow.webContents.send('send-image', scanResult)
      } catch (error) {
        sendMessageToWebContents(`load library ${libraryPath} failed because ${error}`)
      }
    }
    await Image.destroy({
      where: {
        scanTime: {
          [Op.lt]: dateStartScan
        }
      }
    })
    mainWindow.setProgressBar(-1)
  } else {
    let loadResult = await Image.findAll({raw: true})
    mainWindow.webContents.send('send-image', loadResult)
  }
  let folderData = await Image.findAll({
    raw: true,
    attributes: ['folder']
  })
  sendMessageToWebContents('loaded success')
  return _.sortedUniq(_.sortBy(folderData.map(f=>f.folder)))
})

ipcMain.handle('force-load-image-list', async ()=>{
  Image.destroy({
    truncate: true
  })
  let allCount = 0
  let nowCount = 0
  let libraryArray = []
  for (let libraryPath of setting.library) {
    try {
      let imageList = await getImageList(libraryPath)
      allCount += imageList.length
      libraryArray.push({
        libraryPath,
        imageList
      })
    } catch (error) {
      sendMessageToWebContents(`load library ${libraryPath} failed because ${error}`)
    }
  }
  for (let {libraryPath, imageList} of libraryArray) {
    try {
      for (let imagePath of imageList) {
        let subFolder = path.relative(libraryPath, path.dirname(imagePath))
        if (subFolder === '') {
          subFolder = []
        } else {
          subFolder = subFolder.split(path.sep)
        }
        let {width, height} = await sharp(imagePath).metadata()
        let thumbPath = await createThumb(imagePath)
        let thumbObj = {
          thumbPath,
          thumbWidth: 512,
          thumbHeight: Math.floor(512 * height / width)
        }
        await Image.create({
          filename: path.basename(imagePath),
          path: imagePath,
          folder: [path.basename(libraryPath), ...subFolder].join('||'),
          library: libraryPath,
          modifyTime: (await fs.promises.stat(imagePath)).mtime,
          width, height,
          ...thumbObj
        })
        nowCount++
        mainWindow.setProgressBar(nowCount/allCount)
      }
      let scanResult = await Image.findAll({
        raw: true,
        where: {
          library: libraryPath
        }
      })
      mainWindow.webContents.send('send-image', scanResult)
    } catch (error) {
      sendMessageToWebContents(`load library ${libraryPath} failed because ${error}`)
    }
    mainWindow.setProgressBar(-1)
  }
  let folderData = await Image.findAll({
    raw: true,
    attributes: ['folder']
  })
  sendMessageToWebContents('force loaded success')
  return _.sortedUniq(_.sortBy(folderData.map(f=>f.folder)))
})

ipcMain.handle('open-local-image', async (event, filepath)=>{
  spawn(setting.imageExplorer, [filepath])
})

ipcMain.handle('show-file', async (event, filepath)=>{
  shell.showItemInFolder(filepath)
})


// folder
ipcMain.handle('search-folder', async(event, folder)=>{
  let result = await Image.findAll({
    raw: true,
    where: {
      folder: {
        [Op.startsWith]: folder.join('||')
      }
    }
  })
  mainWindow.webContents.send('send-image', result)
  sendMessageToWebContents('loaded success')
})


// tags
ipcMain.handle('update-image', async (event, imageObject)=>{
  imageObject.folder = imageObject.folder.join('||')
  return await Image.update(imageObject, {
    where: {
      id: imageObject.id
    }
  })
})


// setting
ipcMain.handle('select-folder', async ()=>{
  let result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  if (!result.canceled) {
    return result.filePaths[0]
  } else {
    return undefined
  }
})

ipcMain.handle('select-file', async ()=>{
  let result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile']
  })
  if (!result.canceled) {
    return result.filePaths[0]
  } else {
    return undefined
  }
})

ipcMain.handle('load-setting', async ()=>{
  return JSON.parse(await fs.promises.readFile(path.join(STORE_PATH, 'setting.json'), {encoding: 'utf-8'}))
})

ipcMain.handle('save-setting', async (event, receiveSetting)=>{
  setting = receiveSetting
  return await fs.promises.writeFile(path.join(STORE_PATH, 'setting.json'), JSON.stringify(setting, null, '  '), {encoding: 'utf-8'})
})

ipcMain.handle('get-locale', async(event, arg)=>{
  return app.getLocale()
})
