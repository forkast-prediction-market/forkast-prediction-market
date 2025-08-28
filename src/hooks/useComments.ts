import type { Comment } from '@/types'
import { useCallback, useEffect, useState } from 'react'

export function useComments(eventSlug: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchComments() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/events/${eventSlug}/comments`)
        if (!response.ok) {
          throw new Error('Failed to fetch comments')
        }
        const data = await response.json()
        setComments(data)
      }
      catch (error) {
        console.error('Error fetching comments:', error)
        setError(error instanceof Error ? error.message : 'Failed to load comments')
      }
      finally {
        setLoading(false)
      }
    }

    fetchComments()
  }, [eventSlug])

  const addComment = useCallback((newComment: Comment) => {
    setComments(prev => [newComment, ...prev])
  }, [])

  const updateComment = useCallback((commentId: number, updates: Partial<Comment>) => {
    setComments(prev => prev.map(comment =>
      comment.id === commentId ? { ...comment, ...updates } : comment,
    ))
  }, [])

  const removeComment = useCallback((commentId: number) => {
    setComments(prev => prev.filter(comment => comment.id !== commentId))
  }, [])

  const updateReply = useCallback((commentId: number, replyId: number, updates: Partial<Comment>) => {
    setComments(prev => prev.map((comment) => {
      if (comment.id === commentId && comment.recent_replies) {
        return {
          ...comment,
          recent_replies: comment.recent_replies.map(reply =>
            reply.id === replyId ? { ...reply, ...updates } : reply,
          ),
        }
      }
      return comment
    }))
  }, [])

  const removeReply = useCallback((commentId: number, replyId: number) => {
    setComments(prev => prev.map((comment) => {
      if (comment.id === commentId && comment.recent_replies) {
        return {
          ...comment,
          recent_replies: comment.recent_replies.filter(reply => reply.id !== replyId),
          replies_count: Math.max(0, comment.replies_count - 1),
        }
      }
      return comment
    }))
  }, [])

  return {
    comments,
    loading,
    error,
    addComment,
    updateComment,
    removeComment,
    updateReply,
    removeReply,
  }
}
