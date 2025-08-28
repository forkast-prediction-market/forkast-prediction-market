'use client'

import type { Comment, User } from '@/types'
import Form from 'next/form'
import Image from 'next/image'
import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { submitCommentAction } from '../actions/store-comment'

interface Props {
  user: User | null
  eventId: number
  parentCommentId: number
  placeholder: string
  initialValue?: string
  onCancel: () => void
  onReplyAddedAction: (reply: Comment) => void
}

export default function EventCommentReplyForm({
  user,
  eventId,
  parentCommentId,
  placeholder,
  initialValue,
  onCancel,
  onReplyAddedAction,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction] = useActionState(
    (_: any, formData: any) => submitCommentAction(eventId, formData),
    { error: '' },
  )

  useEffect(() => {
    if (state.comment) {
      const replyWithUserData = {
        ...state.comment,
        username: `${user?.username}`,
        user_avatar: `${user?.image}`,
        user_address: `${user?.address}`,
      }
      onReplyAddedAction(replyWithUserData as unknown as Comment)
      formRef.current?.reset()
    }
  }, [state.comment, user, onReplyAddedAction])

  return (
    <Form ref={formRef} action={formAction} className="flex gap-3">
      <input type="hidden" name="parent_comment_id" value={parentCommentId} />
      <Image
        src={user?.image || `https://avatar.vercel.sh/${user?.username || user?.address}.png`}
        alt={user?.username || user?.address || 'User'}
        width={24}
        height={24}
        className="size-6 shrink-0 rounded-full object-cover"
      />
      <div className="flex-1 space-y-2">
        <div className="relative">

          <Input
            name="content"
            className="pr-20 text-sm placeholder:text-muted-foreground/70 focus:border-blue-500 focus:ring-blue-500/20"
            placeholder={placeholder}
            defaultValue={initialValue}
            required
          />
          <div className="absolute top-1/2 right-2 flex -translate-y-1/2 gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <SubmitButton user={user} />
          </div>
        </div>
      </div>
    </Form>
  )
}

function SubmitButton({ user }: { user: User | null }) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      size="sm"
      className="h-6 px-2 text-xs"
      disabled={pending}
    >
      {pending ? 'Posting...' : user ? 'Reply' : 'Connect to Reply'}
    </Button>
  )
}
