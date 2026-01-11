import type { Comment } from '@/types'
import { MoreHorizontalIcon } from 'lucide-react'
import Link from 'next/link'
import { useCallback } from 'react'
import ProfileLink from '@/components/ProfileLink'
import { DropdownMenu, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAppKit } from '@/hooks/useAppKit'
import EventCommentLikeForm from './EventCommentLikeForm'
import EventCommentMenu from './EventCommentMenu'
import EventCommentReplyForm from './EventCommentReplyForm'

interface ReplyItemProps {
  reply: Comment
  parentUsername: string
  commentId: string
  eventId: string
  user: any
  onLikeToggle: (commentId: string, replyId: string) => void
  onDelete: (commentId: string, replyId: string) => void
  replyingTo: string | null
  onSetReplyingTo: (id: string | null) => void
  replyText: string
  onSetReplyText: (text: string) => void
  createReply: (eventId: string, parentCommentId: string, content: string, user?: any) => void
  isCreatingComment: boolean
}

export default function EventCommentReplyItem({
  reply,
  parentUsername,
  commentId,
  eventId,
  user,
  onLikeToggle,
  onDelete,
  replyingTo,
  onSetReplyingTo,
  replyText,
  onSetReplyText,
  createReply,
  isCreatingComment,
}: ReplyItemProps) {
  const { open } = useAppKit()

  const handleReplyClick = useCallback(() => {
    if (!user) {
      queueMicrotask(() => open())
      return
    }
    const shouldOpen = replyingTo !== reply.id
    onSetReplyingTo(shouldOpen ? reply.id : null)
    if (shouldOpen) {
      onSetReplyText('')
    }
  }, [user, reply, replyingTo, onSetReplyingTo, onSetReplyText, open])

  const handleLikeToggle = useCallback(() => {
    onLikeToggle(commentId, reply.id)
  }, [commentId, reply.id, onLikeToggle])

  const handleDelete = useCallback(() => {
    onDelete(commentId, reply.id)
  }, [commentId, reply.id, onDelete])

  const handleReplyAdded = useCallback(() => {
    onSetReplyingTo(null)
    onSetReplyText('')
  }, [onSetReplyingTo, onSetReplyText])

  const handleReplyCancel = useCallback(() => {
    onSetReplyingTo(null)
    onSetReplyText('')
  }, [onSetReplyingTo, onSetReplyText])

  return (
    <div className="grid gap-3">
      <ProfileLink
        user={{
          image: reply.user_avatar,
          username: reply.username,
          address: reply.user_address,
          proxy_wallet_address: reply.user_proxy_wallet_address ?? null,
        }}
        date={reply.created_at}
        joinedAt={reply.user_created_at}
        tooltipVariant="activity"
      >
        <div className="flex w-full flex-1 gap-3">
          <div className="flex-1">
            <Link
              href={`/@${parentUsername}`}
              className="text-xs text-primary transition-colors hover:text-primary/80"
            >
              @
              {parentUsername}
            </Link>
            <p className="text-sm">{reply.content}</p>
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                onClick={handleReplyClick}
              >
                Reply
              </button>
              <EventCommentLikeForm
                comment={reply}
                user={user}
                onLikeToggled={handleLikeToggle}
              />
            </div>
          </div>
          {reply.is_owner && (
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Reply options"
                  >
                    <MoreHorizontalIcon className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <EventCommentMenu
                  comment={reply}
                  eventId={eventId}
                  onDelete={handleDelete}
                />
              </DropdownMenu>
            </div>
          )}
        </div>
      </ProfileLink>

      {replyingTo === reply.id && (
        <div className="mt-3">
          <EventCommentReplyForm
            user={user}
            eventId={eventId}
            parentCommentId={commentId}
            placeholder={`Reply to ${reply.username}`}
            initialValue={replyText}
            onCancel={handleReplyCancel}
            onReplyAddedAction={handleReplyAdded}
            createReply={createReply}
            isCreatingComment={isCreatingComment}
          />
        </div>
      )}
    </div>
  )
}
