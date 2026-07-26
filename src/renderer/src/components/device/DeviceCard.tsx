import { Smartphone, Usb, Wifi, Shield, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDeviceStore } from '@/stores/deviceStore'
import { Button } from '@/components/ui/button'

interface DeviceCardProps {
  onOpenWifiDialog?: () => void
}

export function DeviceCard({ onOpenWifiDialog }: DeviceCardProps): JSX.Element {
  const { devices, current, adbStatus, setCurrent, refreshDevices } = useDeviceStore()

  const stateIcon = (state: string): JSX.Element => {
    if (state === 'device') return <Usb className="h-3 w-3 text-green-500" />
    if (state === 'offline') return <Wifi className="h-3 w-3 text-yellow-500" />
    if (state === 'unauthorized') return <Shield className="h-3 w-3 text-red-500" />
    return <Wifi className="h-3 w-3 text-muted-foreground" />
  }

  const stateLabel = (state: string): string => {
    if (state === 'device') return '已连接'
    if (state === 'offline') return '离线'
    if (state === 'unauthorized') return '未授权'
    return '未知'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 px-1">
        <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground">设备</span>
        <span className="ml-auto text-[10px] text-muted-foreground">{devices.length}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4"
          onClick={() => refreshDevices()}
          title="刷新设备"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {adbStatus && !adbStatus.available && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          未检测到 ADB
        </div>
      )}

      {devices.map((d) => (
        <div
          key={d.serial}
          className={cn(
            'flex w-full items-center gap-2 rounded-xl border px-2 py-2 text-left transition-colors cursor-pointer',
            current?.serial === d.serial ? 'border-primary/40 bg-primary/10' : 'border-transparent hover:bg-muted'
          )}
          onClick={() => setCurrent(d)}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Smartphone className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{d.model || d.serial}</div>
            {d.model && (
              <div className="text-[10px] text-muted-foreground truncate">{d.serial}</div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-0 text-[10px] text-muted-foreground">
            {stateIcon(d.state)}
            <span>{stateLabel(d.state)}</span>
          </div>
        </div>
      ))}

      {devices.length === 0 && adbStatus?.available && (
        <div className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
          未检测到设备
        </div>
      )}

      {adbStatus?.available && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={onOpenWifiDialog}
        >
          <Wifi className="mr-1.5 h-3 w-3" />
          无线连接
        </Button>
      )}
    </div>
  )
}
