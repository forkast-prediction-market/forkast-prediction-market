'use client'

import type { Comment, User } from '@/types'
import { useAppKit } from '@reown/appkit/react'
import { HeartIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EventCommentLikeFormProps {
  comment: Comment
  user: User | null
  eventId: string
  onLikeToggled: (newLikesCount: number, newUserHasLiked: boolean) => void
}

export default function EventCommentLikeForm({
  comment,
  user,
  eventId,
  onLikeToggled,
}: EventCommentLikeFormProps) {
  const { open } = useAppKit()

  const handleClick = () => {
    if (!user) {
      open()
      return
    }
    // Just trigger the mutation through the callback
    onLikeToggled(0, false) // The actual values don't matter since the mutation handles everything
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={handleClick}
      aria-pressed={comment.user_has_liked}
      title={comment.user_has_liked ? 'Remove like' : 'Like'}
      className="flex size-auto items-center gap-1 p-0 text-xs text-muted-foreground"
    >
      <HeartIcon className={cn({
        'fill-current text-destructive': comment.user_has_liked,
      }, 'size-3')}
      />
      {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
    </Button>
  )
}
