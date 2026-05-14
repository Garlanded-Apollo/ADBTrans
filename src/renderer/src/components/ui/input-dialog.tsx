import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface InputDialogProps {
  open: boolean
  title: string
  label: string
  placeholder?: string
  defaultValue?: string
  onConfirm: (value: string) => void
  onCancel: () => void
}

export function InputDialog({ open, title, label, placeholder, defaultValue, onConfirm, onCancel }: InputDialogProps): JSX.Element {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setValue(defaultValue || '')
      setTimeout(() => inputRef.current?.select(), 50)
    }
  }, [open, defaultValue])

  const handleConfirm = (): void => {
    if (value.trim()) onConfirm(value.trim())
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-2">
          <label className="text-xs text-muted-foreground">{label}</label>
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>取消</Button>
          <Button onClick={handleConfirm}>确定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
