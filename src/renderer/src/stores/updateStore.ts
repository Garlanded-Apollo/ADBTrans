import { create } from 'zustand'

const STARTUP_DELAY_MS = 10 * 1000
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

interface UpdateStore {
  updateAvailable: boolean
  latestVersion: string | null
  lastCheckedAt: number | null
  autoCheck: () => void
  refreshStatus: () => Promise<void>
}

let started = false
let timer: ReturnType<typeof setTimeout> | null = null

export const useUpdateStore = create<UpdateStore>((set) => ({
  updateAvailable: false,
  latestVersion: null,
  lastCheckedAt: null,

  refreshStatus: async () => {
    try {
      const result = await window.api.checkForUpdates(false)
      set({
        updateAvailable: result.updateAvailable,
        latestVersion: result.latestVersion,
        lastCheckedAt: Date.now()
      })
    } catch {
      // 静默失败：自动检查不打扰用户，设置页里可手动重试
    }
  },

  autoCheck: () => {
    if (started) return
    started = true
    const run = (): void => {
      void useUpdateStore.getState().refreshStatus()
      timer = setTimeout(run, CHECK_INTERVAL_MS)
    }
    timer = setTimeout(run, STARTUP_DELAY_MS)
  }
}))

export function stopAutoUpdateCheck(): void {
  if (timer) clearTimeout(timer)
  timer = null
  started = false
}
