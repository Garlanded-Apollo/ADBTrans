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
}

interface Window { api: ElectronAPI }
