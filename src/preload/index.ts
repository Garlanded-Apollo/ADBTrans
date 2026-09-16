import { contextBridge, ipcRenderer, webUtils } from 'electron'

interface AppRuntimeInfo {
  version: string
  platform: 'mac' | 'win' | 'unsupported'
  architecture: 'arm64' | 'x64' | 'ia32' | 'unsupported'
  platformLabel: string
}

interface UpdateCheckResult extends AppRuntimeInfo {
  latestVersion: string | null
  updateAvailable: boolean
  assetAvailable: boolean
  downloadUrl: string | null
  releaseUrl: string
  releaseNotes: string
  publishedAt: string | null
  noRelease: boolean
}

interface AdbScript {
  id: string
  name: string
  fileName: string
  platform: 'mac' | 'win'
  source: 'custom' | 'imported'
  createdAt: number
  updatedAt: number
  lastRunAt?: number
}

interface ScriptReadResult { script: AdbScript; content: string }
interface ScriptOutput { runId: string; stream: 'stdout' | 'stderr' | 'system'; text: string }
interface ScriptFinished { runId: string; code: number | null; signal: string | null }

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
  adbRoot: (serial: string): Promise<boolean> =>
    ipcRenderer.invoke('adb:root', serial),
  adbRemount: (serial: string): Promise<boolean> =>
    ipcRenderer.invoke('adb:remount', serial),

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
  selectUploadDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:select-upload-directory'),
  listLocalDirectory: (dirPath: string): Promise<{ name: string; isDirectory: boolean }[]> =>
    ipcRenderer.invoke('fs:list-directory', dirPath),
  startDrag: (serial: string, remotePath: string, fileName: string): void => {
    ipcRenderer.send('adb:download-for-drag', serial, remotePath, fileName)
  },
  dragDownload: (serial: string, files: Array<{ remotePath: string; fileName: string; taskId: string; cacheKey: string }>): void => {
    ipcRenderer.send('adb:drag-download', serial, files)
  },
  searchFiles: (serial: string, keywords: string[], searchPath?: string): Promise<Array<{ name: string; path: string; type: 'file' | 'folder' }>> =>
    ipcRenderer.invoke('adb:search', serial, keywords, searchPath),
  getFilePath: (file: File): string => {
    return webUtils.getPathForFile(file)
  },
  getAutoLaunch: (): Promise<boolean> =>
    ipcRenderer.invoke('settings:get-auto-launch'),
  setAutoLaunch: (enabled: boolean): Promise<void> =>
    ipcRenderer.invoke('settings:set-auto-launch', enabled),
  getAppInfo: (): Promise<AppRuntimeInfo> =>
    ipcRenderer.invoke('app:get-info'),
  checkForUpdates: (force?: boolean): Promise<UpdateCheckResult> =>
    ipcRenderer.invoke('app:check-for-updates', force),
  openUpdateUrl: (url: string): Promise<void> =>
    ipcRenderer.invoke('app:open-update-url', url),
  focusWindow: (): void => {
    ipcRenderer.send('window:focus')
  },

  listScripts: (): Promise<AdbScript[]> => ipcRenderer.invoke('scripts:list'),
  readScript: (id: string): Promise<ScriptReadResult> => ipcRenderer.invoke('scripts:read', id),
  createScript: (name?: string): Promise<ScriptReadResult> => ipcRenderer.invoke('scripts:create', name),
  importScripts: (): Promise<AdbScript[]> => ipcRenderer.invoke('scripts:import'),
  updateScript: (id: string, name: string, content: string): Promise<AdbScript> => ipcRenderer.invoke('scripts:update', id, name, content),
  deleteScript: (id: string): Promise<void> => ipcRenderer.invoke('scripts:delete', id),
  runScript: (request: { scriptId: string; serial: string; model?: string; args: string[] }): Promise<string> => ipcRenderer.invoke('scripts:run', request),
  stopScript: (runId: string): Promise<boolean> => ipcRenderer.invoke('scripts:stop', runId),
  onScriptOutput: (callback: (payload: ScriptOutput) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: ScriptOutput): void => callback(payload)
    ipcRenderer.on('scripts:output', listener)
    return () => ipcRenderer.removeListener('scripts:output', listener)
  },
  onScriptFinished: (callback: (payload: ScriptFinished) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: ScriptFinished): void => callback(payload)
    ipcRenderer.on('scripts:finished', listener)
    return () => ipcRenderer.removeListener('scripts:finished', listener)
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
