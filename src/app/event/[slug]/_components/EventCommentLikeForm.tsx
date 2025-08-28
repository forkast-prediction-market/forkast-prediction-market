'use client'

import type { Comment, User } from '@/types'
import { useAppKit } from '@reown/appkit/react'
import { HeartIcon } from 'lucide-react'
import Form from 'next/form'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { likeCommentAction } from '../actions/like-comment'

interface EventCommentLikeFormProps {
  comment: Comment
  user: User | null
  onLikeToggled: (newLikesCount: number, newUserHasLiked: boolean) => void
}

export default function EventCommentLikeForm({
  comment,
  user,
  onLikeToggled,
}: EventCommentLikeFormProps) {
  const { open } = useAppKit()
  const [_, formAction, isPending] = useActionState(
    async (_: any, __: FormData) => {
      const res = await likeCommentAction(comment.id)
      if (res.data) {
        onLikeToggled(res.data.likes_count, res.data.user_has_liked)
      }
      return res
    },
    { data: null, error: '' },
  ) as unknown as [any, (formData: FormData) => void, boolean]

  return (
    <Form
      action={formAction}
      onSubmit={(e) => {
        if (!user) {
          e.preventDefault()
          queueMicrotask(() => open())
        }
      }}
    >
      <Button
        type="submit"
        size="icon"
        variant="ghost"
        disabled={isPending}
        aria-pressed={comment.user_has_liked}
        title={comment.user_has_liked ? 'Remove like' : 'Like'}
        className={cn({
          'opacity-50': isPending,
          'flex size-auto items-center gap-1 p-0 text-xs text-muted-foreground': true,
        })}
      >
        <HeartIcon className={cn({
          'size-3': true,
          'fill-current text-destructive': comment.user_has_liked,
        })}
        />
        {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
      </Button>
    </Form>
  )
}
