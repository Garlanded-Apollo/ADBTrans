import { useEffect, useCallback } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { TitleBar } from '@/components/layout/TitleBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { Toolbar } from '@/components/layout/Toolbar'
import { FileTable } from '@/components/file/FileTable'
import { PreviewPanel } from '@/components/preview/PreviewPanel'
import { TransferQueue } from '@/components/queue/TransferQueue'
import { useDeviceStore } from '@/stores/deviceStore'
import { useFileStore } from '@/stores/fileStore'
import type { FileItem } from '@/stores/fileStore'

const MOCK_FILES: FileItem[] = [
  { name: 'DCIM', path: '/sdcard/DCIM', size: 0, modified: '2026-05-06T10:30:00', type: 'folder', permission: 'rwxr-xr-x' },
  { name: 'Download', path: '/sdcard/Download', size: 0, modified: '2026-05-07T08:15:00', type: 'folder', permission: 'rwxr-xr-x' },
  { name: 'Documents', path: '/sdcard/Documents', size: 0, modified: '2026-05-05T14:20:00', type: 'folder', permission: 'rwxr-xr-x' },
  { name: 'Pictures', path: '/sdcard/Pictures', size: 0, modified: '2026-05-06T16:45:00', type: 'folder', permission: 'rwxr-xr-x' },
  { name: 'Music', path: '/sdcard/Music', size: 0, modified: '2026-04-28T09:00:00', type: 'folder', permission: 'rwxr-xr-x' },
  { name: 'README.md', path: '/sdcard/README.md', size: 2048, modified: '2026-05-07T12:00:00', type: 'file', permission: 'rw-r--r--' },
  { name: 'photo_2026.jpg', path: '/sdcard/photo_2026.jpg', size: 3584000, modified: '2026-05-06T18:30:00', type: 'file', permission: 'rw-rw----' },
  { name: 'config.json', path: '/sdcard/config.json', size: 1024, modified: '2026-05-07T10:00:00', type: 'file', permission: 'rw-r--r--' }
]

function App(): JSX.Element {
  const { checkAdb } = useDeviceStore()
  const { setCurrentPath, pushHistory, setFiles } = useFileStore()

  useEffect(() => {
    checkAdb()
    setFiles(MOCK_FILES)
  }, [])

  const handleOpenFolder = useCallback(
    (path: string) => {
      setCurrentPath(path)
      pushHistory(path)
      setFiles(MOCK_FILES)
    },
    [setCurrentPath, pushHistory, setFiles]
  )

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Toolbar />
          <PanelGroup direction="horizontal" className="flex-1">
            <Panel defaultSize={65} minSize={40}>
              <FileTable onOpenFolder={handleOpenFolder} />
            </Panel>
            <PanelResizeHandle className="w-[3px] bg-border hover:bg-primary transition-colors" />
            <Panel defaultSize={35} minSize={20}>
              <PreviewPanel />
            </Panel>
          </PanelGroup>
          <TransferQueue />
        </div>
      </div>
    </div>
  )
}

export default App
