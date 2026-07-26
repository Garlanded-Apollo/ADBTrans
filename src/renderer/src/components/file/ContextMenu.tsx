import { useEffect, useRef } from 'react'
import { FolderPlus, Edit3, Trash2, Download } from 'lucide-react'

interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
  onNewFolder: () => void
  onRename: () => void
  onDelete: () => void
  onDownload: () => void
  hasTarget: boolean
  isMultiSelect?: boolean
}

export function ContextMenu({ x, y, onClose, onNewFolder, onRename, onDelete, onDownload, hasTarget, isMultiSelect }: ContextMenuProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (): void => onClose()
    const handleKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      if (rect.right > window.innerWidth) ref.current.style.left = `${x - rect.width}px`
      if (rect.bottom > window.innerHeight) ref.current.style.top = `${y - rect.height}px`
    }
  }, [x, y])

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[160px] rounded-lg border bg-background p-1 shadow-lg"
      style={{ left: x, top: y }}
    >
      <button
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-muted"
        onClick={(e) => { e.stopPropagation(); onNewFolder() }}
      >
        <FolderPlus className="h-3.5 w-3.5" />
        新建文件夹
      </button>
      {hasTarget && (
        <>
          {!isMultiSelect && (
            <button
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-muted"
              onClick={(e) => { e.stopPropagation(); onRename() }}
            >
              <Edit3 className="h-3.5 w-3.5" />
              重命名
            </button>
          )}
          <button
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-muted"
            onClick={(e) => { e.stopPropagation(); onDownload() }}
          >
            <Download className="h-3.5 w-3.5" />
            下载到电脑
          </button>
          <div className="my-1 h-px bg-border" />
          <button
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            删除
          </button>
        </>
      )}
    </div>
  )
}
