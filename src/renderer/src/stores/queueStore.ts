import { create } from 'zustand'

export interface QueueTask {
  id: string
  fileName: string
  fromPath: string
  toPath: string
  direction: 'pull' | 'push'
  progress: number
  speed: string
  remaining: string
  status: 'pending' | 'running' | 'paused' | 'done' | 'error'
}

interface QueueStore {
  tasks: QueueTask[]
  addTask: (task: Omit<QueueTask, 'id' | 'progress' | 'speed' | 'remaining' | 'status'>) => void
  updateTask: (id: string, updates: Partial<QueueTask>) => void
  removeTask: (id: string) => void
  clearDone: () => void
}

let nextId = 1

export const useQueueStore = create<QueueStore>((set) => ({
  tasks: [],
  addTask: (task) => {
    const id = String(nextId++)
    set((s) => ({ tasks: [...s.tasks, { ...task, id, progress: 0, speed: '--', remaining: '--', status: 'pending' }] }))
  },
  updateTask: (id, updates) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) })),
  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  clearDone: () => set((s) => ({ tasks: s.tasks.filter((t) => t.status !== 'done') }))
}))
