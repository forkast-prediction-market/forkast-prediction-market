import type { Comment } from '@/types'

interface Props {
  comment: Comment
  onRepliesLoaded: (commentId: string) => void
}

export default function EventCommentsLoadMoreReplies({ comment, onRepliesLoaded }: Props) {
  function handleLoadMoreReplies() {
    onRepliesLoaded(comment.id)
  }

  if (comment.replies_count <= 3) {
    return <></>
  }

  return (
    <button
      type="button"
      className="text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
      onClick={handleLoadMoreReplies}
    >
      View
      {' '}
      {comment.replies_count - 3}
      {' '}
      more replies
    </button>
  )
}
