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

  pullFile: (id: string, serial: string, remotePath: string, localPath: string) => void
  pushFile: (id: string, serial: string, localPath: string, remotePath: string) => void
  cancelTransfer: (id: string) => Promise<boolean>
  mkdir: (serial: string, remotePath: string) => Promise<void>
  rename: (serial: string, oldPath: string, newPath: string) => Promise<void>
  deletePath: (serial: string, remotePath: string) => Promise<void>
  getFileContent: (serial: string, remotePath: string) => Promise<string>
  getFileBase64: (serial: string, remotePath: string) => Promise<string>
  selectDirectory: () => Promise<string | null>
  selectFiles: () => Promise<string[] | null>
  selectUploadDirectory: () => Promise<string | null>
  startDrag: (serial: string, remotePath: string, fileName: string) => void

  onTransferProgress: (callback: (data: { id: string; percent: number; speed: string }) => void) => void
  onTransferDone: (callback: (data: { id: string }) => void) => void
  onTransferError: (callback: (data: { id: string; error: string }) => void) => void
}

interface Window { api: ElectronAPI }
