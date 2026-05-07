import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { adbService } from './adb'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
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

  mainWindow.on('ready-to-show', () => mainWindow.show())
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
    mainWindow.webContents.send('adb:device-changed', devices)
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
