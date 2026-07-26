import { execFile, spawn } from 'child_process'
import { EventEmitter } from 'events'
import { basename, join } from 'path'
import { existsSync } from 'fs'
import { app } from 'electron'

export interface DeviceInfo {
  serial: string
  state: 'device' | 'offline' | 'unauthorized' | 'unknown'
  model?: string
}

export interface AdbCheckResult {
  available: boolean
  version: string
  path: string
}

export interface FileEntry {
  name: string
  path: string
  size: number
  modified: string
  type: 'file' | 'folder' | 'symlink'
  permission: string
}

export interface TransferProgress {
  id: string
  percent: number
  speed: string
  transferred: string
}

export interface TransferCallbacks {
  onProgress: (percent: number, speed: string) => void
  onDone: () => void
  onError: (err: string) => void
}

function getBundledAdbPath(): string {
  const isDev = !app.isPackaged
  
  if (isDev) {
    const baseDir = process.cwd()
    if (process.platform === 'win32') {
      return join(baseDir, 'resources/adb/win/adb.exe')
    }
    return join(baseDir, 'resources/adb/mac/adb')
  }
  
  const resourcesPath = process.resourcesPath
  if (process.platform === 'win32') {
    return join(resourcesPath, 'adb/adb.exe')
  }
  return join(resourcesPath, 'adb/adb')
}

const COMMON_PATHS = [
  '/opt/homebrew/bin/adb',
  '/usr/local/bin/adb',
  '/usr/bin/adb',
  'C:\\Program Files\\Android\\Android Studio\\platform-tools\\adb.exe',
  'C:\\Android\\platform-tools\\adb.exe'
]

function findAdb(): string {
  const bundled = getBundledAdbPath()
  if (existsSync(bundled)) {
    console.log('[findAdb] using bundled:', bundled)
    return bundled
  }

  const cmd = process.platform === 'win32' ? 'adb.exe' : 'adb'
  const sep = process.platform === 'win32' ? ';' : ':'
  for (const dir of (process.env.PATH || '').split(sep)) {
    try {
      const full = join(dir, cmd)
      if (existsSync(full)) return full
    } catch { continue }
  }
  for (const p of COMMON_PATHS) {
    try { if (existsSync(p)) return p } catch { continue }
  }
  return cmd
}

function execAdb(args: string[], timeout = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    const adbPath = findAdb()
    execFile(adbPath, args, { timeout, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`ADB error: ${err.message}\nstderr: ${stderr}`))
        return
      }
      resolve(stdout.trim())
    })
  })
}

function parseState(raw: string): DeviceInfo['state'] {
  const s = raw.split(/\s+/)[0] || 'unknown'
  return (['device', 'offline', 'unauthorized'] as const).includes(s as any) ? (s as DeviceInfo['state']) : 'unknown'
}

function parseDevicesSimple(output: string): DeviceInfo[] {
  const devices: DeviceInfo[] = []
  for (const raw of output.split('\n')) {
    const line = raw.trim()
    if (!line || line === 'List of devices attached') continue
    let serial: string, stateRaw: string
    if (line.includes('\t')) {
      const [s, ...rest] = line.split('\t')
      serial = s; stateRaw = rest[0] || 'unknown'
    } else {
      const m = line.match(/^(\S+)\s+(\S+)/)
      if (!m) continue
      serial = m[1]; stateRaw = m[2]
    }
    devices.push({ serial, state: parseState(stateRaw) })
  }
  return devices
}

const MONTHS: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' }

function normalizeDate(datePart: string, timeOrYear: string): string {
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return `${datePart}T${timeOrYear}:00`
  // MMM DD HH:MM or MMM DD YYYY (e.g. "May  7 10:30" or "May  7 2026")
  const m = datePart.match(/^([A-Z][a-z]{2})\s+(\d{1,2})$/)
  if (m) {
    const month = MONTHS[m[1]] || '01'
    const day = m[2].padStart(2, '0')
    const time = timeOrYear.includes(':') ? timeOrYear : '00:00'
    const year = timeOrYear.includes(':') ? new Date().getFullYear() : timeOrYear
    return `${year}-${month}-${day}T${time}:00`
  }
  return `${datePart}T${timeOrYear}:00`
}

