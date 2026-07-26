import { useState } from 'react'
import { Monitor, Settings, Smartphone, Usb, Wifi, Shield, ChevronDown, Unplug, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown-menu'
import { SettingsDialog } from '@/components/settings/SettingsDialog'
import { useDeviceStore } from '@/stores/deviceStore'

interface TitleBarProps {
  onOpenWifiDialog?: () => void
}

export function TitleBar({ onOpenWifiDialog }: TitleBarProps): JSX.Element {
  const { devices, current, adbStatus, setCurrent, disconnectDevice, refreshDevices } = useDeviceStore()
  const [settingsOpen, setSettingsOpen] = useState(false)

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

  const stateBadgeVariant = (state: string): 'success' | 'warning' | 'destructive' | 'secondary' => {
    if (state === 'device') return 'success'
    if (state === 'offline') return 'warning'
    if (state === 'unauthorized') return 'destructive'
    return 'secondary'
  }

  const connectedDevices = devices.filter((d) => d.state === 'device')
  const otherDevices = devices.filter((d) => d.state !== 'device')

  return (
    <div className="flex h-10 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">ADBTrans</span>
        </div>

        {adbStatus?.available && (
          <>
            <div className="h-4 w-px bg-border" />
            <DropdownMenu
              trigger={
                <button className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-muted">
                  <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="max-w-[160px] truncate font-medium">
                    {current ? current.model || current.serial : '选择设备'}
                  </span>
                  {current && (
                    <Badge variant={stateBadgeVariant(current.state)} className="ml-1">
                      {stateLabel(current.state)}
                    </Badge>
                  )}
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              }
              align="start"
              className="w-[260px]"
            >
              {connectedDevices.length > 0 && (
                <>
                  <div className="px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    已连接设备
                  </div>
                  {connectedDevices.map((d) => (
                    <DropdownItem
                      key={d.serial}
                      icon={stateIcon(d.state)}
                      onClick={() => setCurrent(d)}
                    >
                      <div className="flex flex-1 items-center justify-between">
                        <span className="truncate">{d.model || d.serial}</span>
                        {current?.serial === d.serial && (
                          <span className="ml-2 text-[10px] text-primary">当前</span>
                        )}
                      </div>
                    </DropdownItem>
                  ))}
                </>
              )}

              {otherDevices.length > 0 && (
                <>
                  {connectedDevices.length > 0 && <DropdownSeparator />}
                  <div className="px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    其他设备
                  </div>
                  {otherDevices.map((d) => (
                    <DropdownItem
                      key={d.serial}
                      icon={stateIcon(d.state)}
                      onClick={() => setCurrent(d)}
                    >
                      <span className="truncate">{d.model || d.serial}</span>
                    </DropdownItem>
                  ))}
                </>
              )}

              {devices.length === 0 && (
                <div className="px-2.5 py-3 text-center text-xs text-muted-foreground">
                  未检测到设备
                </div>
              )}

              <DropdownSeparator />
              <DropdownItem
                icon={<RefreshCw className="h-3.5 w-3.5" />}
                onClick={() => refreshDevices()}
              >
                刷新设备列表
              </DropdownItem>
              <DropdownItem
                icon={<Wifi className="h-3.5 w-3.5" />}
                onClick={() => onOpenWifiDialog?.()}
              >
                无线连接 (IP)
              </DropdownItem>

              {current && current.state === 'device' && (
                <>
                  <DropdownSeparator />
                  <DropdownItem
                    icon={<Unplug className="h-3.5 w-3.5" />}
                    destructive
                    onClick={() => disconnectDevice(current.serial)}
                  >
                    断开连接
                  </DropdownItem>
                </>
              )}
            </DropdownMenu>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSettingsOpen(true)}>
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
