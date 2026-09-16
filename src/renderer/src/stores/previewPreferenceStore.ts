import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PreviewMode = 'text' | 'image' | 'nv21' | 'info'

export interface RawImageDimensions {
  width: number
  height: number
}

const TEXT_EXTENSIONS = new Set([
  'txt', 'log', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts', 'py', 'java', 'kt',
  'yaml', 'yml', 'toml', 'ini', 'conf', 'sh', 'rb', 'go', 'rs', 'c', 'cpp', 'h'
])
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'])
const NV21_EXTENSIONS = new Set(['nv21'])

interface PreviewPreferenceStore {
  modesByExtension: Record<string, PreviewMode>
  rawDimensionsByExtension: Record<string, RawImageDimensions>
  setMode: (extension: string, mode: PreviewMode) => void
  setRawDimensions: (extension: string, dimensions: RawImageDimensions) => void
  clearRawDimensions: (extension: string) => void
  clearMode: (extension: string) => void
}

export function getFileExtension(name: string): string {
  const baseName = name.split('/').pop() || ''
  const dotIndex = baseName.lastIndexOf('.')

  // Treat dotfiles such as `.metadata` as an extension group too, so users can
  // assign one preview mode to all files with the same dotfile name.
  if (dotIndex === 0) return baseName.slice(1).toLowerCase()
  if (dotIndex < 0 || dotIndex === baseName.length - 1) return ''
  return baseName.slice(dotIndex + 1).toLowerCase()
}

export function getBuiltInPreviewMode(name: string): PreviewMode {
  const extension = getFileExtension(name)
  if (IMAGE_EXTENSIONS.has(extension)) return 'image'
  if (NV21_EXTENSIONS.has(extension)) return 'nv21'
  if (TEXT_EXTENSIONS.has(extension)) return 'text'
  return 'info'
}

export const usePreviewPreferenceStore = create<PreviewPreferenceStore>()(
  persist(
    (set) => ({
      modesByExtension: {},
      rawDimensionsByExtension: {},
      setMode: (extension, mode) => {
        const normalized = extension.trim().replace(/^\./, '').toLowerCase()
        if (!normalized) return
        set((state) => ({
          modesByExtension: { ...state.modesByExtension, [normalized]: mode }
        }))
      },
      setRawDimensions: (extension, dimensions) => {
        const normalized = extension.trim().replace(/^\./, '').toLowerCase()
        if (!normalized) return
        set((state) => ({
          rawDimensionsByExtension: {
            ...state.rawDimensionsByExtension,
            [normalized]: dimensions
          }
        }))
      },
      clearRawDimensions: (extension) => {
        const normalized = extension.trim().replace(/^\./, '').toLowerCase()
        set((state) => {
          const next = { ...state.rawDimensionsByExtension }
          delete next[normalized]
          return { rawDimensionsByExtension: next }
        })
      },
      clearMode: (extension) => {
        const normalized = extension.trim().replace(/^\./, '').toLowerCase()
        set((state) => {
          const next = { ...state.modesByExtension }
          delete next[normalized]
          return { modesByExtension: next }
        })
      }
    }),
    { name: 'adbtrans-preview-preferences' }
  )
)
