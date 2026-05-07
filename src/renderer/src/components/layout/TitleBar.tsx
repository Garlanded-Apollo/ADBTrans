import { Monitor, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function TitleBar(): JSX.Element {
  return (
    <div className="flex h-10 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <Monitor className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">ADBTrans</span>
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">v1.0</span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
