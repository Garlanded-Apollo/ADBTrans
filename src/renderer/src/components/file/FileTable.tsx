import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { Folder, File, Image, FileText, FileJson, FileCode, Film, Music, Package, Loader2, AlertCircle, Search, X, Upload } from 'lucide-react'
import { useFileStore, type FileItem } from '@/stores/fileStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useQueueStore, executeTask } from '@/stores/queueStore'
import { cn, formatBytes, formatDate } from '@/lib/utils'
import { Thumbnail, isImageFile } from './Thumbnail'
import { ContextMenu } from './ContextMenu'
import { InputDialog } from '@/components/ui/input-dialog'

const INITIAL_BATCH = 50
const LOAD_MORE_BATCH = 30

function getFileIcon(item: FileItem): JSX.Element {
  if (item.type === 'folder') return <Folder className="h-4 w-4 text-blue-500" />
  if (item.type === 'symlink') return <File className="h-4 w-4 text-purple-500" />
  const ext = item.name.split('.').pop()?.toLowerCase() || ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return <Image className="h-4 w-4 text-green-500" />
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) return <Film className="h-4 w-4 text-purple-500" />
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return <Music className="h-4 w-4 text-pink-500" />
  if (['json'].includes(ext)) return <FileJson className="h-4 w-4 text-yellow-500" />
  if (['xml', 'html', 'css', 'js', 'ts', 'py', 'java', 'kt'].includes(ext)) return <FileCode className="h-4 w-4 text-cyan-500" />
  if (['txt', 'log', 'md', 'csv'].includes(ext)) return <FileText className="h-4 w-4 text-muted-foreground" />
  if (['zip', 'tar', 'gz', 'rar', '7z', 'apk'].includes(ext)) return <Package className="h-4 w-4 text-orange-500" />
  return <File className="h-4 w-4 text-muted-foreground" />
}

const CHECKBOX_WIDTH = 3
const DEFAULT_WIDTHS = [42, 15, 25, 15]
const MIN_WIDTH = 5
const LONG_PRESS_MS = 400

interface ColumnDef {
  key: string
  label: string
  align?: 'left' | 'right'
  render: (item: FileItem) => React.ReactNode
}

const columns: ColumnDef[] = [
  {
    key: 'name',
    label: '名称',
    render: (item) => (
      <div className="flex items-center gap-2">
        {isImageFile(item.name) && item.type !== 'folder' ? (
          <Thumbnail path={item.path} name={item.name} />
        ) : (
          getFileIcon(item)
        )}
        <span className="truncate">{item.name}</span>
      </div>
    )
  },
  {
    key: 'size',
    label: '大小',
    align: 'right',
    render: (item) => <span className="text-muted-foreground">{item.type === 'folder' ? '--' : formatBytes(item.size)}</span>
  },
  {
    key: 'modified',
    label: '修改时间',
    render: (item) => <span className="text-muted-foreground">{formatDate(item.modified)}</span>
  },
  {
    key: 'type',
    label: '类型',
    render: (item) => <span className="text-muted-foreground">{item.type === 'folder' ? '文件夹' : item.type === 'symlink' ? '链接' : (item.name.split('.').pop()?.toUpperCase() || '--')}</span>
  }
]

interface FileTableProps {
  onOpenFolder: (path: string) => void
}

