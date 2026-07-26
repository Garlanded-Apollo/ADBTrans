import { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps): JSX.Element {
  const [autoLaunch, setAutoLaunch] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setLoading(true)
      window.api.getAutoLaunch().then((enabled) => {
        setAutoLaunch(enabled)
        setLoading(false)
      })
    }
  }, [open])

  const handleToggleAutoLaunch = async (): Promise<void> => {
    const newValue = !autoLaunch
    setAutoLaunch(newValue)
    await window.api.setAutoLaunch(newValue)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">开机自启动</div>
              <div className="text-xs text-muted-foreground">打开后检测到设备连接自动显示窗口</div>
            </div>
            <button
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoLaunch ? 'bg-primary' : 'bg-muted'
              }`}
              onClick={handleToggleAutoLaunch}
              disabled={loading}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoLaunch ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
