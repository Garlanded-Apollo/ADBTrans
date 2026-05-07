import { Smartphone, Usb, Wifi, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDeviceStore } from '@/stores/deviceStore'

export function DeviceCard(): JSX.Element {
  const { devices, current, adbStatus, setCurrent } = useDeviceStore()

  const stateIcon = (state: string): JSX.Element => {
    if (state === 'device') return <Usb className="h-3.5 w-3.5 text-green-500" />
    if (state === 'offline') return <Wifi className="h-3.5 w-3.5 text-yellow-500" />
    if (state === 'unauthorized') return <Shield className="h-3.5 w-3.5 text-red-500" />
    return <Wifi className="h-3.5 w-3.5 text-muted-foreground" />
  }

  const stateLabel = (state: string): string => {
    if (state === 'device') return '已连接'
    if (state === 'offline') return '离线'
    if (state === 'unauthorized') return '未授权'
    return '未知'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Smartphone className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">设备</span>
        <span className="ml-auto text-xs text-muted-foreground">{devices.length}</span>
      </div>

      {adbStatus && !adbStatus.available && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          未检测到 ADB
        </div>
      )}

      {devices.map((d) => (
        <button
          key={d.serial}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
            current?.serial === d.serial ? 'border-primary/40 bg-primary/10' : 'border-transparent hover:bg-muted'
          )}
          onClick={() => setCurrent(d)}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
            <Smartphone className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{d.model || d.serial}</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {stateIcon(d.state)}
              <span>{stateLabel(d.state)}</span>
            </div>
          </div>
        </button>
      ))}

      {devices.length === 0 && adbStatus?.available && (
        <div className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
          未检测到设备
        </div>
      )}
    </div>
  )
}
