'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface EventCommentDeleteFormProps {
  onDelete: () => void
  isDeleting?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function EventCommentDeleteForm({
  onDelete,
  isDeleting,
  open,
  onOpenChange,
}: EventCommentDeleteFormProps) {
  function handleConfirm() {
    if (isDeleting) {
      return
    }
    onDelete()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-background sm:p-8">
        <div className="space-y-6">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-center text-2xl font-bold">
              Are you sure?
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              Are you sure you want to delete this comment?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              type="button"
              variant="outline"
              className="bg-background sm:w-36"
              onClick={() => onOpenChange(false)}
            >
              Never mind
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="bg-destructive hover:bg-destructive sm:w-36"
              onClick={handleConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
