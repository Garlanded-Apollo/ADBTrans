import { create } from 'zustand'

interface Device {
  serial: string
  state: string
  model?: string
}

interface DeviceStore {
  devices: Device[]
  current: Device | null
  adbStatus: { available: boolean; version: string } | null
  isTracking: boolean
  setDevices: (devices: Device[]) => void
  setCurrent: (device: Device | null) => void
  setAdbStatus: (status: { available: boolean; version: string } | null) => void
  checkAdb: () => Promise<void>
  refreshDevices: () => Promise<void>
  startTracking: () => void
  connectDevice: (host: string) => Promise<{ success: boolean; message: string }>
  disconnectDevice: (serial: string) => Promise<{ success: boolean; message: string }>
}

function reconcileCurrent(current: Device | null, devices: Device[]): Device | null {
  const connected = devices.filter((device) => device.state === 'device')
  if (!current) return connected[0] || null
  return connected.find((device) => device.serial === current.serial) || connected[0] || null
}

export const useDeviceStore = create<DeviceStore>((set, get) => ({
  devices: [],
  current: null,
  adbStatus: null,
  isTracking: false,

  setDevices: (devices) => set({ devices }),
  setCurrent: (device) => set({ current: device }),
  setAdbStatus: (status) => set({ adbStatus: status }),

  checkAdb: async () => {
    try {
      const result = await window.api.checkAdb()
      set({ adbStatus: result })
      if (result.available) {
        await get().refreshDevices()
        get().startTracking()
      }
    } catch {
      set({ adbStatus: { available: false, version: '' } })
    }
  },

  refreshDevices: async () => {
    try {
      const devices = await window.api.getDevices()
      set((state) => ({ devices, current: reconcileCurrent(state.current, devices) }))
    } catch { /* silent */ }
  },

  startTracking: () => {
    if (get().isTracking) return
    set({ isTracking: true })
    window.api.startDeviceTracking()
    window.api.onDeviceChanged((devices) => {
      const prevDevices = get().devices
      const prevConnected = prevDevices.filter((d) => d.state === 'device').map((d) => d.serial)

      const connected = devices.filter((d) => d.state === 'device')
      const newConnected = connected.filter((d) => !prevConnected.includes(d.serial))
      set((state) => ({ devices, current: reconcileCurrent(state.current, devices) }))

      if (newConnected.length > 0) {
        window.api.getAutoLaunch().then((enabled) => {
          if (enabled) {
            window.api.focusWindow()
          }
        })
      }
    })
  },

  connectDevice: async (host) => {
    const result = await window.api.connectDevice(host)
    if (result.success) await get().refreshDevices()
    return result
  },

  disconnectDevice: async (serial) => {
    const result = await window.api.disconnectDevice(serial)
    if (result.success) {
      const { current, devices } = get()
      if (current?.serial === serial) {
        const remaining = devices.filter((d) => d.serial !== serial && d.state === 'device')
        set({ current: remaining[0] || null })
      }
      await get().refreshDevices()
    }
    return result
  }
}))
