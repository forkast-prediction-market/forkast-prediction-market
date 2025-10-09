'use client'

import Form from 'next/form'
import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { deleteCommentAction } from '@/app/(platform)/event/[slug]/actions/delete-comment'
import { Button } from '@/components/ui/button'

interface EventCommentDeleteFormProps {
  commentId: string
  eventId: string
  onDeleted: () => void
}

export default function EventCommentDeleteForm({ commentId, eventId, onDeleted }: EventCommentDeleteFormProps) {
  const [state, formAction, pending] = useActionState(
    async (_: any, __: FormData) => {
      const res = await deleteCommentAction(eventId, commentId)
      if (!res.error) {
        onDeleted()
      }
      return res
    },
    { error: '' },
  ) as unknown as [any, (formData: FormData) => void, boolean]

  useEffect(() => {
    if (state.error) {
      toast.error(state.error)
    }
  }, [state.error])

  return (
    <Form action={formAction}>
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        className="w-full text-xs text-destructive"
        disabled={pending}
      >
        {pending ? 'Deleting...' : 'Delete'}
      </Button>
    </Form>
  )
}
