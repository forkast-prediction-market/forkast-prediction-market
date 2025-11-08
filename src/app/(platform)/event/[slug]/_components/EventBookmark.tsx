'use client'

import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { BookmarkIcon } from 'lucide-react'
import { useCallback, useState, useTransition } from 'react'
import { toggleBookmarkAction } from '@/app/(platform)/event/[slug]/_actions/toggle-bookmark'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const headerIconButtonClass = 'size-10 rounded-sm border border-transparent bg-transparent text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring md:h-9 md:w-9'

interface EventBookmarkProps {
  event: {
    id: string
    is_bookmarked: boolean
  }
}

export default function EventBookmark({ event }: EventBookmarkProps) {
  const { open } = useAppKit()
  const { isConnected } = useAppKitAccount()
  const [isBookmarked, setIsBookmarked] = useState(event.is_bookmarked)
  const [isPending, startTransition] = useTransition()

  const handleBookmark = useCallback(() => {
    const previousState = isBookmarked
    setIsBookmarked(!isBookmarked)

    startTransition(async () => {
      try {
        const response = await toggleBookmarkAction(event.id)
        if (response.error) {
          setIsBookmarked(previousState)
        }
      }
      catch {
        setIsBookmarked(previousState)
      }
    })
  }, [isBookmarked, event.id])

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={() => {
        if (isConnected) {
          handleBookmark()
        }
        else {
          queueMicrotask(() => open())
        }
      }}
      disabled={isPending}
      aria-pressed={isBookmarked}
      title={isBookmarked ? 'Remove Bookmark' : 'Bookmark'}
      className={cn(
        headerIconButtonClass,
        'size-auto p-0',
        isPending && 'opacity-50',
      )}
    >
      <BookmarkIcon className={cn({ 'fill-current text-primary': isBookmarked })} />
    </Button>
  )
}
