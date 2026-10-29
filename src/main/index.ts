import { app, shell, BrowserWindow, ipcMain, dialog, nativeImage, Tray, Menu } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { adbService } from './adb'
import { thumbnailQueue, previewQueue } from './requestQueue'
import { checkForUpdates, getAppRuntimeInfo, openUpdateUrl } from './update'
import { scriptService, type ScriptRunRequest } from './scriptService'
import { getLogInfo, clearLogs, openLogDirectory } from './logger'
import { existsSync } from 'fs'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function getIconPath(): string {
  if (!app.isPackaged) {
    const baseDir = process.cwd()
    const icoPath = join(baseDir, 'resources/icon.ico')
    const icnsPath = join(baseDir, 'resources/icon.icns')
    const pngPath = join(baseDir, 'resources/icon.png')
    if (process.platform === 'win32' && existsSync(icoPath)) return icoPath
    if (process.platform === 'darwin' && existsSync(pngPath)) return pngPath
    if (existsSync(icnsPath)) return icnsPath
    return pngPath
  }
  const resourcesPath = process.resourcesPath
  const icoPath = join(resourcesPath, 'icon.ico')
  const icnsPath = join(resourcesPath, 'icon.icns')
  const pngPath = join(resourcesPath, 'icon.png')
  if (process.platform === 'win32' && existsSync(icoPath)) return icoPath
  if (process.platform === 'darwin' && existsSync(pngPath)) return pngPath
  if (existsSync(icnsPath)) return icnsPath
  return pngPath
}

