import { useEffect, useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Sidebar } from '@/components/layout/Sidebar'
import { Toolbar } from '@/components/layout/Toolbar'
import { FileTable } from '@/components/file/FileTable'
import { PreviewPanel } from '@/components/preview/PreviewPanel'
import { TransferQueue } from '@/components/queue/TransferQueue'
import { AdbWarning } from '@/components/device/AdbWarning'
import { WirelessConnectDialog } from '@/components/device/WirelessConnectDialog'
import { ScriptWorkspace } from '@/components/scripts/ScriptWorkspace'
import { useDeviceStore } from '@/stores/deviceStore'
import { useFileStore } from '@/stores/fileStore'
import { initTransferListeners } from '@/stores/queueStore'

function App(): JSX.Element {
  const { checkAdb, adbStatus, current } = useDeviceStore()
  const { loadCurrentPath, navigateTo } = useFileStore()
  const [wifiDialogOpen, setWifiDialogOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [activeView, setActiveView] = useState<'files' | 'scripts'>('files')

  useEffect(() => {
    checkAdb()
    initTransferListeners()
  }, [])

  useEffect(() => {
    if (current?.serial) {
      loadCurrentPath(current.serial)
    }
  }, [current?.serial])

  const handleOpenFolder = (path: string): void => {
    if (current?.serial) {
      navigateTo(path, current.serial)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeView={activeView} onViewChange={setActiveView} onOpenWifiDialog={() => setWifiDialogOpen(true)} />
        <div className="flex flex-1 flex-col overflow-hidden">
          {activeView === 'files' ? (
            <>
              <Toolbar previewOpen={previewOpen} onTogglePreview={() => setPreviewOpen(!previewOpen)} />
              <PanelGroup direction="horizontal" className="flex-1">
                <Panel defaultSize={previewOpen ? 65 : 100} minSize={40}>
                  <FileTable onOpenFolder={handleOpenFolder} />
                </Panel>
                {previewOpen && (
                  <>
                    <PanelResizeHandle className="w-[3px] bg-border hover:bg-primary transition-colors" />
                    <Panel defaultSize={25} minSize={20}>
                      <PreviewPanel />
                    </Panel>
                  </>
                )}
              </PanelGroup>
            </>
          ) : (
            <div className="min-h-0 flex-1"><ScriptWorkspace onExit={() => setActiveView('files')} /></div>
          )}
          <TransferQueue />
        </div>
      </div>

      {adbStatus && !adbStatus.available && <AdbWarning />}
      <WirelessConnectDialog open={wifiDialogOpen} onOpenChange={setWifiDialogOpen} />
    </div>
  )
}

export default App
