import type { Comment } from '@/types'
import { useAppKit } from '@reown/appkit/react'
import { MoreHorizontalIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback } from 'react'
import { DropdownMenu, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatTimeAgo, truncateAddress } from '@/lib/utils'
import EventCommentLikeForm from './EventCommentLikeForm'
import EventCommentMenu from './EventCommentMenu'
import EventCommentReplyForm from './EventCommentReplyForm'

interface ReplyItemProps {
  reply: Comment
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
    const username = reply.username || (reply.user_address ? truncateAddress(reply.user_address) : 'Unknown')
    onSetReplyingTo(replyingTo === reply.id ? null : reply.id)
    onSetReplyText(`@${username} `)
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
      <div className="flex gap-3">
        <Link
          href={reply.username ? `/@${reply.username}` : `/@${reply.user_address}`}
          className="text-sm font-medium transition-colors hover:text-foreground"
        >
          <Image
            src={reply.user_avatar}
            alt={reply.username || reply.user_address || 'Anonymous User'}
            width={24}
            height={24}
            className="size-6 rounded-full object-cover transition-opacity hover:opacity-80"
          />
        </Link>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Link
              href={reply.username ? `/@${reply.username}` : `/@${reply.user_address || 'unknown'}`}
              className="text-sm font-medium transition-colors hover:text-foreground"
            >
              @
              {reply.username || (reply.user_address ? truncateAddress(reply.user_address) : 'Unknown')}
            </Link>
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(reply.created_at)}
            </span>
          </div>
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

      {/* Reply input field for second level replies */}
      {replyingTo === reply.id && (
        <div className="mt-3">
          <EventCommentReplyForm
            user={user}
            eventId={eventId}
            parentCommentId={commentId}
            placeholder={`Reply to ${reply.username || (reply.user_address ? truncateAddress(reply.user_address) : 'Unknown')}`}
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
