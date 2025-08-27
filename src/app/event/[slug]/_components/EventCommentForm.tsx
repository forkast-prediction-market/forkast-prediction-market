'use client'

import type { Comment, User } from '@/types'
import { ShieldIcon } from 'lucide-react'
import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputError } from '@/components/ui/input-error'
import { submitCommentAction } from '../actions/store-comment'

export default function EventCommentForm({ user, eventId, onCommentAddedAction }: {
  user: User | null
  eventId: number
  onCommentAddedAction: (comment: Comment) => void
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction] = useActionState(
    (_: any, formData: any) => submitCommentAction(eventId, formData),
    { error: '' },
  )

  useEffect(() => {
    if (state.comment) {
      const commentWithUserData = {
        ...state.comment,
        username: `${user?.username}`,
        user_avatar: `${user?.image}`,
        user_address: `${user?.address}`,
      }

      onCommentAddedAction(commentWithUserData)
      formRef.current?.reset()
    }
  }, [state.comment, user, onCommentAddedAction])

  return (
    <div className="mt-4 space-y-2">
      <form ref={formRef} action={formAction} className="relative">
        <Input
          name="content"
          className="h-11 pr-16"
          placeholder="Add a comment"
          required
        />
        <SubmitButton user={user} />
      </form>

      {state.error && <InputError message={state.error} />}

      <div className={`
        flex items-center gap-1 rounded-lg border border-border/50 px-3 py-1.5 text-[11px] text-muted-foreground
        dark:border-border/20
      `}
      >
        <ShieldIcon className="size-3" />
        Beware of external links, they may be phishing attacks.
      </div>
    </div>
  )
}

function SubmitButton({ user }: { user: User | null }) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      size="sm"
      className="absolute top-1/2 right-2 -translate-y-1/2 text-xs font-medium"
      disabled={pending}
    >
      {pending ? 'Posting...' : user ? 'Post' : 'Connect to Post'}
    </Button>
  )
}
