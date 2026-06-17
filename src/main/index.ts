import { app, shell, BrowserWindow, ipcMain, dialog, nativeImage, Tray, Menu } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { adbService } from './adb'
import { thumbnailQueue, previewQueue } from './requestQueue'
import { existsSync } from 'fs'
import { tmpdir } from 'os'

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
  ipcMain.handle('adb:check', () => adbService.check())
  ipcMain.handle('adb:get-devices', () => adbService.getDevices())
  ipcMain.handle('adb:connect', (_e, host: string) => adbService.connect(host))
  ipcMain.handle('adb:disconnect', (_e, serial: string) => adbService.disconnect(serial))
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

  ipcMain.on('window:focus', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      mainWindow.show()
    }
  })

  ipcMain.handle('adb:pull', async (_e, id: string, serial: string, remotePath: string, localPath: string) => {
    const expectedSize = await adbService.getPathSize(serial, remotePath)
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
    })
  })

  ipcMain.handle('adb:push', async (_e, id: string, serial: string, localPath: string, remotePath: string) => {
    const { stat } = require('fs').promises
    let expectedSize = 0
    try {
      const st = await stat(localPath)
      if (st.isDirectory()) {
        const getDirSizeAsync = async (dir: string): Promise<number> => {
          let size = 0
          try {
            const { readdir } = require('fs').promises
            const { join } = require('path')
            const entries = await readdir(dir, { withFileTypes: true } as any)
            for (const entry of entries) {
              const fullPath = join(dir, entry.name)
              try {
                const s = await stat(fullPath)
                if (entry.isDirectory()) {
                  size += await getDirSizeAsync(fullPath)
                } else {
                  size += s.size
                }
              } catch { /* skip */ }
            }
          } catch { /* skip */ }
          return size
        }
        expectedSize = await getDirSizeAsync(localPath)
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
    })
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

  ipcMain.on('adb:start-drag', async (_e, serial: string, remotePath: string, fileName: string) => {
    const tempDir = join(tmpdir(), 'adbtrans-drag')
    const tempFile = join(tempDir, fileName)

    try {
      const { mkdirSync } = require('fs')
      mkdirSync(tempDir, { recursive: true })

      await new Promise<void>((resolve, reject) => {
        adbService.startTransfer('drag-' + Date.now(), ['-s', serial, 'pull', remotePath, tempFile], {
          onProgress: () => {},
          onDone: () => resolve(),
          onError: (err) => reject(new Error(err))
        })
      })

      if (mainWindow && existsSync(tempFile)) {
        mainWindow.webContents.startDrag({
          file: tempFile,
          icon: nativeImage.createFromPath(tempFile)
        })
      }
    } catch (err) {
      console.error('Drag failed:', err)
    }
  })
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    const iconPath = getIconPath()
    app.dock.setIcon(nativeImage.createFromPath(iconPath))
  }
  registerIpcHandlers()
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
    isQuitting = true
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
