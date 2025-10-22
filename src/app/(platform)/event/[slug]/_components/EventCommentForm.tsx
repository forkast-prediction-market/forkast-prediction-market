'use client'

import type { Comment, User } from '@/types'
import { useAppKit } from '@reown/appkit/react'
import { ShieldIcon } from 'lucide-react'
import Form from 'next/form'
import { useActionState, useEffect, useRef } from 'react'
import { storeCommentAction } from '@/app/(platform)/event/[slug]/_actions/store-comment'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputError } from '@/components/ui/input-error'

interface EventCommentFormProps {
  eventId: string
  user: User | null
  onCommentAddedAction: (comment: Comment) => void
}

export default function EventCommentForm({ eventId, user, onCommentAddedAction }: EventCommentFormProps) {
  const { open } = useAppKit()
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, isPending] = useActionState(
    (_: any, formData: any) => storeCommentAction(eventId, formData),
    { error: '' },
  )

  useEffect(() => {
    if (state.comment) {
      const commentWithUserData: Comment = {
        ...state.comment,
        username: `${user?.username}`,
        user_avatar: `${user?.image}`,
        user_address: `${user?.address}`,
        likes_count: state.comment.likes_count ?? 0,
        replies_count: state.comment.replies_count ?? 0,
        created_at: state.comment.created_at instanceof Date
          ? state.comment.created_at.toISOString()
          : state.comment.created_at,
      }

      onCommentAddedAction(commentWithUserData)
      formRef.current?.reset()
    }
  }, [state.comment, user, onCommentAddedAction])

  return (
    <div className="mt-4 grid gap-2">
      <Form
        ref={formRef}
        action={formAction}
        className="relative"
        onSubmit={(e) => {
          if (!user) {
            e.preventDefault()
            queueMicrotask(() => open())
          }
        }}
      >
        <Input
          name="content"
          className="h-11 pr-16"
          placeholder="Add a comment"
          required
        />

        <Button
          type="submit"
          size="sm"
          className="absolute top-1/2 right-2 -translate-y-1/2 text-xs font-medium"
          disabled={isPending}
        >
          {isPending ? 'Posting...' : user ? 'Post' : 'Connect to Post'}
        </Button>
      </Form>

      {state.error && <InputError message={state.error} />}

      <div className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs text-muted-foreground">
        <ShieldIcon className="size-3" />
        Beware of external links, they may be phishing attacks.
      </div>
    </div>
  )
}
