import type { Comment } from '@/types'
import EventCommentDeleteForm from './EventCommentDeleteForm'

interface CommentMenuProps {
  comment: Comment
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  onDelete: () => void
}

export default function CommentMenu({ comment, isOpen, onToggle, onClose, onDelete }: CommentMenuProps) {
  if (!isOpen) {
    return null
  }

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute top-8 right-0 z-20 min-w-32 rounded-md border bg-background p-1 shadow-md">
        <button
          type="button"
          className={`
            flex w-full items-center rounded-sm px-2 py-1.5 text-xs text-muted-foreground transition-colors
            hover:bg-muted
          `}
          onClick={onClose}
        >
          Report
        </button>
        {comment.is_owner && (
          <div className="p-0">
            <EventCommentDeleteForm
              commentId={comment.id}
              onDeleted={onDelete}
            />
          </div>
        )}
      </div>
    </>
  )
}
