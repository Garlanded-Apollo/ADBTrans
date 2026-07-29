import { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  Info,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SettingsPage = 'main' | 'about'

function getUpdateErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('检查更新超时')) return '检查更新超时，请检查网络连接后重试'
  if (message.includes('限制了检查频率')) return '检查次数较多，请稍后再试'
  if (message.includes('无法识别版本号')) return 'Release 版本号格式不正确'
  return '检查更新失败，请检查网络连接后重试'
}

function formatPublishedDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('zh-CN')
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps): JSX.Element {
  const [page, setPage] = useState<SettingsPage>('main')
  const [autoLaunch, setAutoLaunch] = useState(false)
  const [loading, setLoading] = useState(false)
  const [appInfo, setAppInfo] = useState<AppRuntimeInfo | null>(null)
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setPage('main')
      return
    }

    setLoading(true)
    Promise.all([window.api.getAutoLaunch(), window.api.getAppInfo()])
      .then(([enabled, info]) => {
        setAutoLaunch(enabled)
        setAppInfo(info)
      })
      .catch(() => {
        setAppInfo(null)
      })
      .finally(() => setLoading(false))
  }, [open])

  const handleToggleAutoLaunch = async (): Promise<void> => {
    const newValue = !autoLaunch
    setAutoLaunch(newValue)
    await window.api.setAutoLaunch(newValue)
  }

  const handleCheckForUpdates = async (force = false): Promise<void> => {
    setUpdateLoading(true)
    setUpdateError(null)

    try {
      const result = await window.api.checkForUpdates(force)
      setUpdateInfo(result)
      setAppInfo(result)
    } catch (error) {
      setUpdateError(getUpdateErrorMessage(error))
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleOpenAbout = (): void => {
    setPage('about')
    void handleCheckForUpdates(false)
  }

  const handleOpenUrl = async (url: string): Promise<void> => {
    try {
      await window.api.openUpdateUrl(url)
    } catch {
      setUpdateError('无法打开 GitHub Release 页面')
    }
  }

  const publishedDate = formatPublishedDate(updateInfo?.publishedAt || null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {page === 'main' ? (
          <>
            <DialogHeader>
              <DialogTitle>设置</DialogTitle>
            </DialogHeader>
            <div className="mt-4 divide-y">
              <div className="flex items-center justify-between pb-4">
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
                  aria-label="切换开机自启动"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoLaunch ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <button
                className="flex w-full items-center gap-3 pt-4 text-left hover:text-primary"
                onClick={handleOpenAbout}
              >
                <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">关于与更新</div>
                  <div className="text-xs text-muted-foreground">
                    当前版本 {appInfo ? `v${appInfo.version}` : '读取中...'}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="flex-row items-center space-y-0">
              <Button
                variant="ghost"
                size="icon"
                className="-ml-2 mr-1 h-8 w-8"
                onClick={() => setPage('main')}
                aria-label="返回设置"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <DialogTitle>关于与更新</DialogTitle>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-base font-semibold">ADBTrans</div>
                <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                  <span className="text-muted-foreground">当前版本</span>
                  <span>{appInfo ? `v${appInfo.version}` : '读取中...'}</span>
                  <span className="text-muted-foreground">运行平台</span>
                  <span>{appInfo?.platformLabel || '读取中...'}</span>
                </div>
              </div>

              {updateLoading && (
                <div className="flex items-center justify-center rounded-lg border py-6 text-xs text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在检查 GitHub Release...
                </div>
              )}

              {!updateLoading && updateError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex items-center gap-2 text-xs text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{updateError}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => void handleCheckForUpdates(true)}
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    重新检查
                  </Button>
                </div>
              )}

              {!updateLoading && !updateError && updateInfo?.noRelease && (
                <div className="rounded-lg border p-4 text-xs text-muted-foreground">
                  GitHub 暂无已发布的正式版本。
                </div>
              )}

              {!updateLoading && !updateError && updateInfo && !updateInfo.noRelease && (
                <div className="space-y-3 rounded-lg border p-4">
                  {updateInfo.updateAvailable ? (
                    <>
                      <div>
                        <div className="text-sm font-medium text-primary">
                          发现新版本 v{updateInfo.latestVersion}
                        </div>
                        {publishedDate && (
                          <div className="mt-1 text-xs text-muted-foreground">发布于 {publishedDate}</div>
                        )}
                      </div>

                      {updateInfo.assetAvailable && updateInfo.downloadUrl ? (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => void handleOpenUrl(updateInfo.downloadUrl!)}
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          下载 {updateInfo.platformLabel} 版本
                        </Button>
                      ) : (
                        <div className="rounded bg-muted px-3 py-2 text-xs text-muted-foreground">
                          新版本已发布，但暂未提供适配 {updateInfo.platformLabel} 的安装包。
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-emerald-600">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>当前已是最新版本（已发布 v{updateInfo.latestVersion}）</span>
                    </div>
                  )}

                  {updateInfo.releaseNotes && (
                    <div>
                      <div className="mb-1 text-xs font-medium">版本说明</div>
                      <div className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded bg-muted/60 p-2 text-[11px] leading-relaxed text-muted-foreground">
                        {updateInfo.releaseNotes}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleOpenUrl(updateInfo.releaseUrl)}
                    >
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      查看 Release
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleCheckForUpdates(true)}
                    >
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                      重新检查
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
