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
      set({ devices })
      const { current } = get()
      if (current && !devices.find((d) => d.serial === current.serial)) set({ current: null })
    } catch { /* silent */ }
  },

  startTracking: () => {
    if (get().isTracking) return
    set({ isTracking: true })
    window.api.startDeviceTracking()
    window.api.onDeviceChanged((devices) => {
      set({ devices })
      const { current } = get()
      if (current && !devices.find((d) => d.serial === current.serial)) set({ current: null })
    })
  },

  connectDevice: async (host) => {
    const result = await window.api.connectDevice(host)
    if (result.success) await get().refreshDevices()
    return result
  }
}))
