import { useEffect, useRef, useState } from 'react'
import { AlertCircle, FileCode2, Import, Loader2, Play, Plus, Save, Square, Terminal, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useDeviceStore } from '@/stores/deviceStore'
import { cn } from '@/lib/utils'

interface OutputEntry {
  id: number
  stream: ScriptOutput['stream']
  text: string
}

function parseArguments(value: string): string[] {
  const args: string[] = []
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(value)) !== null) {
    args.push(match[1] ?? match[2] ?? match[3])
  }
  return args
}

function platformLabel(platform: AdbScript['platform']): string {
  return platform === 'mac' ? 'macOS Shell' : 'Windows Batch'
}

interface ScriptWorkspaceProps {
  onExit: () => void
}

export function ScriptWorkspace({ onExit }: ScriptWorkspaceProps): JSX.Element {
  const { current } = useDeviceStore()
  const [scripts, setScripts] = useState<AdbScript[]>([])
  const [runtimePlatform, setRuntimePlatform] = useState<AppRuntimeInfo['platform']>('unsupported')
  const [selected, setSelected] = useState<AdbScript | null>(null)
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [args, setArgs] = useState('')
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outputs, setOutputs] = useState<OutputEntry[]>([])
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [runConfirmOpen, setRunConfirmOpen] = useState(false)
  const runIdRef = useRef<string | null>(null)
  const outputIdRef = useRef(0)
  const outputEndRef = useRef<HTMLDivElement>(null)

  const refreshScripts = async (): Promise<AdbScript[]> => {
    const next = await window.api.listScripts()
    setScripts(next)
    return next
  }

  useEffect(() => {
    Promise.all([window.api.getAppInfo(), window.api.listScripts()])
      .then(([info, list]) => {
        setRuntimePlatform(info.platform)
        setScripts(list)
      })
      .catch((err) => setError((err as Error).message || '加载脚本失败'))
      .finally(() => setLoading(false))

    const removeOutputListener = window.api.onScriptOutput((payload) => {
      if (runIdRef.current && payload.runId !== runIdRef.current) return
      if (!runIdRef.current) runIdRef.current = payload.runId
      setOutputs((previous) => [...previous, { id: outputIdRef.current++, stream: payload.stream, text: payload.text }])
    })
    const removeFinishedListener = window.api.onScriptFinished((payload) => {
      if (runIdRef.current && payload.runId !== runIdRef.current) return
      runIdRef.current = null
      setRunning(false)
      const result = payload.signal ? `已停止（${payload.signal}）` : `退出码：${payload.code ?? '--'}`
      setOutputs((previous) => [...previous, { id: outputIdRef.current++, stream: payload.code === 0 ? 'system' : 'stderr', text: `\n${result}\n` }])
      refreshScripts().catch(() => {})
    })
    return () => {
      removeOutputListener()
      removeFinishedListener()
    }
  }, [])

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ block: 'end' })
  }, [outputs])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      onExit()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onExit])

  const saveCurrent = async (): Promise<AdbScript | null> => {
    if (!selected || !dirty) return selected
    setSaving(true)
    setError(null)
    try {
      const updated = await window.api.updateScript(selected.id, name, content)
      setSelected(updated)
      setScripts((previous) => previous.map((script) => script.id === updated.id ? updated : script))
      setDirty(false)
      return updated
    } catch (err) {
      setError((err as Error).message || '保存脚本失败')
      return null
    } finally {
      setSaving(false)
    }
  }

  const openScript = async (script: AdbScript): Promise<void> => {
    if (running || script.id === selected?.id) return
    if (dirty && !await saveCurrent()) return
    setError(null)
    try {
      const result = await window.api.readScript(script.id)
      setSelected(result.script)
      setName(result.script.name)
      setContent(result.content)
      setDirty(false)
      setOutputs([])
    } catch (err) {
      setError((err as Error).message || '读取脚本失败')
    }
  }

  const createScript = async (): Promise<void> => {
    if (running || (dirty && !await saveCurrent())) return
    setError(null)
    try {
      const result = await window.api.createScript()
      await refreshScripts()
      setSelected(result.script)
      setName(result.script.name)
      setContent(result.content)
      setDirty(false)
      setOutputs([])
    } catch (err) {
      setError((err as Error).message || '新建脚本失败')
    }
  }

  const importScripts = async (): Promise<void> => {
    if (running || (dirty && !await saveCurrent())) return
    setError(null)
    try {
      const imported = await window.api.importScripts()
      const list = await refreshScripts()
      if (imported.length > 0) {
        const script = list.find((item) => item.id === imported[0].id)
        if (script) await openScript(script)
      }
    } catch (err) {
      setError((err as Error).message || '导入脚本失败')
    }
  }

  const executeRun = async (): Promise<void> => {
    if (!selected || !current || running) return
    const saved = await saveCurrent()
    if (!saved) return
    setRunConfirmOpen(false)
    setError(null)
    setOutputs([])
    setRunning(true)
    runIdRef.current = null
    try {
      const runId = await window.api.runScript({
        scriptId: selected.id,
        serial: current.serial,
        model: current.model,
        args: parseArguments(args)
      })
      runIdRef.current = runId
      const lastRunAt = Date.now()
      setSelected((previous) => previous?.id === selected.id ? { ...previous, lastRunAt } : previous)
      setScripts((previous) => previous.map((script) => script.id === selected.id ? { ...script, lastRunAt } : script))
    } catch (err) {
      setRunning(false)
      setError((err as Error).message || '启动脚本失败')
    }
  }

  const requestRun = (): void => {
    if (!selected || !current || running) return
    if (selected.source === 'imported' && !selected.lastRunAt) {
      setRunConfirmOpen(true)
    } else {
      executeRun()
    }
  }

  const stopRun = async (): Promise<void> => {
    if (runIdRef.current) await window.api.stopScript(runIdRef.current)
  }

  const deleteSelected = async (): Promise<void> => {
    if (!selected) return
    setDeleteConfirmOpen(false)
    try {
      await window.api.deleteScript(selected.id)
      setSelected(null)
      setName('')
      setContent('')
      setDirty(false)
      setOutputs([])
      await refreshScripts()
    } catch (err) {
      setError((err as Error).message || '删除脚本失败')
    }
  }

  const incompatible = !!selected && selected.platform !== runtimePlatform

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <div>
            <div className="text-sm font-semibold">ADB 脚本</div>
            <div className="text-[10px] text-muted-foreground">脚本在电脑端运行，并绑定当前 Android 设备</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {current ? `目标设备：${current.model || current.serial}` : '尚未选择设备'}
        </div>
      </div>

      {error && (
        <div className="flex shrink-0 items-center gap-2 border-b bg-destructive/10 px-4 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}>关闭</button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="flex w-60 shrink-0 flex-col border-r">
          <div className="flex gap-1 border-b p-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={createScript} disabled={running || runtimePlatform === 'unsupported'}>
              <Plus className="mr-1 h-3.5 w-3.5" />新建
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={importScripts} disabled={running || runtimePlatform === 'unsupported'}>
              <Import className="mr-1 h-3.5 w-3.5" />导入
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />加载中...</div>
            ) : scripts.length === 0 ? (
              <div className="px-2 py-8 text-center text-xs text-muted-foreground">暂无脚本<br />可以新建或导入一个脚本</div>
            ) : scripts.map((script) => (
              <button
                key={script.id}
                className={cn(
                  'mb-1 flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors',
                  selected?.id === script.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                )}
                onClick={() => openScript(script)}
              >
                <FileCode2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">{script.name}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{platformLabel(script.platform)} · {script.source === 'imported' ? '已导入' : '自定义'}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {!selected ? (
          <div className="flex flex-1 items-center justify-center text-center text-muted-foreground">
            <div><Terminal className="mx-auto mb-2 h-10 w-10 opacity-20" /><p className="text-sm">选择、新建或导入脚本</p></div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center gap-2 border-b p-2">
              <input
                className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm font-medium outline-none focus:ring-1 focus:ring-primary"
                value={name}
                disabled={running}
                onChange={(event) => { setName(event.target.value); setDirty(true) }}
              />
              <span className="rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground">{platformLabel(selected.platform)}</span>
              {dirty && <span className="text-[10px] text-amber-600">未保存</span>}
              <Button variant="outline" size="sm" onClick={() => saveCurrent()} disabled={!dirty || saving || running}>
                {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}保存
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirmOpen(true)} disabled={running} title="删除脚本">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <textarea
              className="min-h-[160px] flex-1 resize-none bg-muted/20 p-3 font-mono text-xs leading-relaxed outline-none"
              value={content}
              disabled={running}
              spellCheck={false}
              onChange={(event) => { setContent(event.target.value); setDirty(true) }}
            />

            <div className="shrink-0 border-t p-2">
              <div className="flex items-center gap-2">
                <input
                  className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 font-mono text-xs outline-none focus:ring-1 focus:ring-primary"
                  placeholder="运行参数（可选，带空格的参数请使用引号）"
                  value={args}
                  disabled={running}
                  onChange={(event) => setArgs(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') requestRun() }}
                />
                {running ? (
                  <Button variant="destructive" size="sm" onClick={stopRun}><Square className="mr-1 h-3.5 w-3.5" />停止</Button>
                ) : (
                  <Button size="sm" onClick={requestRun} disabled={!current || incompatible}><Play className="mr-1 h-3.5 w-3.5" />运行</Button>
                )}
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                可使用环境变量 {selected.platform === 'mac' ? '$ADBTRANS_SERIAL、$ADBTRANS_MODEL、$ADBTRANS_ADB_PATH' : '%ADBTRANS_SERIAL%、%ADBTRANS_MODEL%、%ADBTRANS_ADB_PATH%'}
                {incompatible && <span className="ml-2 text-destructive">该脚本与当前系统不兼容</span>}
              </div>
            </div>

            <div className="h-48 shrink-0 overflow-auto border-t bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-200">
              {outputs.length === 0 ? <span className="text-zinc-500">运行输出将显示在这里</span> : outputs.map((entry) => (
                <span key={entry.id} className={cn('whitespace-pre-wrap break-all', entry.stream === 'stderr' && 'text-red-400', entry.stream === 'system' && 'text-cyan-400')}>{entry.text}</span>
              ))}
              <div ref={outputEndRef} />
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="删除脚本"
        message={`确定要删除这个脚本吗？\n\n${selected?.name || ''}`}
        confirmLabel="删除"
        destructive
        onConfirm={deleteSelected}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
      <ConfirmDialog
        open={runConfirmOpen}
        title="首次运行导入脚本"
        message={`导入脚本可以执行任意本机命令。请确认你信任该脚本的来源并已检查其内容。\n\n${selected?.name || ''}`}
        confirmLabel="确认运行"
        onConfirm={executeRun}
        onCancel={() => setRunConfirmOpen(false)}
      />
    </div>
  )
}
