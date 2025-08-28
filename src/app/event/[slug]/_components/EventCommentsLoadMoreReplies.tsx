import type { Comment } from '@/types'
import { useState } from 'react'

interface Props {
  comment: Comment
  onRepliesLoaded: (commentId: number, allReplies: Comment[]) => void
}

export default function EventCommentsLoadMoreReplies({ comment, onRepliesLoaded }: Props) {
  const [loadingReplies, setLoadingReplies] = useState(false)

  async function loadMoreReplies(commentId: number) {
    setLoadingReplies(true)

    try {
      const response = await fetch(`/api/comments/${commentId}/replies`)
      if (response.ok) {
        const allReplies = await response.json()
        onRepliesLoaded(commentId, allReplies)
      }
    }
    catch (error) {
      console.error('Error loading more replies:', error)
    }
    finally {
      setLoadingReplies(false)
    }
  }

  if (comment.replies_count <= 3) {
    return <></>
  }

  return loadingReplies
    ? (
        <div className="text-left text-xs text-muted-foreground">
          Loading replies...
        </div>
      )
    : (
        <button
          type="button"
          className="text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => loadMoreReplies(comment.id)}
        >
          View
          {' '}
          {comment.replies_count - 3}
          {' '}
          more replies
        </button>
      )
}
