import type { Comment, Event } from '@/types'
import { useAppKit } from '@reown/appkit/react'
import { MoreHorizontalIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { formatTimeAgo, truncateAddress } from '@/lib/utils'
import { useUser } from '@/stores/useUser'
import EventCommentDeleteForm from './EventCommentDeleteForm'
import EventCommentForm from './EventCommentForm'
import EventCommentLikeForm from './EventCommentLikeForm'
import EventCommentReplyForm from './EventCommentReplyForm'
import EventCommentsLoadMoreReplies from './EventCommentsLoadMoreReplies'

interface Props {
  event: Event
}

export default function EventComments({ event }: Props) {
  const user = useUser()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')
  const [expandedComments, setExpandedComments] = useState<Set<number>>(() => new Set())
  const { open } = useAppKit()
  const handleCommentAdded = useCallback((newComment: Comment) => {
    setComments(prev => [newComment, ...prev])
  }, [])

  useEffect(() => {
    async function fetchUserAndComments() {
      try {
        setLoading(true)
        const response = await fetch(`/api/events/${event.slug}/comments`)
        if (response.ok) {
          const data = await response.json()
          setComments(data)
        }
      }
      catch (error) {
        console.error('Error fetching data:', error)
      }
      finally {
        setLoading(false)
      }
    }

    queueMicrotask(() => fetchUserAndComments())
  }, [event.slug])

  function handleRepliesLoaded(commentId: number, allReplies: Comment[]) {
    setComments(prev => prev.map((comment) => {
      if (comment.id === commentId) {
        return {
          ...comment,
          recent_replies: allReplies,
        }
      }
      return comment
    }))

    setExpandedComments(prev => new Set([...prev, commentId]))
  }

  function handleLikeToggled(commentId: number, newLikesCount: number, newUserHasLiked: boolean) {
    setComments(prev => prev.map((comment) => {
      if (comment.id === commentId) {
        return {
          ...comment,
          likes_count: newLikesCount,
          user_has_liked: newUserHasLiked,
        }
      }

      // Also update if it's a reply
      if (comment.recent_replies) {
        return {
          ...comment,
          recent_replies: comment.recent_replies.map(reply =>
            reply.id === commentId
              ? {
                  ...reply,
                  likes_count: newLikesCount,
                  user_has_liked: newUserHasLiked,
                }
              : reply,
          ),
        }
      }

      return comment
    }))
  }

  return (
    <>
      <EventCommentForm
        user={user}
        eventId={event.id}
        onCommentAddedAction={handleCommentAdded}
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
                  <div key={comment.id} className="grid gap-3">
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
                        <p className="text-sm">
                          {comment.content}
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <button
                            type="button"
                            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                            onClick={() => {
                              if (!user) {
                                queueMicrotask(() => open())
                                return
                              }
                              setReplyingTo(replyingTo === comment.id ? null : comment.id)
                              setReplyText(`@${comment.username || truncateAddress(comment.user_address)} `)
                            }}
                          >
                            Reply
                          </button>
                          <EventCommentLikeForm
                            comment={comment}
                            onLikeToggled={(newLikesCount, newUserHasLiked) =>
                              handleLikeToggled(comment.id, newLikesCount, newUserHasLiked)}
                          />
                        </div>
                      </div>
                      <div className="relative">
                        <button
                          type="button"
                          className="text-muted-foreground transition-colors hover:text-foreground"
                          onClick={() => setOpenMenuId(openMenuId === comment.id ? null : comment.id)}
                        >
                          <MoreHorizontalIcon className="size-4" />
                        </button>

                        {openMenuId === comment.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className={`
                              absolute top-8 right-0 z-20 min-w-32 rounded-md border bg-background p-1 shadow-md
                            `}
                            >
                              <button
                                type="button"
                                className={`
                                  flex w-full items-center rounded-sm px-2 py-1.5 text-xs text-muted-foreground
                                  transition-colors
                                  hover:bg-muted
                                `}
                                onClick={() => setOpenMenuId(null)}
                              >
                                Report
                              </button>
                              {comment.is_owner && (
                                <div className="p-0">
                                  <EventCommentDeleteForm
                                    commentId={comment.id}
                                    onDeleted={() => {
                                      setComments(prev => prev.filter((c) => {
                                        if (c.id === comment.id) {
                                          return false
                                        }
                                        if (c.recent_replies) {
                                          c.recent_replies = c.recent_replies.filter(r => r.id !== comment.id)
                                        }
                                        return true
                                      }))
                                      setOpenMenuId(null)
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Reply input field */}
                    {replyingTo === comment.id && (
                      <div className="mt-3 ml-11">
                        <EventCommentReplyForm
                          user={user}
                          eventId={event.id}
                          parentCommentId={comment.id}
                          placeholder={`Reply to ${comment.username || truncateAddress(comment.user_address)}`}
                          initialValue={replyText}
                          onCancel={() => {
                            setReplyingTo(null)
                            setReplyText('')
                          }}
                          onReplyAddedAction={(newReply) => {
                            setComments(prev => prev.map((c) => {
                              if (c.id === comment.id) {
                                return {
                                  ...c,
                                  replies_count: c.replies_count + 1,
                                  recent_replies: [
                                    ...(c.recent_replies || []),
                                    newReply,
                                  ].slice(-3),
                                }
                              }
                              return c
                            }))
                            setReplyingTo(null)
                            setReplyText('')
                          }}
                        />
                      </div>
                    )}

                    {/* Render replies if available */}
                    {comment.recent_replies && comment.recent_replies.length > 0 && (
                      <div className="ml-11 flex flex-col gap-3">
                        {comment.recent_replies.map(reply => (
                          <div key={reply.id} className="flex gap-3">
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
                              <p className="text-sm">
                                {reply.content}
                              </p>
                              <div className="mt-2 flex items-center gap-3">
                                <button
                                  type="button"
                                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                                  onClick={() => {
                                    if (!user) {
                                      queueMicrotask(() => open())
                                      return
                                    }
                                    setReplyingTo(replyingTo === reply.id ? null : reply.id)
                                    setReplyText(`@${reply.username || truncateAddress(reply.user_address)} `)
                                  }}
                                >
                                  Reply
                                </button>
                                <EventCommentLikeForm
                                  comment={reply}
                                  onLikeToggled={(newLikesCount, newUserHasLiked) => handleLikeToggled(reply.id, newLikesCount, newUserHasLiked)}
                                />
                              </div>
                            </div>
                            <div className="relative">
                              <button
                                type="button"
                                className="text-muted-foreground transition-colors hover:text-foreground"
                                onClick={() => setOpenMenuId(openMenuId === reply.id ? null : reply.id)}
                              >
                                <MoreHorizontalIcon className="size-4" />
                              </button>

                              {openMenuId === reply.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setOpenMenuId(null)}
                                  />
                                  <div className={`
                                    absolute top-8 right-0 z-20 min-w-32 rounded-md border bg-background p-1 shadow-md
                                  `}
                                  >
                                    <button
                                      type="button"
                                      className={`
                                        flex w-full items-center rounded-sm px-2 py-1.5 text-xs text-muted-foreground
                                        transition-colors
                                        hover:bg-muted
                                      `}
                                      onClick={() => setOpenMenuId(null)}
                                    >
                                      Report
                                    </button>
                                    {reply.is_owner && (
                                      <div className="p-0">
                                        <EventCommentDeleteForm
                                          commentId={reply.id}
                                          onDeleted={() => {
                                            setComments(prev => prev.map((c) => {
                                              if (c.id !== comment.id) {
                                                return c
                                              }
                                              return {
                                                ...c,
                                                recent_replies: (c.recent_replies || []).filter(r => r.id !== reply.id),
                                                replies_count: Math.max(0, c.replies_count - 1),
                                              }
                                            }))
                                            setOpenMenuId(null)
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Reply input field for second level replies */}
                        {comment.recent_replies?.some(reply => replyingTo === reply.id) && (
                          <div className="mt-3">
                            <EventCommentReplyForm
                              user={user}
                              eventId={event.id}
                              parentCommentId={comment.id}
                              placeholder="Add a reply..."
                              initialValue={replyText}
                              onCancel={() => {
                                setReplyingTo(null)
                                setReplyText('')
                              }}
                              onReplyAddedAction={(newReply) => {
                                setComments(prev => prev.map((c) => {
                                  if (c.id === comment.id) {
                                    return {
                                      ...c,
                                      replies_count: c.replies_count + 1,
                                      recent_replies: [
                                        ...(c.recent_replies || []),
                                        newReply,
                                      ].slice(-3),
                                    }
                                  }
                                  return c
                                }))
                                setReplyingTo(null)
                                setReplyText('')
                              }}
                            />
                          </div>
                        )}

                        {comment.replies_count > 3 && !expandedComments.has(comment.id) && (
                          <EventCommentsLoadMoreReplies
                            comment={comment}
                            onRepliesLoaded={handleRepliesLoaded}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
      </div>
    </>
  )
}
