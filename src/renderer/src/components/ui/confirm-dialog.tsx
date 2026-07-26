import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

function splitNameForMiddleEllipsis(name: string): { head: string; tail: string } {
  const lastDot = name.lastIndexOf('.')
  if (lastDot > 0 && lastDot < name.length - 1) {
    return {
      head: name.slice(0, lastDot),
      tail: name.slice(lastDot)
    }
  }

  if (name.length > 16) {
    return {
      head: name.slice(0, -8),
      tail: name.slice(-8)
    }
  }

  return { head: name, tail: '' }
}

function MiddleEllipsisText({ value }: { value: string }): JSX.Element {
  const { head, tail } = splitNameForMiddleEllipsis(value)

  return (
    <span className="flex min-w-0 max-w-full items-baseline font-mono text-xs" title={value}>
      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{head}</span>
      {tail && <span className="shrink-0 whitespace-nowrap">{tail}</span>}
    </span>
  )
}

function ConfirmMessage({ message }: { message: string }): JSX.Element {
  const lines = message.split('\n')
  const blankIndex = lines.findIndex((line) => line.trim() === '')
  const introLines = blankIndex >= 0 ? lines.slice(0, blankIndex) : lines
  const itemLines = blankIndex >= 0 ? lines.slice(blankIndex + 1).filter(Boolean) : []

  return (
    <div className="space-y-3 text-sm text-muted-foreground">
      {introLines.length > 0 && (
        <div className="space-y-1">
          {introLines.map((line, index) => (
            <p key={`${line}-${index}`}>{line}</p>
          ))}
        </div>
      )}
      {itemLines.length > 0 && (
        <div className="max-h-[min(45vh,360px)] min-w-0 space-y-1 overflow-auto rounded-md border bg-muted/25 p-2">
          {itemLines.map((line, index) => (
            <div key={`${line}-${index}`} className="min-w-0 rounded px-1.5 py-1 hover:bg-muted">
              <MiddleEllipsisText value={line} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '确定',
  cancelLabel = '取消',
  destructive = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps): JSX.Element {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => confirmRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Enter') onConfirm()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onConfirm])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent
        className={cn(
          'flex h-[360px] min-h-[300px] w-[min(520px,calc(100vw-2rem))] min-w-[360px] flex-col',
          'max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] resize overflow-hidden'
        )}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {destructive && <AlertTriangle className="h-5 w-5 text-destructive" />}
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-3 min-h-0 flex-1 overflow-auto">
          <ConfirmMessage message={message} />
        </div>
        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={onCancel}>{cancelLabel}</Button>
          <Button
            ref={confirmRef}
            variant={destructive ? 'destructive' : 'default'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
