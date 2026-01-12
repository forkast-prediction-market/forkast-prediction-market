'use client'

import { Button } from '@/components/ui/button'

interface EventCommentDeleteFormProps {
  onDelete: () => void
  isDeleting?: boolean
}

export default function EventCommentDeleteForm({ onDelete, isDeleting }: EventCommentDeleteFormProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="w-full text-xs text-destructive"
      disabled={isDeleting}
      onClick={onDelete}
    >
      {isDeleting ? 'Deleting...' : 'Delete'}
    </Button>
  )
}
