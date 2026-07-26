import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { normalizePath } from '@/lib/utils'

export interface HistoryItem {
  id: string
  path: string
  label: string
  timestamp: number
}

const MAX_HISTORY = 20

interface HistoryStore {
  history: HistoryItem[]
  addHistory: (path: string) => void
  removeHistory: (id: string) => void
  clearHistory: () => void
  getHistory: () => HistoryItem[]
}

let nextId = 0

function getLabel(path: string): string {
  const trimmed = normalizePath(path)
  if (trimmed === '/') return '/'
  if (trimmed === '/storage/emulated/0') return 'sdcard'
  const parts = trimmed.split('/')
  return parts[parts.length - 1] || trimmed
}

function dedupeHistory(history: HistoryItem[]): HistoryItem[] {
  const seen = new Map<string, HistoryItem>()
  for (const item of history) {
    const normPath = normalizePath(item.path)
    const existing = seen.get(normPath)
    if (!existing || item.timestamp > existing.timestamp) {
      seen.set(normPath, { ...item, path: normPath, label: getLabel(normPath) })
    }
  }
  return Array.from(seen.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_HISTORY)
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      history: [],

      addHistory: (path) => {
        const trimmed = normalizePath(path)
        const now = Date.now()
        const { history } = get()

        // 查找已存在的记录（使用规范化路径比较）
        const existingIndex = history.findIndex((h) => normalizePath(h.path) === trimmed)
        if (existingIndex !== -1) {
          // 更新已有记录并移到最前面
          const existing = history[existingIndex]
          const newHistory = history.filter((_, i) => i !== existingIndex)
          newHistory.unshift({ ...existing, path: trimmed, timestamp: now })
          set({ history: newHistory.slice(0, MAX_HISTORY) })
          return
        }

        const item: HistoryItem = {
          id: String(nextId++),
          path: trimmed,
          label: getLabel(trimmed),
          timestamp: now
        }
        // 添加新记录到最前面
        set({ history: [item, ...history].slice(0, MAX_HISTORY) })
      },

      removeHistory: (id) => {
        set((s) => ({ history: s.history.filter((h) => h.id !== id) }))
      },

      clearHistory: () => set({ history: [] }),

      getHistory: () => get().history
    }),
    {
      name: 'adbtrans-history',
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error || !state) return
          // 清除旧的重复数据，重新开始
          state.history = []
        }
      }
    }
  )
)
