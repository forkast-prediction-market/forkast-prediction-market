import type { Comment } from '@/types'
import {
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import EventCommentDeleteForm from './EventCommentDeleteForm'

interface CommentMenuProps {
  comment: Comment
  onDelete: () => void
}

export default function EventCommentMenu({ comment, onDelete }: CommentMenuProps) {
  return (
    <DropdownMenuContent className="w-32" align="end">
      {comment.is_owner && (
        <DropdownMenuItem asChild>
          <EventCommentDeleteForm
            commentId={comment.id}
            onDeleted={onDelete}
          />
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  )
}
