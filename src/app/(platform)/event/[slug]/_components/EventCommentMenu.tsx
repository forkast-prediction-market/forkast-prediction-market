import type { Comment } from '@/types'
import {
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import EventCommentDeleteForm from './EventCommentDeleteForm'

interface CommentMenuProps {
  comment: Comment
  onDelete: () => void
  isDeleting?: boolean
}

export default function EventCommentMenu({ comment, onDelete, isDeleting }: CommentMenuProps) {
  return (
    <DropdownMenuContent className="w-32" align="end">
      {comment.is_owner && (
        <DropdownMenuItem asChild>
          <EventCommentDeleteForm
            onDelete={onDelete}
            isDeleting={isDeleting}
          />
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  )
}
