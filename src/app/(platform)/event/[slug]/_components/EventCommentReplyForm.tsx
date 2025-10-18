'use client'

import type { User } from '@/types'
import Image from 'next/image'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface EventCommentReplyFormProps {
  user: User | null
  eventId: string
  parentCommentId: string
  placeholder: string
  initialValue?: string
  onCancel: () => void
  onReplyAddedAction?: () => void
  createReply: (eventId: string, parentCommentId: string, content: string, user?: any) => void
  isCreatingComment: boolean
}

export default function EventCommentReplyForm({
  user,
  eventId,
  parentCommentId,
  placeholder,
  initialValue,
  onCancel,
  onReplyAddedAction,
  createReply,
  isCreatingComment,
}: EventCommentReplyFormProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [content, setContent] = useState(initialValue || '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || !user) {
      return
    }

    createReply(eventId, parentCommentId, content.trim(), user)
    setContent('')
    onReplyAddedAction?.()
  }

  if (!user) {
    return <></>
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <Image
        src={user.image}
        alt={user.username || user.address || 'User'}
        width={24}
        height={24}
        className="size-6 shrink-0 rounded-full object-cover"
      />
      <div className="flex-1 space-y-2">
        <div className="relative">
          <Input
            ref={inputRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            className="pr-20 text-sm placeholder:text-muted-foreground/70 focus:border-blue-500 focus:ring-blue-500/20"
            placeholder={placeholder}
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
            <Button
              type="submit"
              size="sm"
              className="h-6 px-2 text-xs"
              disabled={isCreatingComment || !content.trim()}
            >
              {isCreatingComment ? 'Posting...' : user ? 'Reply' : 'Connect to Reply'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
