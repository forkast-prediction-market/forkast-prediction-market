'use client'

import type { Event, User } from '@/types'
import { AlertCircleIcon, ShieldIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useInfiniteComments } from '@/app/(platform)/event/[slug]/_hooks/useInfiniteComments'
import ProfileLinkSkeleton from '@/components/ProfileLinkSkeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  const [sortBy, setSortBy] = useState<'newest' | 'most_liked'>('newest')

  const {
    comments,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    createComment,
    toggleCommentLike,
    deleteComment,
    toggleReplyLike,
    deleteReply,
    loadMoreReplies,
    createReply,
    isCreatingComment,
    isTogglingLikeForComment,
    status,
    isLoadingRepliesForComment,
    loadRepliesError,
    retryLoadReplies,
  } = useInfiniteComments(event.slug, sortBy, user)

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
    toggleCommentLike(commentId)
  }, [toggleCommentLike])

  const handleDeleteReply = useCallback((commentId: string, replyId: string) => {
    deleteReply(commentId, replyId)
  }, [deleteReply])

  const handleUpdateReply = useCallback((commentId: string, replyId: string) => {
    toggleReplyLike(replyId)
  }, [toggleReplyLike])

  const handleDeleteComment = useCallback((commentId: string) => {
    deleteComment(commentId)
  }, [deleteComment])

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
        user={user}
        createComment={createComment}
        isCreatingComment={isCreatingComment}
        onCommentAddedAction={() => refetch()}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <Select value={sortBy} onValueChange={value => setSortBy(value as 'newest' | 'most_liked')}>
          <SelectTrigger size="default" className="h-9 px-3 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="most_liked">Most liked</SelectItem>
          </SelectContent>
        </Select>
        <div className={`
          ml-auto inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm text-muted-foreground
        `}
        >
          <ShieldIcon className="size-3" />
          Beware of external links
        </div>
      </div>

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
                      user={user}
                      onLikeToggle={handleLikeToggled}
                      isTogglingLikeForComment={isTogglingLikeForComment}
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
