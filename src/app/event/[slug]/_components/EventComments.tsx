import type { Comment, Event, User } from '@/types'
import { useAppKit } from '@reown/appkit/react'
import { HeartIcon, MoreHorizontalIcon } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import EventCommentForm from '@/app/event/[slug]/_components/EventCommentForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  event: Event
  user: User | null
}

export default function EventComments({ event, user }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set())
  const { open } = useAppKit()
  const router = useRouter()
  const handleCommentAdded = useCallback((newComment: Comment) => {
    setComments(prev => [newComment, ...prev])
  }, [])

  function navigateToProfile(username: string | null, address: string | undefined) {
    if (username) {
      router.push(`/@${username}`)
    }
    else if (address) {
      router.push(`/@${address}`)
    }
  }

  async function handleDeleteComment(commentId: number) {
    if (!user) {
      queueMicrotask(() => open())
      return
    }

    // eslint-disable-next-line no-alert
    if (!confirm('Are you sure you want to delete this comment?')) {
      return
    }

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove comment from local state
        setComments(prev => prev.filter((comment) => {
          if (comment.id === commentId) {
            return false
          }

          // Also filter out from replies
          if (comment.recent_replies) {
            comment.recent_replies = comment.recent_replies.filter(reply => reply.id !== commentId)
          }

          return true
        }))
        setOpenMenuId(null)
      }
      else {
        // eslint-disable-next-line no-alert
        alert('Error deleting comment')
      }
    }
    catch (error) {
      console.error('Error deleting comment:', error)
      // eslint-disable-next-line no-alert
      alert('Error deleting comment')
    }
  }

  async function handleSubmitReply(parentCommentId: number) {
    if (!user) {
      queueMicrotask(() => open())
      return
    }

    if (!replyText.trim() || !user) {
      return
    }

    try {
      const response = await fetch(`/api/events/${event.slug}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: replyText.trim(),
          parent_comment_id: parentCommentId,
        }),
      })

      if (response.ok) {
        const newReply = await response.json()

        // Ensure the new reply has the current user's data
        const replyWithUserData = {
          ...newReply,
          username: user?.username || newReply.username,
          user_avatar: user?.image || newReply.user_avatar,
          user_address: user?.address || newReply.user_address,
        }

        // Add reply to the parent comment
        setComments(prev => prev.map((comment) => {
          if (comment.id === parentCommentId) {
            return {
              ...comment,
              replies_count: comment.replies_count + 1,
              recent_replies: [
                ...(comment.recent_replies || []),
                replyWithUserData,
              ].slice(-3), // Keep only last 3 replies visible
            }
          }
          return comment
        }))

        setReplyText('')
        setReplyingTo(null)
      }
    }
    catch (error) {
      console.error('Error posting reply:', error)
    }
  }

  // Fetch current user and comments together
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

  async function loadMoreReplies(commentId: number) {
    try {
      const response = await fetch(`/api/comments/${commentId}/replies`)
      if (response.ok) {
        const allReplies = await response.json()

        // Update the specific comment with all replies
        setComments(prev => prev.map((comment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              recent_replies: allReplies,
            }
          }
          return comment
        }))

        // Mark this comment as expanded
        setExpandedComments(prev => new Set([...prev, commentId]))
      }
    }
    catch (error) {
      console.error('Error loading more replies:', error)
    }
  }

  async function handleLikeComment(commentId: number) {
    if (!user) {
      queueMicrotask(() => open())
      return
    }

    try {
      const response = await fetch(`/api/comments/${commentId}/like`, {
        method: 'POST',
      })

      if (response.ok) {
        const result = await response.json()

        // Update local state based on action
        setComments(prev => prev.map((comment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              likes_count: result.action === 'liked'
                ? comment.likes_count + 1
                : Math.max(0, comment.likes_count - 1),
              user_has_liked: result.action === 'liked',
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
                      likes_count: result.action === 'liked'
                        ? reply.likes_count + 1
                        : Math.max(0, reply.likes_count - 1),
                      user_has_liked: result.action === 'liked',
                    }
                  : reply,
              ),
            }
          }

          return comment
        }))
      }
    }
    catch (error) {
      console.error('Error liking comment:', error)
    }
  }

  function formatTimeAgo(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`
    }
    if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`
    }
    if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h ago`
    }
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  return (
    <>
      <EventCommentForm
        user={user}
        eventId={event.id}
        onCommentAddedAction={handleCommentAdded}
      />

      {/* List of Comments */}
      <div className="mt-6 space-y-6">
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
                  <div key={comment.id} className="space-y-3">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => navigateToProfile(comment.username, comment.user_address)}
                        className="shrink-0"
                      >
                        <Image
                          src={comment.user_avatar || `https://avatar.vercel.sh/${comment.username || comment.user_address || 'anonymous'}.png`}
                          alt={comment.username || comment.user_address || 'Anonymous User'}
                          width={32}
                          height={32}
                          className="size-8 rounded-full object-cover transition-opacity hover:opacity-80"
                        />
                      </button>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigateToProfile(comment.username, comment.user_address)}
                            className="text-[13px] font-medium transition-colors hover:text-foreground"
                          >
                            @
                            {comment.username
                              ? comment.username
                              : comment.user_address
                                ? `${comment.user_address.slice(0, 6)}...${comment.user_address.slice(-4)}`
                                : 'Anonymous User'}
                          </button>
                          <span className="text-[11px] text-muted-foreground">
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
                              setReplyText(`@${comment.username || (comment.user_address ? `${comment.user_address.slice(0, 6)}...${comment.user_address.slice(-4)}` : 'anonymous')} `)
                            }}
                          >
                            Reply
                          </button>
                          <button
                            type="button"
                            className={`
                        flex items-center gap-1 text-xs transition-colors
${comment.user_has_liked
                    ? 'text-destructive'
                    : 'text-muted-foreground hover:text-foreground'
                  }
                      `}
                            onClick={() => handleLikeComment(comment.id)}
                          >
                            <HeartIcon
                              className={`size-3 ${comment.user_has_liked ? 'fill-current' : ''}`}
                            />
                            {comment.likes_count > 0 && (
                              <span>{comment.likes_count}</span>
                            )}
                          </button>
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
                                <button
                                  type="button"
                                  className={`
                                    flex w-full items-center rounded-sm px-2 py-1.5 text-xs text-red-600
                                    transition-colors
                                    hover:bg-red-50 hover:text-red-700
                                  `}
                                  onClick={() => handleDeleteComment(comment.id)}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Reply input field */}
                    {replyingTo === comment.id && (
                      <div className="mt-3 ml-11">
                        <div className="flex gap-3">
                          <Image
                            src={user?.image || `https://avatar.vercel.sh/${user?.username || user?.address}.png`}
                            alt={user?.username || user?.address || 'User'}
                            width={24}
                            height={24}
                            className="size-6 shrink-0 rounded-full object-cover"
                          />
                          <div className="flex-1 space-y-2">
                            <div className="relative">
                              <Input
                                className={`
                                  pr-20 text-sm
                                  placeholder:text-muted-foreground/70
                                  focus:border-blue-500 focus:ring-blue-500/20
                                `}
                                placeholder={`Reply to ${comment.username || (comment.user_address ? `${comment.user_address.slice(0, 6)}...${comment.user_address.slice(-4)}` : 'anonymous')}`}
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSubmitReply(comment.id)
                                  }
                                  if (e.key === 'Escape') {
                                    setReplyingTo(null)
                                    setReplyText('')
                                  }
                                }}
                              />
                              <div className="absolute top-1/2 right-2 flex -translate-y-1/2 gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => {
                                    setReplyingTo(null)
                                    setReplyText('')
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  disabled={!replyText.trim()}
                                  onClick={() => handleSubmitReply(comment.id)}
                                >
                                  Reply
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Render replies if available */}
                    {comment.recent_replies && comment.recent_replies.length > 0 && (
                      <div className="ml-11 space-y-3">
                        {comment.recent_replies.map(reply => (
                          <div key={reply.id} className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => navigateToProfile(reply.username, reply.user_address)}
                              className="shrink-0"
                            >
                              <Image
                                src={reply.user_avatar || `https://avatar.vercel.sh/${reply.username || reply.user_address || 'anonymous'}.png`}
                                alt={reply.username || reply.user_address || 'Anonymous User'}
                                width={24}
                                height={24}
                                className="size-6 rounded-full object-cover transition-opacity hover:opacity-80"
                              />
                            </button>
                            <div className="flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => navigateToProfile(reply.username, reply.user_address)}
                                  className="text-[13px] font-medium transition-colors hover:text-foreground"
                                >
                                  {reply.username
                                    ? reply.username
                                    : reply.user_address
                                      ? `${reply.user_address.slice(0, 6)}...${reply.user_address.slice(-4)}`
                                      : 'Anonymous User'}
                                </button>
                                <span className="text-[11px] text-muted-foreground">
                                  {formatTimeAgo(reply.created_at)}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
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
                                    setReplyText(`@${reply.username || (reply.user_address ? `${reply.user_address.slice(0, 6)}...${reply.user_address.slice(-4)}` : 'anonymous')} `)
                                  }}
                                >
                                  Reply
                                </button>
                                <button
                                  type="button"
                                  className={`
                              flex items-center gap-1 text-xs transition-colors
${reply.user_has_liked
                            ? 'text-destructive'
                            : 'text-muted-foreground hover:text-foreground'
                          }
                            `}
                                  onClick={() => handleLikeComment(reply.id)}
                                >
                                  <HeartIcon
                                    className={`size-3 ${reply.user_has_liked ? 'fill-current' : ''}`}
                                  />
                                  {reply.likes_count > 0 && (
                                    <span>{reply.likes_count}</span>
                                  )}
                                </button>
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
                                      <button
                                        type="button"
                                        className={`
                                          flex w-full items-center rounded-sm px-2 py-1.5 text-xs text-red-600
                                          transition-colors
                                          hover:bg-red-50 hover:text-red-700
                                        `}
                                        onClick={() => handleDeleteComment(reply.id)}
                                      >
                                        Delete
                                      </button>
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
                            <div className="flex gap-3">
                              <Image
                                src={user?.image || `https://avatar.vercel.sh/${user?.username || user?.address}.png`}
                                alt={user?.username || user?.address || 'User'}
                                width={24}
                                height={24}
                                className="size-6 shrink-0 rounded-full object-cover"
                              />
                              <div className="flex-1 space-y-2">
                                <div className="relative">
                                  <Input
                                    className={`
                                      pr-20 text-sm
                                      placeholder:text-muted-foreground/70
                                      focus:border-blue-500 focus:ring-blue-500/20
                                    `}
                                    placeholder="Add a reply..."
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handleSubmitReply(comment.id) // Always reply to the main comment
                                      }
                                      if (e.key === 'Escape') {
                                        setReplyingTo(null)
                                        setReplyText('')
                                      }
                                    }}
                                  />
                                  <div className="absolute top-1/2 right-2 flex -translate-y-1/2 gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => {
                                        setReplyingTo(null)
                                        setReplyText('')
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      disabled={!replyText.trim()}
                                      onClick={() => handleSubmitReply(comment.id)} // Always reply to the main comment
                                    >
                                      Reply
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {comment.replies_count > 3 && !expandedComments.has(comment.id) && (
                          <button
                            type="button"
                            className="ml-9 text-xs text-muted-foreground transition-colors hover:text-foreground"
                            onClick={() => loadMoreReplies(comment.id)}
                          >
                            View
                            {' '}
                            {comment.replies_count - 3}
                            {' '}
                            more replies
                          </button>
                        )}

                        {expandedComments.has(comment.id) && comment.replies_count > 3 && (
                          <button
                            type="button"
                            className="ml-9 text-xs text-muted-foreground transition-colors hover:text-foreground"
                            onClick={() => {
                              setExpandedComments((prev) => {
                                const newSet = new Set(prev)
                                newSet.delete(comment.id)
                                return newSet
                              })
                              // Reset to show only 3 replies
                              setComments(prevComments => prevComments.map((c) => {
                                if (c.id === comment.id) {
                                  return {
                                    ...c,
                                    recent_replies: c.recent_replies?.slice(0, 3) || [],
                                  }
                                }
                                return c
                              }))
                            }}
                          >
                            Hide replies
                          </button>
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
