'use client'

import type { Comment } from '@/types'
import { HeartIcon } from 'lucide-react'
import Form from 'next/form'
import { useActionState } from 'react'
import { cn } from '@/lib/utils'
import { likeCommentAction } from '../actions/like-comment'

interface Props {
  comment: Comment
  onLikeToggled: (newLikesCount: number, newUserHasLiked: boolean) => void
}

export default function EventCommentLikeForm({
  comment,
  onLikeToggled,
}: Props) {
  const [_, formAction, pending] = useActionState(
    async (_: any, __: FormData) => {
      const res = await likeCommentAction(comment.id)
      if (res.data) {
        onLikeToggled(res.data.likes_count, res.data.user_has_liked)
      }
      return res
    },
    { error: '' },
  ) as unknown as [any, (formData: FormData) => void, boolean]

  return (
    <Form action={formAction}>
      <button
        type="submit"
        className={cn(
          'flex items-center gap-1 text-xs transition-colors',
          comment.user_has_liked
            ? 'text-destructive'
            : 'text-muted-foreground hover:text-foreground',
        )}
        disabled={pending}
      >
        <HeartIcon className={`size-3 ${comment.user_has_liked ? 'fill-current' : ''}`} />
        {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
      </button>
    </Form>
  )
}
