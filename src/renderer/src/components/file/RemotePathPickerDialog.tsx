import { useEffect, useState } from 'react'
import { ArrowUp, Folder, Loader2, RefreshCw } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const SDCARD_ROOT = '/storage/emulated/0'

const QUICK_LOCATIONS = [
  { label: '内部存储', path: SDCARD_ROOT },
  { label: 'Download', path: `${SDCARD_ROOT}/Download` },
  { label: 'DCIM', path: `${SDCARD_ROOT}/DCIM` },
  { label: 'Pictures', path: `${SDCARD_ROOT}/Pictures` },
  { label: 'Documents', path: `${SDCARD_ROOT}/Documents` },
  { label: 'Movies', path: `${SDCARD_ROOT}/Movies` },
  { label: 'Music', path: `${SDCARD_ROOT}/Music` }
]

function normalizeSdcardPath(path: string): string {
  const trimmed = path.trim().replace(/\/+$/, '') || '/'
  if (trimmed === '/sdcard') return SDCARD_ROOT
  if (trimmed.startsWith('/sdcard/')) return `${SDCARD_ROOT}${trimmed.slice('/sdcard'.length)}`
  return trimmed
}

interface RemotePathPickerDialogProps {
  open: boolean
  title: string
  serial: string | null
  initialPath: string
  confirmLabel: string
  onConfirm: (path: string) => void
  onCancel: () => void
}

export function RemotePathPickerDialog({
  open,
  title,
  serial,
  initialPath,
  confirmLabel,
  onConfirm,
  onCancel
}: RemotePathPickerDialogProps): JSX.Element {
  const [value, setValue] = useState('')
  const [browsePath, setBrowsePath] = useState(SDCARD_ROOT)
  const [folders, setFolders] = useState<{ name: string; path: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!open) return
    const normalized = normalizeSdcardPath(initialPath)
    setValue(normalized)
    setBrowsePath(normalized.startsWith('/') ? normalized : SDCARD_ROOT)
  }, [open, initialPath])

  useEffect(() => {
    if (!open || !serial) return
    let cancelled = false
    setLoading(true)
    setError(null)

    window.api
      .listFiles(serial, browsePath)
      .then((entries) => {
        if (cancelled) return
        setFolders(
          entries
            .filter((entry) => entry.type === 'folder')
            .map((entry) => ({ name: entry.name, path: entry.path }))
            .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN', { numeric: true }))
        )
      })
      .catch(() => {
        if (!cancelled) {
          setFolders([])
          setError('无法读取该目录')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, serial, browsePath, reloadKey])

  const navigateTo = (path: string): void => {
    setBrowsePath(path)
    setValue(path)
  }

  const handleGo = (): void => {
    const normalized = normalizeSdcardPath(value)
    if (!normalized.startsWith('/')) {
      setError('目标路径必须是手机上的绝对路径（以 / 开头）')
      return
    }
    setError(null)
    setValue(normalized)
    setBrowsePath(normalized)
  }

  const handleUp = (): void => {
    if (browsePath === '/') return
    const parent = browsePath.replace(/\/[^/]+$/, '') || '/'
    navigateTo(parent)
  }

  const handleConfirm = (): void => {
    const path = value.trim()
    if (path) onConfirm(path)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="flex h-[540px] w-[min(600px,calc(100vw-2rem))] max-w-none flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="mt-3 shrink-0 space-y-2">
          <label className="text-xs text-muted-foreground">目标目录（手机上的绝对路径）</label>
          <div className="flex gap-2">
            <Input
              value={value}
              placeholder="/storage/emulated/0/Download"
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleGo()}
              data-i18n-ignore
            />
            <Button variant="outline" className="shrink-0" onClick={handleGo}>
              转到
            </Button>
          </div>
        </div>

        <div className="mt-3 flex min-h-0 flex-1 gap-3">
          <div className="w-36 shrink-0 space-y-1 overflow-y-auto border-r pr-2">
            <div className="px-1 pb-1 text-[11px] text-muted-foreground">常用位置</div>
            {QUICK_LOCATIONS.map((location) => (
              <button
                key={location.path}
                className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs transition-colors hover:bg-muted"
                onClick={() => navigateTo(location.path)}
              >
                <Folder className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                <span className="truncate">{location.label}</span>
              </button>
            ))}
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center gap-1 pb-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={handleUp}
                disabled={browsePath === '/'}
                title="上一级"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={browsePath} data-i18n-ignore>
                {browsePath}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setReloadKey((key) => key + 1)}
                title="刷新"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                  <span className="text-xs text-destructive">{error}</span>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setReloadKey((key) => key + 1)}>
                    重试
                  </Button>
                </div>
              ) : folders.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">该目录下没有子文件夹</div>
              ) : (
                folders.map((folder) => (
                  <button
                    key={folder.path}
                    className="flex w-full items-center gap-2 border-b px-2.5 py-2 text-left text-xs transition-colors last:border-b-0 hover:bg-muted"
                    onClick={() => navigateTo(folder.path)}
                    data-i18n-ignore
                  >
                    <Folder className="h-4 w-4 shrink-0 text-blue-500" />
                    <span className="truncate">{folder.name}</span>
                  </button>
                ))
              )}
            </div>

            <div className="mt-2 flex shrink-0 items-center justify-between gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setValue(browsePath)}>
                使用此文件夹
              </Button>
              <span className="min-w-0 truncate text-[11px] text-muted-foreground" data-i18n-ignore>
                {browsePath}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!value.trim()}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
