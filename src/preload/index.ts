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
    ipcRenderer.invoke('adb:ls', serial, path)
}

contextBridge.exposeInMainWorld('api', api)
