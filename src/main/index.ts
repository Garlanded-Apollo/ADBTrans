import { app, shell, BrowserWindow, ipcMain, dialog, nativeImage } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { adbService } from './adb'
import { thumbnailQueue, previewQueue } from './requestQueue'
import { existsSync } from 'fs'
import { tmpdir } from 'os'

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
  ipcMain.handle('adb:root', async (_e, serial: string) => adbService.root(serial))
  ipcMain.handle('adb:remount', async (_e, serial: string) => adbService.remount(serial))

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
    const { statSync } = require('fs')
    let expectedSize = 0
    try {
      const stat = statSync(localPath)
      if (stat.isDirectory()) {
        const getDirSize = (dir: string): number => {
          let size = 0
          try {
            const { readdirSync } = require('fs')
            const entries = readdirSync(dir, { withFileTypes: true } as any)
            for (const entry of entries) {
              const fullPath = require('path').join(dir, entry.name)
              if (entry.isDirectory()) {
                size += getDirSize(fullPath)
              } else {
                try { size += statSync(fullPath).size } catch { /* skip */ }
              }
            }
          } catch { /* skip */ }
          return size
        }
        expectedSize = getDirSize(localPath)
      } else {
        expectedSize = stat.size
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
