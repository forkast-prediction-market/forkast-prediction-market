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
import EventCommentReplyItem from './EventCommentReplyItem'
import EventCommentsLoadMoreReplies from './EventCommentsLoadMoreReplies'

interface CommentItemProps {
  comment: Comment
  eventId: number
  user: any
  onLikeToggle: (commentId: number, newLikesCount: number, newUserHasLiked: boolean) => void
  onDelete: (commentId: number) => void
  replyingTo: number | null
  onSetReplyingTo: (id: number | null) => void
  replyText: string
  onSetReplyText: (text: string) => void
  expandedComments: Set<number>
  onRepliesLoaded: (commentId: number, allReplies: Comment[]) => void
  onAddReply: (commentId: number, reply: Comment) => void
  onDeleteReply: (commentId: number, replyId: number) => void
  onUpdateReply: (commentId: number, replyId: number, updates: Partial<Comment>) => void
}

export default function EventCommentItem({
  comment,
  eventId,
  user,
  onLikeToggle,
  onDelete,
  replyingTo,
  onSetReplyingTo,
  replyText,
  onSetReplyText,
  expandedComments,
  onRepliesLoaded,
  onAddReply,
  onDeleteReply,
  onUpdateReply,
}: CommentItemProps) {
  const { open } = useAppKit()

  const handleReplyClick = useCallback(() => {
    if (!user) {
      queueMicrotask(() => open())
      return
    }
    const username = comment.username || truncateAddress(comment.user_address)
    onSetReplyingTo(replyingTo === comment.id ? null : comment.id)
    onSetReplyText(`@${username} `)
  }, [user, comment, replyingTo, onSetReplyingTo, onSetReplyText, open])

  const handleLikeToggle = useCallback((newLikesCount: number, newUserHasLiked: boolean) => {
    onLikeToggle(comment.id, newLikesCount, newUserHasLiked)
  }, [comment.id, onLikeToggle])

  const handleDelete = useCallback(() => {
    onDelete(comment.id)
  }, [comment.id, onDelete])

  const handleReplyAdded = useCallback((newReply: Comment) => {
    onAddReply(comment.id, newReply)
    onSetReplyingTo(null)
    onSetReplyText('')
  }, [comment.id, onAddReply, onSetReplyingTo, onSetReplyText])

  const handleReplyCancel = useCallback(() => {
    onSetReplyingTo(null)
    onSetReplyText('')
  }, [onSetReplyingTo, onSetReplyText])

  return (
    <div className="grid gap-3">
      <div className="flex gap-3">
        <Link
          href={comment.username ? `/@${comment.username}` : `/@${comment.user_address}`}
          className="text-sm font-medium transition-colors hover:text-foreground"
        >
          <Image
            src={comment.user_avatar || `https://avatar.vercel.sh/${comment.username || comment.user_address || 'anonymous'}.png`}
            alt={comment.username || comment.user_address || 'Anonymous User'}
            width={32}
            height={32}
            className="size-8 rounded-full object-cover transition-opacity hover:opacity-80"
          />
        </Link>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Link
              href={comment.username ? `/@${comment.username}` : `/@${comment.user_address}`}
              className="text-sm font-medium transition-colors hover:text-foreground"
            >
              @
              {comment.username || truncateAddress(comment.user_address)}
            </Link>
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(comment.created_at)}
            </span>
          </div>
          <p className="text-sm">{comment.content}</p>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={handleReplyClick}
            >
              Reply
            </button>
            <EventCommentLikeForm
              comment={comment}
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
                aria-label="Comment options"
              >
                <MoreHorizontalIcon className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <CommentMenu
              comment={comment}
              onDelete={handleDelete}
            />
          </DropdownMenu>
        </div>
      </div>

      {/* Reply input field */}
      {replyingTo === comment.id && (
        <div className="mt-3 ml-11">
          <EventCommentReplyForm
            user={user}
            eventId={eventId}
            parentCommentId={comment.id}
            placeholder={`Reply to ${comment.username || truncateAddress(comment.user_address)}`}
            initialValue={replyText}
            onCancel={handleReplyCancel}
            onReplyAddedAction={handleReplyAdded}
          />
        </div>
      )}

      {/* Render replies */}
      {comment.recent_replies && comment.recent_replies.length > 0 && (
        <div className="ml-11 flex flex-col gap-3">
          {comment.recent_replies.map(reply => (
            <EventCommentReplyItem
              key={reply.id}
              reply={reply}
              commentId={comment.id}
              eventId={eventId}
              user={user}
              onLikeToggle={onUpdateReply}
              onDelete={onDeleteReply}
              replyingTo={replyingTo}
              onSetReplyingTo={onSetReplyingTo}
              replyText={replyText}
              onSetReplyText={onSetReplyText}
              onAddReply={onAddReply}
            />
          ))}

          {comment.replies_count > 3 && !expandedComments.has(comment.id) && (
            <EventCommentsLoadMoreReplies
              comment={comment}
              onRepliesLoaded={onRepliesLoaded}
            />
          )}
        </div>
      )}
    </div>
  )
}
