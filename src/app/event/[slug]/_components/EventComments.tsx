import type { Comment, Event, User } from '@/types'
import { useCallback, useState } from 'react'
import { useComments } from '@/hooks/useComments'
import EventCommentForm from './EventCommentForm'
import EventCommentItem from './EventCommentItem'

interface EventCommentsProps {
  event: Event
  user: User | null
}

export default function EventComments({ event, user }: EventCommentsProps) {
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')
  const [expandedComments, setExpandedComments] = useState<Set<number>>(() => new Set())

  const {
    comments,
    loading,
    error,
    addComment,
    updateComment,
    removeComment,
    updateReply,
    removeReply,
  } = useComments(event.slug)

  const handleRepliesLoaded = useCallback((commentId: number, allReplies: Comment[]) => {
    updateComment(commentId, { recent_replies: allReplies })
    setExpandedComments(prev => new Set([...prev, commentId]))
  }, [updateComment])

  const handleLikeToggled = useCallback((commentId: number, newLikesCount: number, newUserHasLiked: boolean) => {
    updateComment(commentId, { likes_count: newLikesCount, user_has_liked: newUserHasLiked })
  }, [updateComment])

  const handleAddReply = useCallback((commentId: number, newReply: Comment) => {
    const comment = comments.find(c => c.id === commentId)
    if (comment) {
      updateComment(commentId, {
        replies_count: comment.replies_count + 1,
        recent_replies: [
          ...(comment.recent_replies || []),
          newReply,
        ].slice(-3),
      })
    }
  }, [comments, updateComment])

  const handleDeleteReply = useCallback((commentId: number, replyId: number) => {
    removeReply(commentId, replyId)
  }, [removeReply])

  const handleUpdateReply = useCallback((commentId: number, replyId: number, updates: Partial<Comment>) => {
    updateReply(commentId, replyId, updates)
  }, [updateReply])

  const handleDeleteComment = useCallback((commentId: number) => {
    removeComment(commentId)
  }, [removeComment])

  if (error) {
    return (
      <div className="mt-6 text-center text-sm text-destructive">
        Error loading comments:
        {' '}
        {error}
      </div>
    )
  }

  return (
    <>
      <EventCommentForm
        eventId={event.id}
        user={user}
        onCommentAddedAction={addComment}
      />

      {/* List of Comments */}
      <div className="mt-6 grid gap-6">
        {loading
          ? (
              <div className="text-center text-sm text-muted-foreground">
                Loading comments...
              </div>
            )
          : comments.length === 0
            ? (
                <div className="text-center text-sm text-muted-foreground">
                  No comments yet. Be the first to comment!
                </div>
              )
            : (
                comments.map(comment => (
                  <EventCommentItem
                    key={comment.id}
                    comment={comment}
                    eventId={event.id}
                    user={user}
                    onLikeToggle={handleLikeToggled}
                    onDelete={handleDeleteComment}
                    replyingTo={replyingTo}
                    onSetReplyingTo={setReplyingTo}
                    replyText={replyText}
                    onSetReplyText={setReplyText}
                    expandedComments={expandedComments}
                    onRepliesLoaded={handleRepliesLoaded}
                    onAddReply={handleAddReply}
                    onDeleteReply={handleDeleteReply}
                    onUpdateReply={handleUpdateReply}
                  />
                ))
              )}
      </div>
    </>
  )
}
