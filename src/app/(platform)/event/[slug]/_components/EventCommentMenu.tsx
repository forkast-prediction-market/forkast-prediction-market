import type { Comment } from '@/types'
import {
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import EventCommentDeleteForm from './EventCommentDeleteForm'

interface CommentMenuProps {
  comment: Comment
  eventId: string
  onDelete: () => void
}

export default function EventCommentMenu({ comment, eventId, onDelete }: CommentMenuProps) {
  return (
    <DropdownMenuContent className="w-32" align="end">
      {comment.is_owner && (
        <DropdownMenuItem asChild>
          <EventCommentDeleteForm
            commentId={comment.id}
            eventId={eventId}
            onDeleted={onDelete}
          />
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  )
}
