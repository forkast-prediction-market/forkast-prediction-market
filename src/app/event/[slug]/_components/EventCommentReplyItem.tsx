import type { Comment } from '@/types'
import { useAppKit } from '@reown/appkit/react'
import { MoreHorizontalIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback } from 'react'
import { DropdownMenu, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatTimeAgo, truncateAddress } from '@/lib/utils'
import CommentMenu from './CommentMenu'
import EventCommentLikeForm from './EventCommentLikeForm'
import EventCommentReplyForm from './EventCommentReplyForm'

interface ReplyItemProps {
  reply: Comment
  commentId: string
  eventId: string
  user: any
  onLikeToggle: (commentId: string, replyId: string, updates: Partial<Comment>) => void
  onDelete: (commentId: string, replyId: string) => void
  replyingTo: string | null
  onSetReplyingTo: (id: string | null) => void
  replyText: string
  onSetReplyText: (text: string) => void
  onAddReply: (commentId: string, reply: Comment) => void
  onReplyAddedAction?: (reply: Comment) => void
  onCancelReply?: () => void
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
  onAddReply,
}: ReplyItemProps) {
  const { open } = useAppKit()

  const handleReplyClick = useCallback(() => {
    if (!user) {
      queueMicrotask(() => open())
      return
    }
    const username = reply.username || truncateAddress(reply.user_address)
    onSetReplyingTo(replyingTo === reply.id ? null : reply.id)
    onSetReplyText(`@${username} `)
  }, [user, reply, replyingTo, onSetReplyingTo, onSetReplyText, open])

  const handleLikeToggle = useCallback((newLikesCount: number, newUserHasLiked: boolean) => {
    onLikeToggle(commentId, reply.id, { likes_count: newLikesCount, user_has_liked: newUserHasLiked })
  }, [commentId, reply.id, onLikeToggle])

  const handleDelete = useCallback(() => {
    onDelete(commentId, reply.id)
  }, [commentId, reply.id, onDelete])

  const handleReplyAdded = useCallback((newReply: Comment) => {
    onAddReply(commentId, newReply)
    onSetReplyingTo(null)
    onSetReplyText('')
  }, [commentId, onAddReply, onSetReplyingTo, onSetReplyText])

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
            src={reply.user_avatar || `https://avatar.vercel.sh/${reply.username || reply.user_address || 'anonymous'}.png`}
            alt={reply.username || reply.user_address || 'Anonymous User'}
            width={24}
            height={24}
            className="size-6 rounded-full object-cover transition-opacity hover:opacity-80"
          />
        </Link>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Link
              href={reply.username ? `/@${reply.username}` : `/@${reply.user_address}`}
              className="text-sm font-medium transition-colors hover:text-foreground"
            >
              @
              {reply.username || truncateAddress(reply.user_address)}
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
            <CommentMenu
              comment={reply}
              onDelete={handleDelete}
            />
          </DropdownMenu>
        </div>
      </div>

      {/* Reply input field for second level replies */}
      {replyingTo === reply.id && (
        <div className="mt-3">
          <EventCommentReplyForm
            user={user}
            eventId={eventId}
            parentCommentId={commentId}
            placeholder={`Reply to ${reply.username || truncateAddress(reply.user_address)}`}
            initialValue={replyText}
            onCancel={handleReplyCancel}
            onReplyAddedAction={handleReplyAdded}
          />
        </div>
      )}
    </div>
  )
}
