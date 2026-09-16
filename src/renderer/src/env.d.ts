/// <reference types="vite/client" />

interface AdbCheckResult { available: boolean; version: string; path: string }
interface DeviceInfo { serial: string; state: string; model?: string }
interface ConnectResult { success: boolean; message: string }
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

interface ElectronAPI {
  checkAdb: () => Promise<AdbCheckResult>
  getDevices: () => Promise<DeviceInfo[]>
  connectDevice: (host: string) => Promise<ConnectResult>
  disconnectDevice: (serial: string) => Promise<ConnectResult>
  startDeviceTracking: () => void
  stopDeviceTracking: () => void
  onDeviceChanged: (callback: (devices: DeviceInfo[]) => void) => void
  getAppInfo: () => Promise<AppRuntimeInfo>
  checkForUpdates: (force?: boolean) => Promise<UpdateCheckResult>
  openUpdateUrl: (url: string) => Promise<void>
  searchFiles: (serial: string, keywords: string[], searchPath?: string) => Promise<Array<{ name: string; path: string; type: 'file' | 'folder' }>>
  listScripts: () => Promise<AdbScript[]>
  readScript: (id: string) => Promise<ScriptReadResult>
  createScript: (name?: string) => Promise<ScriptReadResult>
  importScripts: () => Promise<AdbScript[]>
  updateScript: (id: string, name: string, content: string) => Promise<AdbScript>
  deleteScript: (id: string) => Promise<void>
  runScript: (request: { scriptId: string; serial: string; model?: string; args: string[] }) => Promise<string>
  stopScript: (runId: string) => Promise<boolean>
  onScriptOutput: (callback: (payload: ScriptOutput) => void) => () => void
  onScriptFinished: (callback: (payload: ScriptFinished) => void) => () => void
}

interface Window { api: ElectronAPI }
