import { create } from 'zustand'

export interface FileItem {
  name: string
  path: string
  size: number
  modified: string
  type: 'file' | 'folder'
  permission: string
}

interface FileStore {
  currentPath: string
  files: FileItem[]
  selected: FileItem | null
  history: string[]
  historyIndex: number
  setCurrentPath: (path: string) => void
  setFiles: (files: FileItem[]) => void
  setSelected: (file: FileItem | null) => void
  pushHistory: (path: string) => void
  goBack: () => string | null
  goForward: () => string | null
  canGoBack: () => boolean
  canGoForward: () => boolean
}

export const useFileStore = create<FileStore>((set, get) => ({
  currentPath: '/sdcard',
  files: [],
  selected: null,
  history: ['/sdcard'],
  historyIndex: 0,

  setCurrentPath: (path) => set({ currentPath: path }),
  setFiles: (files) => set({ files }),
  setSelected: (file) => set({ selected: file }),

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
  canGoForward: () => get().historyIndex < get().history.length - 1
}))
