'use client'

import { HeartIcon } from 'lucide-react'
import Form from 'next/form'
import { useActionState } from 'react'
import { likeCommentAction } from '../actions/like-comment'

interface Props {
  commentId: number
  initialLikesCount: number
  initialUserHasLiked: boolean
  onLikeToggled: (action: 'liked' | 'unliked', newLikesCount: number, newUserHasLiked: boolean) => void
}

export default function EventCommentLikeForm({
  commentId,
  initialLikesCount,
  initialUserHasLiked,
  onLikeToggled,
}: Props) {
  const [state, formAction, pending] = useActionState(
    async (_: any, __: FormData) => {
      const res = await likeCommentAction(commentId)
      if (res?.success) {
        onLikeToggled(res.action, res.likes_count, res.user_has_liked)
      }
      return res
    },
    { error: '' },
  ) as unknown as [any, (formData: FormData) => void, boolean]

  return (
    <Form action={formAction}>
      <button
        type="submit"
        className={`
          flex items-center gap-1 text-xs transition-colors
          ${initialUserHasLiked
      ? 'text-destructive'
      : 'text-muted-foreground hover:text-foreground'
    }
        `}
        disabled={pending}
      >
        <HeartIcon className={`size-3 ${initialUserHasLiked ? 'fill-current' : ''}`} />
        {initialLikesCount > 0 && <span>{initialLikesCount}</span>}
      </button>
    </Form>
  )
}
