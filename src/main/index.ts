import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { adbService } from './adb'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
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

  ipcMain.handle('adb:pull', (_e, id: string, serial: string, remotePath: string, localPath: string) => {
    adbService.startTransfer(id, ['-s', serial, 'pull', remotePath, localPath], {
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

  ipcMain.handle('adb:push', (_e, id: string, serial: string, localPath: string, remotePath: string) => {
    adbService.startTransfer(id, ['-s', serial, 'push', localPath, remotePath], {
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

  ipcMain.handle('adb:file-content', async (_e, serial: string, remotePath: string) => {
    return adbService.getFileContent(serial, remotePath)
  })

  ipcMain.handle('adb:file-base64', async (_e, serial: string, remotePath: string) => {
    return adbService.getFileAsBase64(serial, remotePath)
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
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  adbService.stopTracking()
  if (process.platform !== 'darwin') app.quit()
})
