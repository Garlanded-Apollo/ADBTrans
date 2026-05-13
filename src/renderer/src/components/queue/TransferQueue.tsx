import { useState } from 'react'
import { X, Trash2, ChevronUp, ChevronDown, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useQueueStore, type QueueTask } from '@/stores/queueStore'
import { cn } from '@/lib/utils'

function TaskRow({ task }: { task: QueueTask }): JSX.Element {
  const { removeTask } = useQueueStore()
  const isRunning = task.status === 'running'
  const isDone = task.status === 'done'
  const isError = task.status === 'error'

  return (
    <div className={cn('flex items-center gap-3 rounded-lg border px-3 py-2', isError && 'border-destructive/30', isDone && 'border-green-200 bg-green-50/50')}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isRunning && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
          {isDone && <CheckCircle2 className="h-3 w-3 text-green-500" />}
          {isError && <AlertCircle className="h-3 w-3 text-destructive" />}
          <span className="truncate text-xs font-medium">{task.fileName}</span>
          <span className={cn('shrink-0 rounded px-1 py-0.5 text-[10px] font-medium', task.direction === 'pull' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700')}>
            {task.direction === 'pull' ? '手机→电脑' : '电脑→手机'}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <Progress value={task.progress} className="h-1.5 flex-1" />
          <span className="shrink-0 text-[10px] text-muted-foreground">{task.progress}%</span>
        </div>
        {isRunning && (
          <div className="mt-0.5 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span>{task.speed}</span>
          </div>
        )}
        {isError && task.error && (
          <div className="mt-0.5 text-[10px] text-destructive truncate">{task.error}</div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeTask(task.id)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

export function TransferQueue(): JSX.Element {
  const { tasks, clearDone } = useQueueStore()
  const [expanded, setExpanded] = useState(true)
  const activeCount = tasks.filter((t) => t.status === 'running' || t.status === 'pending').length
  const doneCount = tasks.filter((t) => t.status === 'done').length
  const errorCount = tasks.filter((t) => t.status === 'error').length

  return (
    <div className="border-t">
      <div className="flex h-8 cursor-pointer items-center justify-between px-3 hover:bg-muted/50" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2 text-xs">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          <span className="font-medium">传输队列</span>
          {activeCount > 0 && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{activeCount} 进行中</span>}
          {doneCount > 0 && <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700">{doneCount} 已完成</span>}
          {errorCount > 0 && <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">{errorCount} 失败</span>}
        </div>
        {doneCount > 0 && (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={(e) => { e.stopPropagation(); clearDone() }}>
            <Trash2 className="mr-1 h-3 w-3" /> 清除已完成
          </Button>
        )}
      </div>
      {expanded && tasks.length > 0 && (
        <div className="max-h-[160px] overflow-y-auto">
          <div className="space-y-1.5 px-3 pb-2">
            {[...tasks].reverse().map((task) => <TaskRow key={task.id} task={task} />)}
          </div>
        </div>
      )}
      {expanded && tasks.length === 0 && <div className="px-3 pb-2 text-center text-xs text-muted-foreground">暂无传输任务</div>}
    </div>
  )
}
