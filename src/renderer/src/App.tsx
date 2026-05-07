import { useEffect, useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { TitleBar } from '@/components/layout/TitleBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { Toolbar } from '@/components/layout/Toolbar'
import { FileTable } from '@/components/file/FileTable'
import { PreviewPanel } from '@/components/preview/PreviewPanel'
import { TransferQueue } from '@/components/queue/TransferQueue'
import { AdbWarning } from '@/components/device/AdbWarning'
import { WirelessConnectDialog } from '@/components/device/WirelessConnectDialog'
import { useDeviceStore } from '@/stores/deviceStore'
import { useFileStore } from '@/stores/fileStore'

function App(): JSX.Element {
  const { checkAdb, adbStatus, current } = useDeviceStore()
  const { loadCurrentPath, navigateTo } = useFileStore()
  const [wifiDialogOpen, setWifiDialogOpen] = useState(false)

  useEffect(() => {
    checkAdb()
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
      <TitleBar onOpenWifiDialog={() => setWifiDialogOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onOpenWifiDialog={() => setWifiDialogOpen(true)} />
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

      {adbStatus && !adbStatus.available && <AdbWarning />}
      <WirelessConnectDialog open={wifiDialogOpen} onOpenChange={setWifiDialogOpen} />
    </div>
  )
}

export default App