function createWindow(): void {
  const iconPath = getIconPath()
  const appIcon = nativeImage.createFromPath(iconPath)
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    icon: appIcon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow!.show())
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.on('close', (event) => {
    if (tray && !isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  adbService.on('devices-changed', (devices) => {
    mainWindow?.webContents.send('adb:device-changed', devices)
  })
}

function registerIpcHandlers(): void {
  ipcMain.handle('adb:check', async () => {
    const result = await adbService.check()
    console.log(`[adb] 环境检测: available=${result.available} version=${result.version || '-'} path=${result.path || '-'}`)
    return result
  })
  ipcMain.handle('adb:get-devices', () => adbService.getDevices())
  ipcMain.handle('adb:connect', async (_e, host: string) => {
    const result = await adbService.connect(host)
    console.log(`[adb] 无线连接 ${host}: ${result.success ? '成功' : '失败'} - ${result.message.trim()}`)
    return result
  })
  ipcMain.handle('adb:disconnect', async (_e, serial: string) => {
    const result = await adbService.disconnect(serial)
    console.log(`[adb] 断开 ${serial}: ${result.message.trim()}`)
    return result
  })
  ipcMain.handle('adb:start-tracking', () => adbService.startTracking())
  ipcMain.handle('adb:stop-tracking', () => adbService.stopTracking())
  ipcMain.handle('adb:ls', (_e, serial: string, path: string) => adbService.listFiles(serial, path))
  ipcMain.handle('adb:root', async (_e, serial: string) => adbService.root(serial))
  ipcMain.handle('adb:remount', async (_e, serial: string) => adbService.remount(serial))

  ipcMain.handle('settings:get-auto-launch', () => {
    const settings = app.getLoginItemSettings()
    return settings.openAtLogin
  })

  ipcMain.handle('settings:set-auto-launch', (_e, enabled: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: app.getPath('exe')
    })
  })

  ipcMain.handle('app:get-info', () => getAppRuntimeInfo())
  ipcMain.handle('app:check-for-updates', (_e, force?: boolean) => checkForUpdates(force))
  ipcMain.handle('app:open-update-url', (_e, url: string) => openUpdateUrl(url))

  ipcMain.handle('logs:get-info', () => getLogInfo())
  ipcMain.handle('logs:open', () => openLogDirectory())
  ipcMain.handle('logs:clear', () => clearLogs())

  ipcMain.handle('scripts:list', () => scriptService.list())
  ipcMain.handle('scripts:read', (_e, id: string) => scriptService.read(id))
  ipcMain.handle('scripts:create', (_e, name?: string) => scriptService.create(name))
  ipcMain.handle('scripts:import', async () => {
    if (!mainWindow) return []
    return scriptService.importFromDialog(mainWindow)
  })
  ipcMain.handle('scripts:update', (_e, id: string, name: string, content: string) => scriptService.update(id, name, content))
  ipcMain.handle('scripts:delete', (_e, id: string) => scriptService.delete(id))
  ipcMain.handle('scripts:run', (_e, request: ScriptRunRequest) => scriptService.run(request))
  ipcMain.handle('scripts:stop', (_e, runId: string) => scriptService.stop(runId))

  ipcMain.on('window:focus', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      mainWindow.show()
    }
  })

  ipcMain.handle('adb:pull', async (_e, id: string, serial: string, remotePath: string, localPath: string) => {
    const { stat } = require('fs').promises
    let expectedSize = 0
    let isDirectory = false
    let totalCount = 0

    try {
      const st = await stat(localPath)
      isDirectory = st.isDirectory()
    } catch { /* not exists yet */ }

    if (isDirectory) {
      totalCount = await adbService.countRemoteFiles(serial, remotePath)
    } else {
      expectedSize = await adbService.getPathSize(serial, remotePath)
    }

    adbService.startTransferWithProgress(id, ['-s', serial, 'pull', remotePath, localPath], localPath, expectedSize, {
      onProgress: (percent, speed) => {
        mainWindow?.webContents.send('adb:transfer-progress', { id, percent, speed })
      },
      onDone: () => {
        mainWindow?.webContents.send('adb:transfer-done', { id })
      },
      onError: (err) => {
        mainWindow?.webContents.send('adb:transfer-error', { id, error: err })
      }
    }, isDirectory, totalCount)
  })

  ipcMain.handle('adb:push', async (_e, id: string, serial: string, localPath: string, remotePath: string) => {
    const { stat } = require('fs').promises
    let expectedSize = 0
    let isDirectory = false
    let totalCount = 0

    try {
      const st = await stat(localPath)
      isDirectory = st.isDirectory()
      if (isDirectory) {
        totalCount = await adbService.countLocalFiles(localPath)
      } else {
        expectedSize = st.size
      }
    } catch { /* ignore */ }

    adbService.startTransferWithProgress(id, ['-s', serial, 'push', localPath, remotePath], localPath, expectedSize, {
      onProgress: (percent, speed) => {
        mainWindow?.webContents.send('adb:transfer-progress', { id, percent, speed })
      },
      onDone: () => {
        mainWindow?.webContents.send('adb:transfer-done', { id })
      },
      onError: (err) => {
        mainWindow?.webContents.send('adb:transfer-error', { id, error: err })
      }
    }, isDirectory, totalCount)
  })

  ipcMain.handle('adb:cancel-transfer', (_e, id: string) => {
    return adbService.cancelTransfer(id)
  })

  ipcMain.handle('adb:mkdir', async (_e, serial: string, remotePath: string) => {
    return adbService.mkdir(serial, remotePath)
  })

  ipcMain.handle('adb:rename', async (_e, serial: string, oldPath: string, newPath: string) => {
    return adbService.rename(serial, oldPath, newPath)
  })

  ipcMain.handle('adb:delete', async (_e, serial: string, remotePath: string) => {
    return adbService.delete(serial, remotePath)
  })

  ipcMain.handle('adb:delete-paths', async (_e, serial: string, remotePaths: string[]) => {
    const sender = _e.sender
    return adbService.deletePaths(serial, remotePaths, (done, total, currentName) => {
      if (!sender.isDestroyed()) {
        sender.send('adb:delete-progress', { done, total, name: currentName })
      }
    })
  })

  ipcMain.handle('adb:search', async (_e, serial: string, keywords: string[], searchPath?: string) => {
    return adbService.searchFiles(serial, keywords, searchPath)
  })

  ipcMain.handle('adb:file-content', async (_e, serial: string, remotePath: string) => {
    return new Promise((resolve, reject) => {
      previewQueue.add(async () => {
        try {
          const result = await adbService.getFileContent(serial, remotePath)
          resolve(result)
        } catch (err) {
          reject(err)
        }
      })
    })
  })

  ipcMain.handle('adb:file-base64', async (_e, serial: string, remotePath: string) => {
    return new Promise((resolve, reject) => {
      thumbnailQueue.add(async () => {
        try {
          const result = await adbService.getFileAsBase64(serial, remotePath)
          resolve(result)
        } catch (err) {
          reject(err)
        }
      })
    })
  })

  ipcMain.handle('dialog:select-directory', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('dialog:select-files', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths
  })

  ipcMain.handle('dialog:select-upload-directory', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('fs:list-directory', async (_e, dirPath: string) => {
    const { readdirSync, statSync } = require('fs')
    try {
      const entries = readdirSync(dirPath)
      return entries.map((name: string) => {
        try {
          const stat = statSync(join(dirPath, name))
          return { name, isDirectory: stat.isDirectory() }
        } catch {
          return { name, isDirectory: false }
        }
      })
    } catch {
      return []
    }
  })

  ipcMain.handle('adb:relocate-paths', async (_e, serial: string, mode: 'copy' | 'move', sources: string[], destDir: string) => {
    const sender = _e.sender
    return adbService.relocatePaths(serial, mode, sources, destDir, (done, total, currentName) => {
      if (!sender.isDestroyed()) {
        sender.send('adb:relocate-progress', { mode, done, total, name: currentName })
      }
    })
  })

  ipcMain.handle('adb:paths-exist', (_e, serial: string, paths: string[]) => adbService.pathsExist(serial, paths))
}

app.whenReady().then(() => {
  console.log(
    `===== ADBTrans v${app.getVersion()} 启动 | ${process.platform} ${process.arch} | Electron ${process.versions.electron} | Node ${process.versions.node} =====`
  )
  if (process.platform === 'darwin' && app.dock) {
    const iconPath = getIconPath()
    app.dock.setIcon(nativeImage.createFromPath(iconPath))
  }
  registerIpcHandlers()
  scriptService.on('output', (payload) => mainWindow?.webContents.send('scripts:output', payload))
  scriptService.on('finished', (payload) => mainWindow?.webContents.send('scripts:finished', payload))
  createWindow()

  const iconPath = getIconPath()
  const trayIcon = nativeImage.createFromPath(iconPath)
  const resizedIcon = trayIcon.resize({ width: 22, height: 22 })
  if (process.platform === 'darwin') {
    resizedIcon.setTemplateImage(true)
  }
  tray = new Tray(resizedIcon)
  tray.setToolTip('ADBTrans')
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })

  const contextMenu = Menu.buildFromTemplate([
    { label: '打开', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: '退出', click: () => { isQuitting = true; tray?.destroy(); app.quit() } }
  ])
  tray.setContextMenu(contextMenu)

  app.on('before-quit', () => {
    console.log('[app] before-quit，正在退出')
    isQuitting = true
    scriptService.stopAll()
  })

  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    } else {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  adbService.stopTracking()
})
