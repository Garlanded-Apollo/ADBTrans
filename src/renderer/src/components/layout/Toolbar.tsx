import { ArrowLeft, ArrowRight, Home, Search, FolderUp, FolderDown, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useFileStore } from '@/stores/fileStore'
import { useState, useEffect } from 'react'

export function Toolbar(): JSX.Element {
  const { currentPath, setCurrentPath, pushHistory, goBack, goForward, canGoBack, canGoForward, selected } = useFileStore()
  const [inputPath, setInputPath] = useState(currentPath)

  useEffect(() => { setInputPath(currentPath) }, [currentPath])

  const navigate = (path: string): void => {
    const trimmed = path.trim()
    if (!trimmed) return
    setCurrentPath(trimmed)
    pushHistory(trimmed)
  }

  return (
    <div className="flex h-11 items-center gap-1.5 border-b px-3">
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const p = goBack(); if (p) setInputPath(p) }} disabled={!canGoBack()}>
        <ArrowLeft className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const p = goForward(); if (p) setInputPath(p) }} disabled={!canGoForward()}>
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate('/sdcard')}>
        <Home className="h-3.5 w-3.5" />
      </Button>
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-7 pl-8 text-xs" value={inputPath} onChange={(e) => setInputPath(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && navigate(inputPath)} placeholder="/sdcard" />
      </div>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Button variant="ghost" size="icon" className="h-7 w-7" title="上传到手机"><FolderUp className="h-3.5 w-3.5" /></Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" title="下载到电脑"><FolderDown className="h-3.5 w-3.5" /></Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="删除" disabled={!selected}><Trash2 className="h-3.5 w-3.5" /></Button>
    </div>
  )
}