function parseLsLine(line: string, parentPath: string): FileEntry | null {
  if (!line || line.startsWith('total')) return null

  const parts = line.split(/\s+/)
  if (parts.length < 7) return null

  const perm = parts[0]
  if (perm.length !== 10 || !/^[dls\-]/.test(perm)) {
    console.log('[parseLsLine] BAD PERM:', JSON.stringify(perm), 'len:', perm.length)
    return null
  }

  const sizeStr = parts[4]
  const dateRaw = `${parts[5]} ${parts[6]}`
  const rawName = parts.slice(7).join(' ')
  if (!rawName) {
    console.log('[parseLsLine] EMPTY NAME, parts:', parts.length, parts)
    return null
  }

  console.log('[parseLsLine] OK:', { perm, sizeStr, dateRaw, rawName })

  const symlinkMatch = rawName.match(/^(.+)\s+->\s+.+$/)
  const name = (symlinkMatch ? symlinkMatch[1] : rawName).trim()
  if (name === '.' || name === '..' || name.startsWith('/')) return null

  const [datePart, timePart] = dateRaw.split(/\s+/)
  const modified = normalizeDate(datePart, timePart || '00:00')

  let type: FileEntry['type'] = 'file'
  if (perm.startsWith('d')) type = 'folder'
  else if (perm.startsWith('l')) type = 'symlink'

  const parent = parentPath.replace(/\/+$/, '') || '/'
  const size = parseInt(sizeStr, 10) || 0

  return { name, path: parent === '/' ? `/${name}` : `${parent}/${name}`, size, modified, type, permission: perm.slice(1) }
}

function parseLsOutput(output: string, parentPath: string): FileEntry[] {
  console.log('[parseLsOutput] raw output:\n' + output)
  const entries: FileEntry[] = []
  for (const line of output.split('\n')) {
    const entry = parseLsLine(line.trim(), parentPath)
    if (entry) entries.push(entry)
  }
  console.log('[parseLsOutput] parsed entries:', entries.length)
  entries.sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1
    if (a.type !== 'folder' && b.type === 'folder') return 1
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  })
  return entries
}

export class AdbService extends EventEmitter {
  private tracker: ReturnType<typeof spawn> | null = null
  private _devices: DeviceInfo[] = []
  private _adbCheckResult: AdbCheckResult | null = null
  private activeTransfers = new Map<string, ReturnType<typeof spawn>>()

  get devices(): DeviceInfo[] { return this._devices }

  async check(): Promise<AdbCheckResult> {
    try {
      await execAdb(['start-server'])
      const versionOutput = await execAdb(['--version'])
      const versionMatch = versionOutput.match(/Version\s+([\d.]+)/)
      const version = versionMatch ? versionMatch[1] : 'unknown'
      this._adbCheckResult = { available: true, version, path: findAdb() }
    } catch {
      this._adbCheckResult = { available: false, version: '', path: '' }
    }
    return this._adbCheckResult
  }

  async getDeviceModel(serial: string): Promise<string | undefined> {
    try {
      const model = await execAdb(['-s', serial, 'shell', 'getprop', 'ro.product.model'], 5000)
      return model.trim() || undefined
    } catch {
      return undefined
    }
  }

  async getDevices(): Promise<DeviceInfo[]> {
    const output = await execAdb(['devices'])
    const devices = parseDevicesSimple(output)
    const connected = devices.filter((d) => d.state === 'device')
    const models = await Promise.all(connected.map((d) => this.getDeviceModel(d.serial)))
    connected.forEach((d, i) => { d.model = models[i] })
    this._devices = devices
    this.emit('devices-changed', devices)
    return devices
  }

  async connect(host: string): Promise<{ success: boolean; message: string }> {
    try {
      const port = host.includes(':') ? '' : ':5555'
      const output = await execAdb(['connect', `${host}${port}`], 20000)
      return { success: !output.includes('failed') && !output.includes('cannot connect'), message: output }
    } catch (err) { return { success: false, message: (err as Error).message } }
  }

  async disconnect(serial: string): Promise<{ success: boolean; message: string }> {
    try {
      const output = await execAdb(['disconnect', serial])
      return { success: true, message: output }
    } catch (err) { return { success: false, message: (err as Error).message } }
  }

