interface AdbCheckResult { available: boolean; version: string; path: string }
interface DeviceInfo { serial: string; state: string; model?: string }
interface ConnectResult { success: boolean; message: string }
interface FileEntry { name: string; path: string; size: number; modified: string; type: 'file' | 'folder' | 'symlink'; permission: string }

interface ElectronAPI {
  checkAdb: () => Promise<AdbCheckResult>
  getDevices: () => Promise<DeviceInfo[]>
  connectDevice: (host: string) => Promise<ConnectResult>
  disconnectDevice: (serial: string) => Promise<ConnectResult>
  startDeviceTracking: () => void
  stopDeviceTracking: () => void
  onDeviceChanged: (callback: (devices: DeviceInfo[]) => void) => void
  listFiles: (serial: string, path: string) => Promise<FileEntry[]>
}

interface Window { api: ElectronAPI }
