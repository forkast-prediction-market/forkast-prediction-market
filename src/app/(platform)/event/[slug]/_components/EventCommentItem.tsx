import type { Comment } from '@/types'
import { useAppKit } from '@reown/appkit/react'
import { MoreHorizontalIcon } from 'lucide-react'
import { useCallback } from 'react'
import ProfileLink from '@/components/ProfileLink'
import { DropdownMenu, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { truncateAddress } from '@/lib/utils'
import EventCommentLikeForm from './EventCommentLikeForm'
import EventCommentMenu from './EventCommentMenu'
import EventCommentReplyForm from './EventCommentReplyForm'
import EventCommentReplyItem from './EventCommentReplyItem'
import EventCommentsLoadMoreReplies from './EventCommentsLoadMoreReplies'

interface CommentItemProps {
  comment: Comment
  eventId: string
  user: any
  onLikeToggle: (commentId: string, newLikesCount: number, newUserHasLiked: boolean) => void
  onDelete: (commentId: string) => void
  replyingTo: string | null
  onSetReplyingTo: (id: string | null) => void
  replyText: string
  onSetReplyText: (text: string) => void
  expandedComments: Set<string>
  onRepliesLoaded: (commentId: string, allReplies: Comment[]) => void
  onAddReply: (commentId: string, reply: Comment) => void
  onDeleteReply: (commentId: string, replyId: string) => void
  onUpdateReply: (commentId: string, replyId: string, updates: Partial<Comment>) => void
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
      <ProfileLink
        user={{
          image: comment.user_avatar,
          username: comment.username,
          address: comment.user_address,
        }}
        date={comment.created_at}
      >
        <div className="flex w-full flex-1 gap-3">
          <div className="flex-1">
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
                eventId={eventId}
                onLikeToggled={handleLikeToggle}
              />
            </div>
          </div>
          {comment.is_owner && (
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
                <EventCommentMenu
                  comment={comment}
                  eventId={eventId}
                  onDelete={handleDelete}
                />
              </DropdownMenu>
            </div>
          )}
        </div>
      </ProfileLink>

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
