import { ArrowLeft, ArrowRight, Home, Search, FolderUp, FolderDown, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useFileStore } from '@/stores/fileStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useState, useEffect } from 'react'

export function Toolbar(): JSX.Element {
  const { currentPath, goBack, goForward, canGoBack, canGoForward, selected, navigateTo } = useFileStore()
  const { current } = useDeviceStore()
  const [inputPath, setInputPath] = useState(currentPath)

  useEffect(() => { setInputPath(currentPath) }, [currentPath])

  const navigate = (path: string): void => {
    const trimmed = path.trim()
    if (!trimmed || !current?.serial) return
    navigateTo(trimmed, current.serial)
  }

  const handleGoBack = (): void => {
    const p = goBack()
    if (p && current?.serial) {
      useFileStore.getState().loadCurrentPath(current.serial)
    }
  }

  const handleGoForward = (): void => {
    const p = goForward()
    if (p && current?.serial) {
      useFileStore.getState().loadCurrentPath(current.serial)
    }
  }

  return (
    <div className="flex h-11 items-center gap-1.5 border-b px-3">
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleGoBack} disabled={!canGoBack()}>
        <ArrowLeft className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleGoForward} disabled={!canGoForward()}>
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate('/storage/emulated/0')}>
        <Home className="h-3.5 w-3.5" />
      </Button>
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-7 pl-8 text-xs" value={inputPath} onChange={(e) => setInputPath(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && navigate(inputPath)} placeholder="/storage/emulated/0" />
      </div>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Button variant="ghost" size="icon" className="h-7 w-7" title="上传到手机"><FolderUp className="h-3.5 w-3.5" /></Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" title="下载到电脑"><FolderDown className="h-3.5 w-3.5" /></Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="删除" disabled={!selected}><Trash2 className="h-3.5 w-3.5" /></Button>
    </div>
  )
}
