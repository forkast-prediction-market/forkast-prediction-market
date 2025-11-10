'use client'

import type { Event, User } from '@/types'
import { AlertCircleIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import ProfileLinkSkeleton from '@/components/ProfileLinkSkeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
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
  const [infiniteScrollError, setInfiniteScrollError] = useState<string | null>(null)

  const {
    comments,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    toggleCommentLike,
    deleteComment,
    toggleReplyLike,
    deleteReply,
    loadMoreReplies,
    createReply,
    isCreatingComment,
    status,
    isLoadingRepliesForComment,
    loadRepliesError,
    retryLoadReplies,
  } = useInfiniteComments(event.slug)

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      if (scrollTop + windowHeight >= documentHeight - 1000) {
        if (hasNextPage && !isFetchingNextPage && isInitialized) {
          fetchNextPage().catch((error) => {
            setInfiniteScrollError(error.message || 'Failed to load more comments')
          })
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

  useEffect(() => {
    queueMicrotask(() => setInfiniteScrollError(null))
  }, [comments.length])

  const handleRepliesLoaded = useCallback((commentId: string) => {
    loadMoreReplies(commentId)
  }, [loadMoreReplies])

  useEffect(() => {
    comments.forEach((comment) => {
      if (comment.recent_replies && comment.recent_replies.length > 3) {
        setExpandedComments(prev => new Set([...prev, comment.id]))
      }
    })
  }, [comments])

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

  const retryInfiniteScroll = useCallback(() => {
    setInfiniteScrollError(null)
    fetchNextPage().catch((error) => {
      setInfiniteScrollError(error.message || 'Failed to load more comments')
    })
  }, [fetchNextPage])

  if (error) {
    return (
      <div className="mt-6">
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Internal server error</AlertTitle>
          <AlertDescription>
            <Button
              type="button"
              onClick={() => refetch()}
              size="sm"
              variant="link"
              className="-ml-3"
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
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
              <>
                <ProfileLinkSkeleton showDate={true} showChildren={true} />
                <ProfileLinkSkeleton showDate={true} showChildren={true} />
                <ProfileLinkSkeleton showDate={true} showChildren={true} />
              </>
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
                      createReply={createReply}
                      isCreatingComment={isCreatingComment}
                      isLoadingRepliesForComment={isLoadingRepliesForComment}
                      loadRepliesError={loadRepliesError}
                      retryLoadReplies={retryLoadReplies}
                    />
                  ))}
                </div>
              )}

        {isFetchingNextPage && (
          <div className="mt-4">
            <ProfileLinkSkeleton showDate={true} showChildren={true} />
            <ProfileLinkSkeleton showDate={true} showChildren={true} />
            <ProfileLinkSkeleton showDate={true} showChildren={true} />
          </div>
        )}

        {infiniteScrollError && (
          <div className="mt-6">
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Error loading more comments</AlertTitle>
              <AlertDescription>
                <Button
                  type="button"
                  onClick={retryInfiniteScroll}
                  size="sm"
                  variant="link"
                  className="-ml-3"
                >
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </>
  )
}
