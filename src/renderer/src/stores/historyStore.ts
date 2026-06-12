import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

let nextId = 1000

function getLabel(path: string): string {
  const trimmed = path.replace(/\/+$/, '') || '/'
  if (trimmed === '/') return '/'
  const parts = trimmed.split('/')
  return parts[parts.length - 1] || trimmed
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      history: [],

      addHistory: (path) => {
        const trimmed = path.replace(/\/+$/, '') || '/'
        const now = Date.now()
        const { history } = get()

        const existing = history.find((h) => h.path === trimmed)
        if (existing) {
          set({
            history: [
              { ...existing, timestamp: now },
              ...history.filter((h) => h.id !== existing.id)
            ].slice(0, MAX_HISTORY)
          })
          return
        }

        const item: HistoryItem = {
          id: String(nextId++),
          path: trimmed,
          label: getLabel(trimmed),
          timestamp: now
        }
        set({
          history: [item, ...history].slice(0, MAX_HISTORY)
        })
      },

      removeHistory: (id) => {
        set((s) => ({ history: s.history.filter((h) => h.id !== id) }))
      },

      clearHistory: () => set({ history: [] }),

      getHistory: () => get().history
    }),
    {
      name: 'adbtrans-history'
    }
  )
)
