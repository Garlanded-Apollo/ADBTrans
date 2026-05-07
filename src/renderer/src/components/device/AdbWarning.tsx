import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDeviceStore } from '@/stores/deviceStore'

export function AdbWarning(): JSX.Element {
  const { checkAdb } = useDeviceStore()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl border bg-card p-8 shadow-lg">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">未检测到 ADB</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ADBTrans 需要 ADB (Android Debug Bridge) 才能与手机通信。
            请确保已安装 ADB 并添加到系统 PATH 中。
          </p>

          <div className="mt-6 w-full space-y-3">
            <div className="rounded-lg border bg-muted/50 p-3 text-left text-xs">
              <p className="mb-1 font-medium">安装方式：</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• macOS: <code className="rounded bg-muted px-1">brew install android-platform-tools</code></li>
                <li>• Windows: 下载 Google 官方 Platform Tools 并添加到 PATH</li>
                <li>• 或安装 Android Studio（自带 ADB）</li>
              </ul>
            </div>

            <Button className="w-full" onClick={() => checkAdb()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              重新检测
            </Button>

            <a
              href="https://developer.android.com/tools/releases/platform-tools"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              <ExternalLink className="h-4 w-4" />
              下载 Platform Tools
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
