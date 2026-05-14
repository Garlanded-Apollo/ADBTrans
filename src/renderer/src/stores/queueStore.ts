import { create } from 'zustand'
import { useFileStore } from './fileStore'

export interface QueueTask {
  id: string
  serial: string
  fileName: string
  fromPath: string
  toPath: string
  direction: 'pull' | 'push'
  progress: number
  speed: string
  remaining: string
  status: 'pending' | 'running' | 'done' | 'error'
  error?: string
}

interface QueueStore {
  tasks: QueueTask[]
  addTask: (task: Omit<QueueTask, 'id' | 'progress' | 'speed' | 'remaining' | 'status'>) => string
  updateTask: (id: string, updates: Partial<QueueTask>) => void
  removeTask: (id: string) => void
  clearDone: () => void
  startNextPending: () => QueueTask | null
}

let nextId = 1

export const useQueueStore = create<QueueStore>((set, get) => ({
  tasks: [],
  addTask: (task) => {
    const id = String(nextId++)
    set((s) => ({ tasks: [...s.tasks, { ...task, id, progress: 0, speed: '--', remaining: '--', status: 'pending' }] }))
    return id
  },
  updateTask: (id, updates) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) })),
  removeTask: (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
    window.api.cancelTransfer(id)
  },
  clearDone: () => set((s) => ({ tasks: s.tasks.filter((t) => t.status !== 'done') })),
  startNextPending: () => {
    const { tasks } = get()
    const running = tasks.find((t) => t.status === 'running')
    if (running) return null
    const pending = tasks.find((t) => t.status === 'pending')
    if (pending) {
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === pending.id ? { ...t, status: 'running' as const } : t)) }))
      return pending
    }
    return null
  }
}))

export function initTransferListeners(): void {
  window.api.onTransferProgress(({ id, percent, speed }) => {
    useQueueStore.getState().updateTask(id, { progress: percent, speed })
  })

  window.api.onTransferDone(({ id }) => {
    const task = useQueueStore.getState().tasks.find((t) => t.id === id)
    useQueueStore.getState().updateTask(id, { status: 'done', progress: 100, speed: '--' })

    if (task?.direction === 'push') {
      const fileStore = useFileStore.getState()
      fileStore.loadCurrentPath(task.serial).then(() => {
        useFileStore.getState().setPendingScrollTo(task.fileName)
      })
    }

    const next = useQueueStore.getState().startNextPending()
    if (next) executeTask(next)
  })

  window.api.onTransferError(({ id, error }) => {
    useQueueStore.getState().updateTask(id, { status: 'error', error })
    const next = useQueueStore.getState().startNextPending()
    if (next) executeTask(next)
  })
}

export function executeTask(task: QueueTask): void {
  if (task.direction === 'pull') {
    window.api.pullFile(task.id, task.serial, task.fromPath, task.toPath)
  } else {
    window.api.pushFile(task.id, task.serial, task.fromPath, task.toPath)
  }
}
