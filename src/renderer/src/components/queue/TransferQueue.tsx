import { useState, useEffect } from 'react'
import { X, Trash2, ChevronUp, ChevronDown, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useQueueStore, type QueueTask, type OperationKind } from '@/stores/queueStore'
import { cn } from '@/lib/utils'

const OPERATION_INFO: Record<OperationKind, { action: string; badge: string; badgeClass: string }> = {
  delete: { action: '正在删除', badge: '删除', badgeClass: 'bg-red-100 text-red-700' },
  copy: { action: '正在复制到目标目录', badge: '复制', badgeClass: 'bg-blue-100 text-blue-700' },
  move: { action: '正在移动到目标目录', badge: '移动', badgeClass: 'bg-orange-100 text-orange-700' }
}

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
          <div className="mt-0.5 text-[10px] text-destructive truncate" title={task.error}>{task.error}</div>
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

function OperationRow(): JSX.Element {
  const operationState = useQueueStore((state) => state.operationState)
  if (!operationState) return <></>
  const percent = Math.min(100, Math.round((operationState.done / Math.max(1, operationState.total)) * 100))
  const info = OPERATION_INFO[operationState.operation]

  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/30 px-3 py-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary" />
          <span className="truncate text-xs font-medium">{info.action} {operationState.fileName}</span>
          <span className={cn('shrink-0 rounded px-1 py-0.5 text-[10px] font-medium', info.badgeClass)}>{info.badge}</span>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <Progress value={percent} className="h-1.5 flex-1" />
          <span className="shrink-0 text-[10px] text-muted-foreground">{operationState.done}/{operationState.total}</span>
        </div>
      </div>
    </div>
  )
}

export function TransferQueue(): JSX.Element {
  const { tasks, clearDone, operationState } = useQueueStore()
  const [expanded, setExpanded] = useState(true)
  const activeCount = tasks.filter((t) => t.status === 'running' || t.status === 'pending').length
  const doneCount = tasks.filter((t) => t.status === 'done').length
  const errorCount = tasks.filter((t) => t.status === 'error').length

  useEffect(() => {
    if (operationState) setExpanded(true)
  }, [operationState])

  return (
    <div className="border-t">
      <div className="flex h-8 cursor-pointer items-center justify-between px-3 hover:bg-muted/50" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2 text-xs">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          <span className="font-medium">传输队列</span>
          {operationState && (
            <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">
              {OPERATION_INFO[operationState.operation].badge}中
            </span>
          )}
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
      {expanded && (operationState || tasks.length > 0) && (
        <div className={cn('space-y-1.5 px-3 pb-2', tasks.length > 0 && 'max-h-[160px] overflow-y-auto')}>
          {operationState && <OperationRow />}
          {[...tasks].reverse().map((task) => <TaskRow key={task.id} task={task} />)}
        </div>
      )}
      {expanded && tasks.length === 0 && !operationState && <div className="px-3 pb-2 text-center text-xs text-muted-foreground">暂无传输任务</div>}
    </div>
  )
}
