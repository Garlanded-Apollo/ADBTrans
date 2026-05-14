import { contextBridge, ipcRenderer } from 'electron'

const api = {
  checkAdb: (): Promise<{ available: boolean; version: string; path: string }> =>
    ipcRenderer.invoke('adb:check'),
  getDevices: (): Promise<{ serial: string; state: string; model?: string }[]> =>
    ipcRenderer.invoke('adb:get-devices'),
  connectDevice: (host: string): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('adb:connect', host),
  disconnectDevice: (serial: string): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('adb:disconnect', serial),
  startDeviceTracking: (): void => { ipcRenderer.invoke('adb:start-tracking') },
  stopDeviceTracking: (): void => { ipcRenderer.invoke('adb:stop-tracking') },
  onDeviceChanged: (callback: (devices: { serial: string; state: string; model?: string }[]) => void): void => {
    ipcRenderer.on('adb:device-changed', (_event, devices) => callback(devices))
  },
  listFiles: (serial: string, path: string): Promise<{ name: string; path: string; size: number; modified: string; type: string; permission: string }[]> =>
    ipcRenderer.invoke('adb:ls', serial, path),

  pullFile: (id: string, serial: string, remotePath: string, localPath: string): void => {
    ipcRenderer.invoke('adb:pull', id, serial, remotePath, localPath)
  },
  pushFile: (id: string, serial: string, localPath: string, remotePath: string): void => {
    ipcRenderer.invoke('adb:push', id, serial, localPath, remotePath)
  },
  cancelTransfer: (id: string): Promise<boolean> =>
    ipcRenderer.invoke('adb:cancel-transfer', id),
  mkdir: (serial: string, remotePath: string): Promise<void> =>
    ipcRenderer.invoke('adb:mkdir', serial, remotePath),
  rename: (serial: string, oldPath: string, newPath: string): Promise<void> =>
    ipcRenderer.invoke('adb:rename', serial, oldPath, newPath),
  deletePath: (serial: string, remotePath: string): Promise<void> =>
    ipcRenderer.invoke('adb:delete', serial, remotePath),
  getFileContent: (serial: string, remotePath: string): Promise<string> =>
    ipcRenderer.invoke('adb:file-content', serial, remotePath),
  getFileBase64: (serial: string, remotePath: string): Promise<string> =>
    ipcRenderer.invoke('adb:file-base64', serial, remotePath),
  selectDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:select-directory'),
  selectFiles: (): Promise<string[] | null> =>
    ipcRenderer.invoke('dialog:select-files'),
  startDrag: (serial: string, remotePath: string, fileName: string): void => {
    ipcRenderer.send('adb:start-drag', serial, remotePath, fileName)
  },

  onTransferProgress: (callback: (data: { id: string; percent: number; speed: string }) => void): void => {
    ipcRenderer.on('adb:transfer-progress', (_event, data) => callback(data))
  },
  onTransferDone: (callback: (data: { id: string }) => void): void => {
    ipcRenderer.on('adb:transfer-done', (_event, data) => callback(data))
  },
  onTransferError: (callback: (data: { id: string; error: string }) => void): void => {
    ipcRenderer.on('adb:transfer-error', (_event, data) => callback(data))
  }
}

contextBridge.exposeInMainWorld('api', api)
