'use client'

import type { Comment, Event, User } from '@/types'
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
    status,
  } = useInfiniteComments(event.slug)

  // Scroll detection for infinite loading
  useEffect(() => {
    function handleScroll() {
      // Check if we're near the bottom of the page
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      // Trigger when we're within 1000px of the bottom
      if (scrollTop + windowHeight >= documentHeight - 1000) {
        if (hasNextPage && !isFetchingNextPage && isInitialized) {
          fetchNextPage()
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isInitialized])

  // Handle initialization state to prevent premature loading
  useEffect(() => {
    // Mark as initialized once we have successfully loaded the first page
    if (status === 'success' && !isInitialized) {
      queueMicrotask(() => setIsInitialized(true))
    }
  }, [status, isInitialized])

  const handleRepliesLoaded = useCallback((commentId: string) => {
    setExpandedComments(prev => new Set([...prev, commentId]))
  }, [])

  const handleLikeToggled = useCallback((commentId: string, newLikesCount: number, newUserHasLiked: boolean) => {
    // Use the new mutation-based like toggle instead of manual state updates
    toggleCommentLike(event.id, commentId)
  }, [toggleCommentLike, event.id])

  const handleDeleteReply = useCallback((commentId: string, replyId: string) => {
    deleteReply(commentId, replyId, event.id)
  }, [deleteReply, event.id])

  const handleUpdateReply = useCallback((commentId: string, replyId: string, updates: Partial<Comment>) => {
    if ('user_has_liked' in updates || 'likes_count' in updates) {
      toggleReplyLike(event.id, replyId)
    }
  }, [toggleReplyLike, event.id])

  const handleDeleteComment = useCallback((commentId: string) => {
    deleteComment(commentId, event.id)
  }, [deleteComment, event.id])

  // Handle retry for failed infinite scroll requests
  const handleRetryInfiniteScroll = useCallback(() => {
    fetchNextPage()
  }, [fetchNextPage])

  // Handle retry for initial load errors
  const handleRetryInitialLoad = useCallback(() => {
    refetch()
  }, [refetch])

  // Maintain existing initial load error UI display
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
          onClick={handleRetryInitialLoad}
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

      {/* List of Comments with Infinite Scroll */}
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
                  {/* Non-virtualized rendering - working version */}
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

        {/* Loading indicator for infinite scroll */}
        {isFetchingNextPage && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Loading more comments...
          </div>
        )}

        {/* Add new error handling for infinite scroll failures at bottom of list */}
        {hasInfiniteScrollError && infiniteScrollError && (
          <div className="mt-4 text-center text-sm text-destructive">
            <div className="mb-2">
              Error loading more comments:
              {' '}
              {infiniteScrollError.message || String(infiniteScrollError)}
            </div>
            <button
              onClick={handleRetryInfiniteScroll}
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
