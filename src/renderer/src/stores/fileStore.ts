import { create } from 'zustand'

export interface FileItem {
  name: string
  path: string
  size: number
  modified: string
  type: 'file' | 'folder' | 'symlink'
  permission: string
}

interface FileStore {
  currentPath: string
  files: FileItem[]
  selected: FileItem | null
  checkedPaths: Set<string>
  history: string[]
  historyIndex: number
  loading: boolean
  error: string | null
  pendingScrollTo: string | null
  setCurrentPath: (path: string) => void
  setFiles: (files: FileItem[]) => void
  setSelected: (file: FileItem | null) => void
  toggleCheck: (path: string) => void
  checkAll: (paths: string[]) => void
  clearChecks: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setPendingScrollTo: (fileName: string | null) => void
  updateFileInList: (oldPath: string, updates: Partial<FileItem>) => void
  removeFilesFromList: (paths: string[]) => void
  addFileToList: (file: FileItem) => void
  pushHistory: (path: string) => void
  goBack: () => string | null
  goForward: () => string | null
  canGoBack: () => boolean
  canGoForward: () => boolean
  navigateTo: (path: string, serial: string) => Promise<void>
  loadCurrentPath: (serial: string) => Promise<void>
}

export const useFileStore = create<FileStore>((set, get) => ({
  currentPath: '/storage/emulated/0',
  files: [],
  selected: null,
  checkedPaths: new Set<string>(),
  history: ['/storage/emulated/0'],
  historyIndex: 0,
  loading: false,
  error: null,
  pendingScrollTo: null,

  setCurrentPath: (path) => set({ currentPath: path }),
  setFiles: (files) => set({ files }),
  setSelected: (file) => set({ selected: file }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setPendingScrollTo: (fileName) => set({ pendingScrollTo: fileName }),
  updateFileInList: (oldPath, updates) => set((s) => ({
    files: s.files.map((f) => f.path === oldPath ? { ...f, ...updates } : f),
    selected: s.selected?.path === oldPath ? { ...s.selected, ...updates } : s.selected
  })),
  removeFilesFromList: (paths) => set((s) => {
    const pathSet = new Set(paths)
    return {
      files: s.files.filter((f) => !pathSet.has(f.path)),
      selected: s.selected && pathSet.has(s.selected.path) ? null : s.selected,
      checkedPaths: new Set([...s.checkedPaths].filter((p) => !pathSet.has(p)))
    }
  }),
  addFileToList: (file) => set((s) => ({
    files: [...s.files, file].sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1
      if (a.type !== 'folder' && b.type === 'folder') return 1
      return a.name.localeCompare(b.name)
    })
  })),

  toggleCheck: (path) => set((s) => {
    const next = new Set(s.checkedPaths)
    if (next.has(path)) next.delete(path)
    else next.add(path)
    return { checkedPaths: next }
  }),

  checkAll: (paths) => set((s) => {
    const allChecked = paths.every((p) => s.checkedPaths.has(p))
    if (allChecked) return { checkedPaths: new Set<string>() }
    return { checkedPaths: new Set(paths) }
  }),

  clearChecks: () => set({ checkedPaths: new Set<string>() }),

  pushHistory: (path) => {
    const { history, historyIndex } = get()
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(path)
    set({ history: newHistory, historyIndex: newHistory.length - 1 })
  },

  goBack: () => {
    const { history, historyIndex } = get()
    if (historyIndex <= 0) return null
    const i = historyIndex - 1
    set({ historyIndex: i, currentPath: history[i] })
    return history[i]
  },

  goForward: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return null
    const i = historyIndex + 1
    set({ historyIndex: i, currentPath: history[i] })
    return history[i]
  },

  canGoBack: () => get().historyIndex > 0,
  canGoForward: () => get().historyIndex < get().history.length - 1,

  navigateTo: async (path, serial) => {
    const { currentPath, pushHistory } = get()
    if (path === currentPath) return
    set({ currentPath: path, selected: null, checkedPaths: new Set(), error: null })
    pushHistory(path)
    await get().loadCurrentPath(serial)
  },

  loadCurrentPath: async (serial) => {
    const { currentPath } = get()
    set({ loading: true, error: null, checkedPaths: new Set() })
    try {
      const entries = await window.api.listFiles(serial, currentPath)
      set({ files: entries, loading: false })
    } catch (err) {
      const msg = (err as Error).message || '加载失败'
      if (msg.includes('Permission denied') || msg.includes('permission denied')) {
        try {
          await window.api.adbRoot(serial)
          await window.api.adbRemount(serial)
          const entries = await window.api.listFiles(serial, currentPath)
          set({ files: entries, loading: false })
          return
        } catch {
          set({ files: [], loading: false, error: '权限不足，已尝试 root 但失败' })
          return
        }
      }
      set({ files: [], loading: false, error: msg.includes('device') ? '设备未连接或离线' : msg })
    }
  }
}))
