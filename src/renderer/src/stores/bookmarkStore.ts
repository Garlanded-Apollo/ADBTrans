import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Bookmark {
  id: string
  label: string
  path: string
}

const DEFAULT_BOOKMARKS: Bookmark[] = [
  { id: '1', label: '内部存储', path: '/storage/emulated/0' },
  { id: '2', label: 'Download', path: '/storage/emulated/0/Download' },
  { id: '3', label: 'DCIM', path: '/storage/emulated/0/DCIM' },
  { id: '4', label: 'Pictures', path: '/storage/emulated/0/Pictures' },
  { id: '5', label: 'Documents', path: '/storage/emulated/0/Documents' }
]

interface BookmarkStore {
  bookmarks: Bookmark[]
  addBookmark: (label: string, path: string) => void
  removeBookmark: (id: string) => void
  updateBookmark: (id: string, label: string, path: string) => void
  isBookmarked: (path: string) => boolean
}

let nextId = 100

export const useBookmarkStore = create<BookmarkStore>()(
  persist(
    (set, get) => ({
      bookmarks: DEFAULT_BOOKMARKS,
      addBookmark: (label, path) => {
        const id = String(nextId++)
        set((s) => ({ bookmarks: [...s.bookmarks, { id, label, path }] }))
      },
      removeBookmark: (id) => {
        set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.id !== id) }))
      },
      updateBookmark: (id, label, path) => {
        set((s) => ({
          bookmarks: s.bookmarks.map((b) => (b.id === id ? { ...b, label, path } : b))
        }))
      },
      isBookmarked: (path) => {
        return get().bookmarks.some((b) => b.path === path)
      }
    }),
    {
      name: 'adbtrans-bookmarks'
    }
  )
)
