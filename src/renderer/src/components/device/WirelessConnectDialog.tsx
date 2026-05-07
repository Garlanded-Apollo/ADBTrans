import { useState } from 'react'
import { Wifi, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDeviceStore } from '@/stores/deviceStore'

interface WirelessConnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WirelessConnectDialog({ open, onOpenChange }: WirelessConnectDialogProps): JSX.Element {
  const [host, setHost] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const { connectDevice } = useDeviceStore()

  const handleConnect = async (): Promise<void> => {
    if (!host.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await connectDevice(host.trim())
      setResult(res)
      if (res.success) {
        setTimeout(() => {
          onOpenChange(false)
          setHost('')
          setResult(null)
        }, 1200)
      }
    } catch (err) {
      setResult({ success: false, message: (err as Error).message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            无线连接
          </DialogTitle>
          <DialogDescription>
            输入手机的 IP 地址和端口号进行无线 ADB 连接
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">IP 地址:端口</label>
            <Input
              placeholder="例如: 192.168.1.100:5555"
              value={host}
              onChange={(e) => { setHost(e.target.value); setResult(null) }}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              默认端口为 5555，可省略。需先在手机上开启无线调试。
            </p>
          </div>

          {result && (
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                result.success
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-destructive/30 bg-destructive/5 text-destructive'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span className="truncate">{result.message}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleConnect} disabled={!host.trim() || loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            连接
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
