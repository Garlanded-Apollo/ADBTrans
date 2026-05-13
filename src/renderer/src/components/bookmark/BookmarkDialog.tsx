import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useBookmarkStore, type Bookmark } from '@/stores/bookmarkStore'

interface BookmarkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BookmarkDialog({ open, onOpenChange }: BookmarkDialogProps): JSX.Element {
  const { bookmarks, addBookmark, removeBookmark, updateBookmark } = useBookmarkStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [path, setPath] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    if (!open) {
      setEditingId(null)
      setLabel('')
      setPath('')
      setIsAdding(false)
    }
  }, [open])

  const handleAdd = (): void => {
    if (label.trim() && path.trim()) {
      addBookmark(label.trim(), path.trim())
      setLabel('')
      setPath('')
      setIsAdding(false)
    }
  }

  const handleUpdate = (): void => {
    if (editingId && label.trim() && path.trim()) {
      updateBookmark(editingId, label.trim(), path.trim())
      setEditingId(null)
      setLabel('')
      setPath('')
    }
  }

  const handleEdit = (bookmark: Bookmark): void => {
    setEditingId(bookmark.id)
    setLabel(bookmark.label)
    setPath(bookmark.path)
    setIsAdding(false)
  }

  const handleCancel = (): void => {
    setEditingId(null)
    setLabel('')
    setPath('')
    setIsAdding(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>管理快捷路径</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto">
          {bookmarks.map((bookmark) => (
            <div key={bookmark.id} className="flex items-center gap-2 rounded-lg border p-3">
              {editingId === bookmark.id ? (
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="显示名称"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Input
                    placeholder="路径"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={handleUpdate}>保存</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCancel}>取消</Button>
                  </div>
                </div>
              ) : (
                <>
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{bookmark.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{bookmark.path}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => handleEdit(bookmark)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-destructive"
                    onClick={() => removeBookmark(bookmark.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
        {isAdding ? (
          <div className="mt-3 space-y-2 rounded-lg border p-3">
            <Input
              placeholder="显示名称"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-8 text-xs"
            />
            <Input
              placeholder="路径"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="h-8 text-xs"
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={handleAdd}>添加</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCancel}>取消</Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="mt-3 w-full"
            onClick={() => {
              setIsAdding(true)
              setEditingId(null)
              setLabel('')
              setPath('')
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            添加快捷路径
          </Button>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