  async root(serial: string): Promise<boolean> {
    try {
      await execAdb(['-s', serial, 'root'], 10000)
      return true
    } catch {
      return false
    }
  }

  async remount(serial: string): Promise<boolean> {
    try {
      await execAdb(['-s', serial, 'remount'], 10000)
      return true
    } catch {
      return false
    }
  }

  startTracking(): void {
    if (this.tracker) return
    console.log('[track-devices] starting...')
    const adbPath = findAdb()
    this.tracker = spawn(adbPath, ['track-devices'], { stdio: ['ignore', 'pipe', 'pipe'] })
    let buffer = ''

    const parseTrackOutput = (raw: string): Map<string, DeviceInfo['state']> => {
      const stateMap = new Map<string, DeviceInfo['state']>()
      let i = 0
      while (i < raw.length) {
        const lenHex = raw.slice(i, i + 4)
        const len = parseInt(lenHex, 16)
        if (isNaN(len) || len <= 0) { i++; continue }
        i += 4
        const entry = raw.slice(i, i + len)
        i += len
        const parts = entry.trim().split('\t')
        if (parts.length >= 2) {
          stateMap.set(parts[0], parseState(parts[1]))
        }
      }
      return stateMap
    }

    this.tracker.stdout?.on('data', async (data: Buffer) => {
      const text = data.toString()
      console.log('[track-devices] stdout:', JSON.stringify(text))
      buffer += text

      const stateMap = parseTrackOutput(buffer)
      buffer = ''

      if (stateMap.size === 0) {
        this._devices = []
        this.emit('devices-changed', [])
        return
      }

      try {
        const output = await execAdb(['devices'])
        const devices = parseDevicesSimple(output)
        const connected = devices.filter((d) => d.state === 'device')
        const models = await Promise.all(connected.map((d) => this.getDeviceModel(d.serial)))
        connected.forEach((d, i) => { d.model = models[i] })
        this._devices = devices
        console.log('[track-devices] devices with model:', devices)
        this.emit('devices-changed', devices)
      } catch {
        const devices: DeviceInfo[] = []
        for (const [serial, state] of stateMap) {
          const existing = this._devices.find((d) => d.serial === serial)
          devices.push({ serial, state, model: existing?.model })
        }
        this._devices = devices
        this.emit('devices-changed', devices)
      }
    })

    this.tracker.stderr?.on('data', (data: Buffer) => {
      console.log('[track-devices] stderr:', data.toString())
    })

    this.tracker.on('error', (err) => {
      console.log('[track-devices] error:', err.message)
      this.stopTracking()
    })

    this.tracker.on('exit', (code) => {
      console.log('[track-devices] exit code:', code)
      this.tracker = null
    })
  }

  stopTracking(): void {
    if (this.tracker) { this.tracker.kill(); this.tracker = null }
  }

  async listFiles(serial: string, path: string): Promise<FileEntry[]> {
    const cleanPath = path.replace(/\/+$/, '') || '/'
    console.log('[listFiles] serial:', serial, 'path:', cleanPath)
    const output = await execAdb(['-s', serial, 'shell', `ls -la "${cleanPath}"`], 30000)
    return parseLsOutput(output, cleanPath)
  }

  async getPathSize(serial: string, remotePath: string): Promise<number> {
    try {
      const output = await execAdb(['-s', serial, 'shell', `du -sk "${remotePath}"`], 30000)
      const match = output.match(/^(\d+)/)
      return match ? parseInt(match[1], 10) * 1024 : 0
    } catch {
      return 0
    }
  }

