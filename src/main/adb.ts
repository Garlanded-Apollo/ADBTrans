import { execFile, spawn } from 'child_process'
import { EventEmitter } from 'events'

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

const COMMON_PATHS = [
  '/opt/homebrew/bin/adb',
  '/usr/local/bin/adb',
  '/usr/bin/adb',
  'C:\\Program Files\\Android\\Android Studio\\platform-tools\\adb.exe',
  'C:\\Android\\platform-tools\\adb.exe'
]

function findAdb(): string {
  const cmd = process.platform === 'win32' ? 'adb.exe' : 'adb'
  const sep = process.platform === 'win32' ? ';' : ':'
  for (const dir of (process.env.PATH || '').split(sep)) {
    try {
      const full = require('path').join(dir, cmd)
      if (require('fs').existsSync(full)) return full
    } catch { continue }
  }
  for (const p of COMMON_PATHS) {
    try { if (require('fs').existsSync(p)) return p } catch { continue }
  }
  return cmd
}

function execAdb(args: string[], timeout = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    const adbPath = findAdb()
    execFile(adbPath, args, { timeout, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
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

function parseDevices(output: string): DeviceInfo[] {
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
    const info: DeviceInfo = { serial, state: parseState(stateRaw) }
    const modelMatch = line.match(/model:(\S+)/)
    if (modelMatch) info.model = modelMatch[1].replace(/_/g, ' ')
    devices.push(info)
  }
  return devices
}

export class AdbService extends EventEmitter {
  private tracker: ReturnType<typeof spawn> | null = null
  private _devices: DeviceInfo[] = []
  private _adbCheckResult: AdbCheckResult | null = null

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

  async getDevices(): Promise<DeviceInfo[]> {
    const output = await execAdb(['devices', '-l'])
    const devices = parseDevices(output)
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

  startTracking(): void {
    if (this.tracker) return
    this.tracker = spawn(findAdb(), ['track-devices'], { stdio: ['ignore', 'pipe', 'pipe'] })
    let buffer = ''
    this.tracker.stdout?.on('data', (data: Buffer) => {
      buffer += data.toString()
      if (buffer.includes('\n\n')) {
        const devices: DeviceInfo[] = []
        for (const raw of buffer.split('\n')) {
          const line = raw.trim()
          if (!line || line === 'List of devices attached') continue
          const parts = line.split('\t')
          if (parts.length < 2) continue
          devices.push({ serial: parts[0], state: parseState(parts[1]) })
        }
        buffer = ''
        this._devices = devices
        this.emit('devices-changed', devices)
      }
    })
    this.tracker.on('error', () => this.stopTracking())
    this.tracker.on('exit', () => { this.tracker = null })
  }

  stopTracking(): void {
    if (this.tracker) { this.tracker.kill(); this.tracker = null }
  }
}

export const adbService = new AdbService()
