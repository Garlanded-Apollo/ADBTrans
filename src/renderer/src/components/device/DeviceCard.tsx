import { useEffect, useState } from 'react'
import { Smartphone, Wifi, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDeviceStore } from '@/stores/deviceStore'
import { Button } from '@/components/ui/button'

interface DeviceCardProps {
  onOpenWifiDialog?: () => void
}

interface DeviceStats {
  storage: { totalKB: number; usedKB: number; freeKB: number } | null
  memory: { totalKB: number; usedKB: number; freeKB: number } | null
}

const STATE_DOT_CLASS: Record<string, string> = {
  device: 'bg-green-500',
  offline: 'bg-yellow-500',
  unauthorized: 'bg-red-500'
}

const STATE_DOT_TITLE: Record<string, string> = {
  device: '已连接',
  offline: '离线',
  unauthorized: '未授权'
}

const STATE_LABEL: Record<string, string> = {
  offline: '离线',
  unauthorized: '未授权'
}

const STATS_REFRESH_INTERVAL = 10000

function formatSize(kb: number, short = false): string {
  const gb = kb / 1024 / 1024
  if (gb >= 1024) return short ? `${(gb / 1024).toFixed(1)}T` : `${(gb / 1024).toFixed(1)} TB`
  if (gb >= 1) return short ? `${gb.toFixed(1)}G` : `${gb.toFixed(1)} GB`
  return short ? `${Math.max(1, Math.round(kb / 1024))}M` : `${Math.max(1, Math.round(kb / 1024))} MB`
}

function RingChart({ pct, className }: { pct: number; className?: string }): JSX.Element {
  const radius = 6.5
  const circumference = 2 * Math.PI * radius
  const filled = (Math.min(100, Math.max(0, pct)) / 100) * circumference
  return (
    <svg viewBox="0 0 16 16" className={cn('h-4 w-4 shrink-0 -rotate-90', className)}>
      <circle cx="8" cy="8" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
      <circle
        cx="8"
        cy="8"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        className="transition-all duration-500"
      />
    </svg>
  )
}

export function DeviceCard({ onOpenWifiDialog }: DeviceCardProps): JSX.Element {
  const { devices, current, adbStatus, setCurrent, refreshDevices } = useDeviceStore()
  const [stats, setStats] = useState<DeviceStats | null>(null)

  const statsSerial = current?.state === 'device' ? current.serial : null

  useEffect(() => {
    if (!statsSerial) {
      setStats(null)
      return
    }
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    setStats(null)

    const load = async (): Promise<void> => {
      try {
        const result = await window.api.getDeviceStats(statsSerial)
        if (!cancelled) {
          // 单次 df 读取失败时保留上一次的数值，避免 ROM/内存信息闪一下消失
          setStats((prev) => ({
            storage: result.storage ?? prev?.storage ?? null,
            memory: result.memory ?? prev?.memory ?? null
          }))
        }
      } catch {
        // 瞬时失败不清空已有数据，下一轮会继续重试
      } finally {
        if (!cancelled) timer = setTimeout(load, STATS_REFRESH_INTERVAL)
      }
    }

    load()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [statsSerial])

  let storageValue: string | null = null
  let storageTitle: string | null = null
  let storagePct = 0
  let storageClass = 'text-muted-foreground'
  let storageRingClass = 'text-primary'
  if (stats?.storage) {
    const { totalKB, usedKB, freeKB } = stats.storage
    const usedPct = totalKB > 0 ? (usedKB / totalKB) * 100 : 0
    const freePct = 100 - usedPct
    storagePct = Math.min(100, Math.max(0, usedPct))
    storageValue = `${formatSize(freeKB, true)}可用`
    storageTitle = `ROM：剩余 ${formatSize(freeKB)} / 共 ${formatSize(totalKB)}（已用 ${usedPct.toFixed(0)}%）`
    if (freePct < 10) {
      storageClass = 'text-red-500'
      storageRingClass = 'text-red-500'
    } else if (freePct < 20) {
      storageClass = 'text-yellow-600'
      storageRingClass = 'text-yellow-600'
    }
  }

  let memoryValue: string | null = null
  let memoryTitle: string | null = null
  let memoryPct = 0
  let memoryClass = 'text-muted-foreground'
  let memoryRingClass = 'text-primary'
  if (stats?.memory) {
    const { totalKB, usedKB } = stats.memory
    const usedPct = totalKB > 0 ? Math.round((usedKB / totalKB) * 100) : 0
    memoryPct = Math.min(100, Math.max(0, usedPct))
    memoryValue = `${formatSize(usedKB, true)}/${formatSize(totalKB, true)}`
    memoryTitle = `RAM：已用 ${formatSize(usedKB)} / 共 ${formatSize(totalKB)}（占用 ${usedPct}%）`
    if (usedPct >= 90) {
      memoryClass = 'text-red-500'
      memoryRingClass = 'text-red-500'
    } else if (usedPct >= 70) {
      memoryClass = 'text-yellow-600'
      memoryRingClass = 'text-yellow-600'
    }
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

      {devices.map((d) => {
        const isCurrent = current?.serial === d.serial
        const showStats = isCurrent && d.state === 'device' && (storageValue || memoryValue)
        return (
          <div
            key={d.serial}
            className={cn(
              'flex w-full items-center gap-2 rounded-xl border px-2 py-2 text-left transition-colors cursor-pointer',
              isCurrent ? 'border-primary/40 bg-primary/10' : 'border-transparent hover:bg-muted'
            )}
            onClick={() => setCurrent(d)}
          >
            <div className={cn(
              'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
              d.state === 'device' ? 'bg-green-500' : 'bg-muted'
            )}>
              <Smartphone className={cn('h-3.5 w-3.5', d.state === 'device' ? 'text-white' : '')} />
              {d.state !== 'device' && (
                <span
                  className={cn(
                    'absolute bottom-0 right-0 h-2 w-2 rounded-full border border-background',
                    STATE_DOT_CLASS[d.state] || 'bg-muted-foreground/40'
                  )}
                  title={STATE_DOT_TITLE[d.state] || '未知'}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" data-i18n-ignore>{d.model || d.serial}</div>
              <div className="text-[10px] text-muted-foreground truncate" data-i18n-ignore>
                {d.model ? d.serial : STATE_LABEL[d.state] || ''}
              </div>
            </div>
            {d.state !== 'device' ? (
              <span className="shrink-0 text-[10px] text-muted-foreground">{STATE_LABEL[d.state] || '未知'}</span>
            ) : showStats ? (
              <div className="flex shrink-0 flex-col gap-1">
                {storageValue && (
                  <div className="grid grid-cols-[auto_2.2em_minmax(0,1fr)] items-center gap-x-1.5 text-[10px]" title={storageTitle || undefined}>
                    <RingChart pct={storagePct} className={storageRingClass} />
                    <span className="font-medium text-muted-foreground">ROM</span>
                    <span className={cn('text-right', storageClass)}>{storageValue}</span>
                  </div>
                )}
                {memoryValue && (
                  <div className="grid grid-cols-[auto_2.2em_minmax(0,1fr)] items-center gap-x-1.5 text-[10px]" title={memoryTitle || undefined}>
                    <RingChart pct={memoryPct} className={memoryRingClass} />
                    <span className="font-medium text-muted-foreground">RAM</span>
                    <span className={cn('text-right', memoryClass)}>{memoryValue}</span>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )
      })}

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