  async countLocalFiles(dir: string): Promise<number> {
    let count = 0
    try {
      const { readdir, stat } = require('fs').promises
      const { join } = require('path')
      const entries = await readdir(dir, { withFileTypes: true } as any)
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        try {
          const st = await stat(fullPath)
          if (st.isDirectory()) {
            count += await this.countLocalFiles(fullPath)
          } else {
            count++
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
    return count
  }

  async countRemoteFiles(serial: string, remotePath: string): Promise<number> {
    try {
      const output = await execAdb(['-s', serial, 'shell', `find "${remotePath}" -type f | wc -l`], 30000)
      return parseInt(output.trim(), 10) || 0
    } catch {
      return 0
    }
  }

  startTransferWithProgress(
    id: string,
    args: string[],
    localPath: string,
    expectedSize: number,
    callbacks: TransferCallbacks,
    isDirectory = false,
    totalCount = 0
  ): void {
    const adbPath = findAdb()
    const proc = spawn(adbPath, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    this.activeTransfers.set(id, proc)

    const startTime = Date.now()
    let lastPercent = 0
    let checking = false
    let stderrData = ''
    let retriedReadOnly = false

    const getDirSizeAsync = async (dir: string): Promise<number> => {
      let size = 0
      try {
        const { readdir, stat } = require('fs').promises
        const { join } = require('path')
        const entries = await readdir(dir, { withFileTypes: true } as any)
        for (const entry of entries) {
          const fullPath = join(dir, entry.name)
          try {
            const st = await stat(fullPath)
            if (entry.isDirectory()) {
              size += await getDirSizeAsync(fullPath)
            } else {
              size += st.size
            }
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
      return size
    }

    const checkProgress = setInterval(async () => {
      if (checking) return
      checking = true
      try {
        let percent = 0
        let speed = '--'

        if (isDirectory && totalCount > 0) {
          // File count mode for directories
          let currentCount = 0
          try {
            const { stat } = require('fs').promises
            const st = await stat(localPath)
            if (st.isDirectory()) {
              currentCount = await this.countLocalFiles(localPath)
            }
          } catch { /* file not exists yet */ }

          percent = Math.min(99, Math.round((currentCount / totalCount) * 100))
          const elapsed = (Date.now() - startTime) / 1000
          const filesPerSec = elapsed > 0 ? currentCount / elapsed : 0
          speed = `${filesPerSec.toFixed(1)} 文件/s`
        } else if (expectedSize > 0) {
          // Size mode for single files
          let currentSize = 0
          try {
            const { stat } = require('fs').promises
            const st = await stat(localPath)
            if (st.isDirectory()) {
              currentSize = await getDirSizeAsync(localPath)
            } else {
              currentSize = st.size
            }
          } catch { /* file not exists yet */ }

          percent = Math.min(99, Math.round((currentSize / expectedSize) * 100))
          const elapsed = (Date.now() - startTime) / 1000
          const speedBytesPerSec = elapsed > 0 ? currentSize / elapsed : 0
          if (speedBytesPerSec >= 1024 * 1024) {
            speed = `${(speedBytesPerSec / 1024 / 1024).toFixed(1)} MB/s`
          } else {
            speed = `${(speedBytesPerSec / 1024).toFixed(1)} KB/s`
          }
        }

        if (percent !== lastPercent) {
          lastPercent = percent
          callbacks.onProgress(percent, speed)
        }
      } catch { /* ignore */ }
      checking = false
    }, 1000)

    proc.stderr?.on('data', (data: Buffer) => {
      stderrData += data.toString()
    })

    proc.on('close', (code) => {
      clearInterval(checkProgress)
      this.activeTransfers.delete(id)
      if (code === 0) {
        callbacks.onProgress(100, '--')
        callbacks.onDone()
      } else if (code !== null) {
        if (!retriedReadOnly && stderrData.includes('Read-only file system')) {
          retriedReadOnly = true
          const serial = args[1]
          console.log(`[adb] push failed with Read-only file system, trying root + remount for device ${serial}`)
          ;(async () => {
            try {
              await this.root(serial)
              await this.remount(serial)
              console.log('[adb] root + remount done, retrying push')
              this.startTransferWithProgress(id, args, localPath, expectedSize, callbacks, isDirectory, totalCount)
            } catch (retryErr) {
              console.error('[adb] root/remount retry failed:', retryErr)
              callbacks.onError(`文件系统只读，root/remount 后重试仍失败: ${(retryErr as Error).message}`)
            }
          })()
          return
        }
        callbacks.onError(`进程退出，代码: ${code}`)
      }
    })

    proc.on('error', (err) => {
      clearInterval(checkProgress)
      this.activeTransfers.delete(id)
      callbacks.onError(err.message)
    })
  }

  private parseProgress(line: string): { percent: number } | null {
    const m = line.match(/\[\s*(\d+)%\]/) || line.match(/(\d+)%/)
    if (m) return { percent: parseInt(m[1], 10) }
    return null
  }

  startTransfer(
    id: string,
    args: string[],
    callbacks: TransferCallbacks
  ): void {
    const adbPath = findAdb()
    const proc = spawn(adbPath, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    this.activeTransfers.set(id, proc)

    let lastPercent = 0
    const startTime = Date.now()

    const processOutput = (data: Buffer): void => {
      const text = data.toString()
      for (const line of text.split('\n')) {
        const progress = this.parseProgress(line.trim())
        if (progress && progress.percent !== lastPercent) {
          lastPercent = progress.percent
          const elapsed = (Date.now() - startTime) / 1000
          const speed = elapsed > 0 ? `${(lastPercent / elapsed * 100).toFixed(0)}%` : '--'
          callbacks.onProgress(lastPercent, speed)
        }
      }
    }

    proc.stdout?.on('data', processOutput)
    proc.stderr?.on('data', processOutput)

    proc.on('close', (code) => {
      this.activeTransfers.delete(id)
      if (code === 0) {
        callbacks.onProgress(100, '--')
        callbacks.onDone()
      } else if (code !== null) {
        callbacks.onError(`进程退出，代码: ${code}`)
      }
    })

    proc.on('error', (err) => {
      this.activeTransfers.delete(id)
      callbacks.onError(err.message)
    })
  }

  cancelTransfer(id: string): boolean {
    const proc = this.activeTransfers.get(id)
    if (proc) {
      proc.kill()
      this.activeTransfers.delete(id)
      return true
    }
    return false
  }

  async getFileContent(serial: string, remotePath: string, maxBytes = 1024 * 100): Promise<string> {
    const adbPath = findAdb()
    return new Promise((resolve, reject) => {
      const proc = spawn(adbPath, ['-s', serial, 'exec-out', `cat "${remotePath}"`], { stdio: ['ignore', 'pipe', 'pipe'] })
      const chunks: Buffer[] = []
      let totalBytes = 0
      let settled = false

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true
          proc.kill()
          reject(new Error('Timeout reading file'))
        }
      }, 30000)

      proc.stdout?.on('data', (chunk: Buffer) => {
        if (totalBytes < maxBytes) {
          chunks.push(chunk)
          totalBytes += chunk.length
        }
      })

      proc.on('close', (code) => {
        if (!settled) {
          settled = true
          clearTimeout(timeout)
          if (code === 0) {
            const content = Buffer.concat(chunks).toString('utf-8')
            resolve(content)
          } else {
            reject(new Error(`Failed to read file, exit code: ${code}`))
          }
        }
      })

      proc.on('error', (err) => {
        if (!settled) {
          settled = true
          clearTimeout(timeout)
          reject(err)
        }
      })
    })
  }

  async getFileAsBase64(serial: string, remotePath: string): Promise<string> {
    const adbPath = findAdb()
    return new Promise((resolve, reject) => {
      const proc = spawn(adbPath, ['-s', serial, 'exec-out', `cat "${remotePath}"`], { stdio: ['ignore', 'pipe', 'pipe'] })
      const chunks: Buffer[] = []
      let settled = false

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true
          proc.kill()
          reject(new Error('Timeout reading file'))
        }
      }, 30000)

      proc.stdout?.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })

      proc.on('close', (code) => {
        if (!settled) {
          settled = true
          clearTimeout(timeout)
          if (code === 0) {
            const buffer = Buffer.concat(chunks)
            const base64 = buffer.toString('base64')
            resolve(base64)
          } else {
            reject(new Error(`Failed to read file, exit code: ${code}`))
          }
        }
      })

      proc.on('error', (err) => {
        if (!settled) {
          settled = true
          clearTimeout(timeout)
          reject(err)
        }
      })
    })
  }

  async mkdir(serial: string, remotePath: string): Promise<void> {
    await execAdb(['-s', serial, 'shell', `mkdir "${remotePath}"`])
  }

  async rename(serial: string, oldPath: string, newPath: string): Promise<void> {
    await execAdb(['-s', serial, 'shell', `mv "${oldPath}" "${newPath}"`])
  }

  async delete(serial: string, remotePath: string): Promise<void> {
    await execAdb(['-s', serial, 'shell', `rm -rf "${remotePath}"`])
  }
}

export const adbService = new AdbService()
