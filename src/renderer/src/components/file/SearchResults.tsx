import { AlertCircle, Folder, File, Loader2, ChevronRight } from 'lucide-react'

interface SearchResult {
  name: string
  path: string
  type: 'file' | 'folder'
}

interface SearchResultsProps {
  results: SearchResult[]
  loading: boolean
  searched: boolean
  error: string | null
  keyword: string
  onNavigate: (path: string, fileName?: string) => void
  onContextMenu: (e: React.MouseEvent, item: SearchResult) => void
}

export function SearchResults({ results, loading, searched, error, keyword, onNavigate, onContextMenu }: SearchResultsProps): JSX.Element {
  return (
    <div className="flex-1 overflow-y-auto">
      {loading && results.length === 0 && (
        <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          搜索中...
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-xs text-destructive">
          <AlertCircle className="h-5 w-5 opacity-70" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && searched && results.length === 0 && (
        <div className="py-8 text-center text-xs text-muted-foreground">
          未找到匹配「{keyword}」的文件
        </div>
      )}

      {!loading && searched && results.length > 0 && (
        <div className="px-3 py-1 text-[10px] text-muted-foreground border-b">
          共 {results.length} 个结果
        </div>
      )}

      {results.map((item, idx) => (
        <div
          key={`${item.path}-${idx}`}
          className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-muted/50 text-xs group"
          onClick={() => onNavigate(item.type === 'folder' ? item.path : item.path.substring(0, item.path.lastIndexOf('/')) || '/', item.type === 'file' ? item.name : undefined)}
          onContextMenu={(e) => onContextMenu(e, item)}
        >
          {item.type === 'folder' ? (
            <Folder className="h-3.5 w-3.5 shrink-0 text-blue-500" />
          ) : (
            <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <div className="flex-1 min-w-0">
            <div className="truncate font-medium">{item.name}</div>
            <div className="truncate text-[10px] text-muted-foreground">{item.path}</div>
          </div>
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
        </div>
      ))}
    </div>
  )
}