export function FileTable({ onOpenFolder }: FileTableProps): JSX.Element {
  const { files, selected, setSelected, checkedPaths, toggleCheck, checkAll, clearChecks, loading, error, currentPath, pendingScrollTo, setPendingScrollTo } = useFileStore()
  const { current } = useDeviceStore()
  const { addTask, startNextPending } = useQueueStore()
  const [widths, setWidths] = useState<number[]>(DEFAULT_WIDTHS)
  const [keyword, setKeyword] = useState('')
  const [showCheckboxes, setShowCheckboxes] = useState(false)
  const [displayCount, setDisplayCount] = useState(INITIAL_BATCH)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null)
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const resizingRef = useRef<{ index: number; startX: number; startWidth: number; nextStartWidth: number } | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggeredRef = useRef(false)
  const lastClickIndexRef = useRef<number | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const filteredFiles = keyword.trim()
    ? files.filter((f) => f.name.toLowerCase().includes(keyword.trim().toLowerCase()))
    : files

  const displayedFiles = useMemo(() => filteredFiles.slice(0, displayCount), [filteredFiles, displayCount])
  const hasMore = displayCount < filteredFiles.length

  const filteredPaths = useMemo(() => filteredFiles.map((f) => f.path), [filteredFiles])
  const allChecked = filteredPaths.length > 0 && filteredPaths.every((p) => checkedPaths.has(p))
  const hasChecked = checkedPaths.size > 0

  useEffect(() => {
    setDisplayCount(INITIAL_BATCH)
  }, [keyword, files])

  useEffect(() => {
    if (!pendingScrollTo || files.length === 0) return

    const targetFile = files.find((f) => f.name === pendingScrollTo)
    if (!targetFile) {
      setPendingScrollTo(null)
      return
    }

    const index = filteredFiles.findIndex((f) => f.path === targetFile.path)
    if (index < 0) {
      setPendingScrollTo(null)
      return
    }

    const neededCount = Math.max(INITIAL_BATCH, index + 10)
    setDisplayCount(neededCount)

    const timer = setTimeout(() => {
      const row = document.querySelector(`[data-path="${targetFile.path}"]`)
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      setSelected(targetFile)
      setPendingScrollTo(null)
    }, 300)

    return () => clearTimeout(timer)
  }, [pendingScrollTo, files, filteredFiles])

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || !hasMore) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDisplayCount((prev) => prev + LOAD_MORE_BATCH)
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore])

  const enableCheckboxes = useCallback((): void => {
    if (!showCheckboxes) setShowCheckboxes(true)
  }, [showCheckboxes])

  const handleMouseDown = useCallback((item: FileItem, index: number) => {
    longPressTriggeredRef.current = false
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true
      enableCheckboxes()
      toggleCheck(item.path)
    }, LONG_PRESS_MS)
  }, [enableCheckboxes, toggleCheck])

  const handleMouseUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const handleClick = useCallback((e: React.MouseEvent, item: FileItem, index: number) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false
      return
    }

    handleMouseUp()

    if (showCheckboxes || e.shiftKey) {
      enableCheckboxes()

      if (e.shiftKey && lastClickIndexRef.current !== null) {
        const from = Math.min(lastClickIndexRef.current, index)
        const to = Math.max(lastClickIndexRef.current, index)
        const pathsToCheck = filteredFiles.slice(from, to + 1).map((f) => f.path)
        const store = useFileStore.getState()
        const allInRangeChecked = pathsToCheck.every((p) => store.checkedPaths.has(p))
        if (allInRangeChecked) {
          pathsToCheck.forEach((p) => { if (store.checkedPaths.has(p)) store.toggleCheck(p) })
        } else {
          pathsToCheck.forEach((p) => { if (!store.checkedPaths.has(p)) store.toggleCheck(p) })
        }
      } else {
        toggleCheck(item.path)
      }
    } else {
      setSelected(item)
    }

    lastClickIndexRef.current = index
  }, [showCheckboxes, filteredFiles, enableCheckboxes, toggleCheck, setSelected, handleMouseUp])

  const handleDoubleClick = useCallback((item: FileItem) => {
    handleMouseUp()
    if (item.type === 'folder' || item.type === 'symlink') {
      onOpenFolder(item.path)
    }
  }, [onOpenFolder, handleMouseUp])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const handleNewFolder = useCallback(async () => {
    setContextMenu(null)
    setNewFolderDialogOpen(true)
  }, [])

  const handleRename = useCallback(() => {
    setContextMenu(null)
    const target = checkedPaths.size > 0
      ? files.find((f) => checkedPaths.has(f.path))
      : selected
    if (target) setRenameTarget(target)
  }, [selected, checkedPaths, files])

  const handleDelete = useCallback(async () => {
    setContextMenu(null)
    if (!current?.serial) return

    const targetFiles = checkedPaths.size > 0
      ? files.filter((f) => checkedPaths.has(f.path))
      : selected
        ? [selected]
        : []

    if (targetFiles.length === 0) return

    const names = targetFiles.map((f) => f.name).join('\n')
    const ok = window.confirm(`确定要删除以下文件吗？\n\n${names}`)
    if (!ok) return

    for (const f of targetFiles) {
      try {
        await window.api.deletePath(current.serial, f.path)
      } catch (err) {
        console.error('Delete failed:', err)
      }
    }
    useFileStore.getState().removeFilesFromList(targetFiles.map((f) => f.path))
  }, [current?.serial, selected, checkedPaths, files])

  const handleDownload = useCallback(async () => {
    setContextMenu(null)
    if (!current?.serial) return

    const targetFiles = checkedPaths.size > 0
      ? files.filter((f) => checkedPaths.has(f.path))
      : selected
        ? [selected]
        : []

    if (targetFiles.length === 0) return

    const localDir = await window.api.selectDirectory()
    if (!localDir) return

    for (const f of targetFiles) {
      addTask({
        serial: current.serial,
        fileName: f.name,
        fromPath: f.path,
        toPath: `${localDir}/${f.name}`,
        direction: 'pull'
      })
    }
    const next = startNextPending()
    if (next) executeTask(next)
  }, [current?.serial, selected, checkedPaths, files, addTask, startNextPending])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (!current?.serial) return

    const droppedFiles = Array.from(e.dataTransfer.files)
    for (const file of droppedFiles) {
      const filePath = window.api.getFilePath(file)
      console.log('[Drop] file:', file.name, 'path:', filePath)
      if (!filePath) continue
      const fileName = file.name
      const remotePath = `${currentPath}/${fileName}`
      addTask({
        serial: current.serial,
        fileName,
        fromPath: filePath,
        toPath: remotePath,
        direction: 'push'
      })
    }
    const next = startNextPending()
    if (next) executeTask(next)
  }, [current?.serial, currentPath, addTask, startNextPending])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setDragOver(false)
  }, [])

  const handleFileDragStart = useCallback((e: React.DragEvent, item: FileItem) => {
    if (!current?.serial) return
    if (item.type === 'folder') {
      e.preventDefault()
      return
    }
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('text/plain', item.name)
    window.api.startDrag(current.serial, item.path, item.name)
  }, [current?.serial])

  const handleResizeStart = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault()
    resizingRef.current = {
      index,
      startX: e.clientX,
      startWidth: widths[index],
      nextStartWidth: widths[index + 1]
    }

    const handleMouseMove = (e: MouseEvent): void => {
      if (!resizingRef.current || !tableRef.current) return
      const { index: idx, startX, startWidth, nextStartWidth } = resizingRef.current
      const tableWidth = tableRef.current.offsetWidth
      const dx = ((e.clientX - startX) / tableWidth) * 100
      const newWidth = Math.max(MIN_WIDTH, startWidth + dx)
      const nextWidth = Math.max(MIN_WIDTH, nextStartWidth - dx)

      setWidths((prev) => {
        const next = [...prev]
        next[idx] = newWidth
        next[idx + 1] = nextWidth
        return next
      })
    }

    const handleMouseUp = (): void => {
      resizingRef.current = null
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [widths])

  if (!current) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Folder className="mx-auto mb-2 h-10 w-10 opacity-30" />
          <p className="text-sm">请先选择设备</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-2 h-10 w-10 text-destructive opacity-50" />
          <p className="text-sm text-destructive">{error}</p>
          <p className="mt-1 text-xs">请检查设备连接状态或路径权限</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={tableRef}
      className={cn(
        'flex h-full flex-col overflow-hidden transition-colors',
        dragOver && 'bg-primary/5'
      )}
      onContextMenu={handleContextMenu}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {dragOver && (
        <div className="flex items-center justify-center gap-2 bg-primary/10 py-2 text-xs text-primary">
          <Upload className="h-4 w-4" />
          <span>释放文件以上传到当前目录</span>
        </div>
      )}
      <div className="flex items-center gap-2 border-b px-3 py-1.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          placeholder="搜索文件名..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        {keyword && (
          <button className="shrink-0 text-muted-foreground hover:text-foreground" onClick={() => setKeyword('')}>
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {showCheckboxes && (
          <>
            {checkedPaths.size > 0 && (
              <span className="shrink-0 text-xs text-primary">
                已选 {checkedPaths.size} 项
              </span>
            )}
            <button
              className="shrink-0 text-xs text-destructive hover:text-destructive/80"
              onClick={() => { clearChecks(); setShowCheckboxes(false) }}
            >
              取消
            </button>
          </>
        )}
        {keyword && (
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {filteredFiles.length}/{files.length}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b">
              {showCheckboxes && (
                <th className="h-9 pl-3 pr-2 align-middle" style={{ width: `${CHECKBOX_WIDTH}%` }}>
                  <div className="flex h-full items-center justify-center">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 cursor-pointer accent-primary"
                      checked={allChecked}
                      onChange={() => checkAll(filteredPaths)}
                    />
                  </div>
                </th>
              )}
              {columns.map((col, i) => (
                <th
                  key={col.key}
                  className="relative h-9 px-3 text-left align-middle font-medium text-muted-foreground"
                  style={{ width: showCheckboxes ? `${widths[i]}%` : (i === 0 ? `${widths[i] + CHECKBOX_WIDTH}%` : `${widths[i]}%`) }}
                >
                  <span className={col.align === 'right' ? 'float-right' : ''}>{col.label}</span>
                  {i < columns.length - 1 && (
                    <div
                      className="absolute right-0 top-1 bottom-1 w-px cursor-col-resize group"
                      onMouseDown={(e) => handleResizeStart(e, i)}
                    >
                      <div className="h-full w-px bg-border group-hover:bg-primary transition-colors" />
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedFiles.map((item, index) => {
              const isChecked = checkedPaths.has(item.path)
              return (
                <tr
                  key={item.path}
                  data-path={item.path}
                  className={cn(
                    'border-b cursor-pointer select-none transition-colors hover:bg-muted/50',
                    selected?.path === item.path && !showCheckboxes && 'bg-primary/10',
                    isChecked && showCheckboxes && 'bg-primary/10'
                  )}
                  draggable
                  onMouseDown={() => handleMouseDown(item, index)}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onClick={(e) => handleClick(e, item, index)}
                  onDoubleClick={() => handleDoubleClick(item)}
                  onDragStart={(e) => handleFileDragStart(e, item)}
                >
                  {showCheckboxes && (
                    <td className="pl-3 pr-2 align-middle" style={{ width: `${CHECKBOX_WIDTH}%` }}>
                      <div className="flex h-full items-center justify-center">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 cursor-pointer accent-primary"
                          checked={isChecked}
                          onChange={() => toggleCheck(item.path)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </td>
                  )}
                  {columns.map((col, i) => (
                    <td
                      key={col.key}
                      className={cn('px-3 py-1.5 align-middle overflow-hidden', col.align === 'right' && 'text-right')}
                      style={{ width: showCheckboxes ? `${widths[i]}%` : (i === 0 ? `${widths[i] + CHECKBOX_WIDTH}%` : `${widths[i]}%`) }}
                    >
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              )
            })}
            {hasMore && (
              <tr>
                <td colSpan={columns.length + (showCheckboxes ? 1 : 0)}>
                  <div ref={loadMoreRef} className="py-2 text-center text-xs text-muted-foreground">
                    加载更多...
                  </div>
                </td>
              </tr>
            )}
            {filteredFiles.length === 0 && (
              <tr>
                <td colSpan={columns.length + (showCheckboxes ? 1 : 0)} className="h-32 text-center text-muted-foreground">
                  {keyword ? '没有匹配的文件' : '此目录为空'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onNewFolder={handleNewFolder}
          onRename={handleRename}
          onDelete={handleDelete}
          onDownload={handleDownload}
          hasTarget={!!selected || checkedPaths.size > 0}
          isMultiSelect={checkedPaths.size > 1}
        />
      )}
      <InputDialog
        open={newFolderDialogOpen}
        title="新建文件夹"
        label="文件夹名称"
        placeholder="新建文件夹"
        onConfirm={async (name) => {
          if (!current?.serial) return
          await window.api.mkdir(current.serial, `${currentPath}/${name}`)
          await useFileStore.getState().loadCurrentPath(current.serial)
          useFileStore.getState().setPendingScrollTo(name)
          setNewFolderDialogOpen(false)
        }}
        onCancel={() => setNewFolderDialogOpen(false)}
      />
      <InputDialog
        open={!!renameTarget}
        title="重命名"
        label="新名称"
        defaultValue={renameTarget?.name}
        onConfirm={async (name) => {
          if (!current?.serial || !renameTarget) return
          const parentPath = renameTarget.path.substring(0, renameTarget.path.lastIndexOf('/'))
          const newPath = `${parentPath}/${name}`
          await window.api.rename(current.serial, renameTarget.path, newPath)
          useFileStore.getState().updateFileInList(renameTarget.path, { name, path: newPath })
          setRenameTarget(null)
        }}
        onCancel={() => setRenameTarget(null)}
      />
    </div>
  )
}
