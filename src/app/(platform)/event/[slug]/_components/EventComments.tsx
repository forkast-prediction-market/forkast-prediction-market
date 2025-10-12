'use client'

import type { Event, User } from '@/types'
import { useCallback, useEffect, useState } from 'react'
import { useInfiniteComments } from '@/hooks/useInfiniteComments'
import EventCommentForm from './EventCommentForm'
import EventCommentItem from './EventCommentItem'

interface EventCommentsProps {
  event: Event
  user: User | null
}

export default function EventComments({ event, user }: EventCommentsProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [expandedComments, setExpandedComments] = useState<Set<string>>(() => new Set())
  const [isInitialized, setIsInitialized] = useState(false)

  const {
    comments,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    infiniteScrollError,
    hasInfiniteScrollError,
    refetch,
    toggleCommentLike,
    deleteComment,
    toggleReplyLike,
    deleteReply,
    loadMoreReplies,
    status,
  } = useInfiniteComments(event.slug)

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      if (scrollTop + windowHeight >= documentHeight - 1000) {
        if (hasNextPage && !isFetchingNextPage && isInitialized) {
          fetchNextPage()
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isInitialized])

  useEffect(() => {
    if (status === 'success' && !isInitialized) {
      queueMicrotask(() => setIsInitialized(true))
    }
  }, [status, isInitialized])

  const handleRepliesLoaded = useCallback((commentId: string) => {
    loadMoreReplies(commentId)
    setExpandedComments(prev => new Set([...prev, commentId]))
  }, [loadMoreReplies])

  const handleLikeToggled = useCallback((commentId: string) => {
    toggleCommentLike(event.id, commentId)
  }, [toggleCommentLike, event.id])

  const handleDeleteReply = useCallback((commentId: string, replyId: string) => {
    deleteReply(commentId, replyId, event.id)
  }, [deleteReply, event.id])

  const handleUpdateReply = useCallback((commentId: string, replyId: string) => {
    toggleReplyLike(event.id, replyId)
  }, [toggleReplyLike, event.id])

  const handleDeleteComment = useCallback((commentId: string) => {
    deleteComment(commentId, event.id)
  }, [deleteComment, event.id])

  if (error) {
    return (
      <div className="mt-6 text-center text-sm text-destructive">
        <div className="mb-2">
          Error loading comments:
          {' '}
          {error.message || String(error)}
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-xs underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <>
      <EventCommentForm
        eventId={event.id}
        user={user}
        onCommentAddedAction={() => refetch()}
      />

      <div className="mt-6">
        {status === 'pending'
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
                <div className="grid gap-6">
                  {comments.map(comment => (
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
                      onDeleteReply={handleDeleteReply}
                      onUpdateReply={handleUpdateReply}
                    />
                  ))}
                </div>
              )}

        {isFetchingNextPage && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Loading more comments...
          </div>
        )}

        {hasInfiniteScrollError && infiniteScrollError && (
          <div className="mt-4 text-center text-sm text-destructive">
            <div className="mb-2">
              Error loading more comments:
              {' '}
              {infiniteScrollError.message || String(infiniteScrollError)}
            </div>
            <button
              type="button"
              onClick={() => fetchNextPage()}
              className="text-xs underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </>
  )
}
