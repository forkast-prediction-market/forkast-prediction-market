'use client'

import type { Comment, Event, User } from '@/types'
import { useCallback, useState, useRef, useEffect } from 'react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
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

  // Create parent container ref for scroll margin calculation
  const parentRef = useRef<HTMLDivElement>(null)

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
    updateComment,
    updateReply,
    status,
  } = useInfiniteComments(event.slug)

  // Add useWindowVirtualizer hook with estimated comment item height
  const virtualizer = useWindowVirtualizer({
    count: comments.length,
    estimateSize: useCallback(() => 120, []), // Estimated 120px per comment item (accounting for content, replies, and actions)
    scrollMargin: parentRef.current?.offsetTop ?? 0,
    overscan: 5, // Render 5 extra items above and below visible area for smoother scrolling
    measureElement: typeof window !== 'undefined' ? undefined : () => 120, // Fallback for SSR
  })

  // Handle initialization state to prevent premature loading
  useEffect(() => {
    // Mark as initialized once we have successfully loaded the first page
    if (status === 'success' && !isInitialized) {
      setIsInitialized(true)
    }
  }, [status, isInitialized])

  // Handle variable height comments with content and replies
  useEffect(() => {
    // Measure actual heights after render and update virtualizer
    virtualizer.measure()
  }, [comments, expandedComments, replyingTo, virtualizer])

  // Cleanup effect to ensure proper cleanup of queries and event listeners
  useEffect(() => {
    return () => {
      // Clear any pending infinite scroll errors when component unmounts
      // The TanStack Query cleanup is handled automatically
    }
  }, [])

  // Implement onChange handler for virtualizer to detect scroll position
  useEffect(() => {
    const virtualItems = virtualizer.getVirtualItems()
    
    // Handle initialization state to prevent premature loading
    if (!isInitialized || virtualItems.length === 0 || comments.length === 0) {
      return
    }
    
    const [lastItem] = [...virtualItems].reverse()
    
    if (!lastItem) return
    
    // Add logic to trigger fetchNextPage when approaching end of comments list
    // Include hasNextPage and isFetchingNextPage checks
    // Trigger when we're within 5 items of the end and have more data to load
    if (
      lastItem.index >= comments.length - 5 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage()
    }
  }, [isInitialized, comments.length, hasNextPage, isFetchingNextPage, fetchNextPage, virtualizer])

  const handleCommentAdded = useCallback((newComment: Comment) => {
    // The server action has already created the comment, so we refetch the data
    // to ensure the UI is updated with the latest comment
    refetch()
  }, [refetch])

  const handleRepliesLoaded = useCallback((commentId: string, allReplies: Comment[]) => {
    updateComment(commentId, { recent_replies: allReplies })
    setExpandedComments(prev => new Set([...prev, commentId]))
  }, [updateComment])

  const handleLikeToggled = useCallback((commentId: string, newLikesCount: number, newUserHasLiked: boolean) => {
    // Use the new mutation-based like toggle instead of manual state updates
    toggleCommentLike(event.id, commentId)
  }, [toggleCommentLike, event.id])

  const handleAddReply = useCallback((commentId: string, newReply: Comment) => {
    // The new hook handles optimistic updates automatically through mutations
    // This callback is called after a successful reply creation
    // No need to manually update the comment as it's handled by the mutation
  }, [])

  const handleDeleteReply = useCallback((commentId: string, replyId: string) => {
    deleteReply(commentId, replyId, event.id)
  }, [deleteReply, event.id])

  const handleUpdateReply = useCallback((commentId: string, replyId: string, updates: Partial<Comment>) => {
    // For like toggle on replies, use the specific mutation
    if ('user_has_liked' in updates || 'likes_count' in updates) {
      toggleReplyLike(event.id, replyId)
    } else {
      // For other updates, use the legacy function (with warning)
      updateReply(commentId, replyId, updates)
    }
  }, [updateReply, toggleReplyLike, event.id])

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
        onCommentAddedAction={handleCommentAdded}
      />

      {/* List of Comments with Virtual Scrolling */}
      <div ref={parentRef} className="mt-6">
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
                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {/* Implement virtual item rendering logic for single-column comment layout */}
                  {virtualizer.getVirtualItems().map((virtualItem) => {
                    const comment = comments[virtualItem.index]
                    if (!comment) return null

                    return (
                      <div
                        key={virtualItem.key}
                        data-index={virtualItem.index}
                        ref={virtualizer.measureElement}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualItem.start}px)`,
                        }}
                      >
                        <div className="pb-6">
                          <EventCommentItem
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
                        </div>
                      </div>
                    )
                  })}
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
