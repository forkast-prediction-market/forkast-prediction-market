import { CheckIcon, LinkIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const headerIconButtonClass = 'h-10 w-10 rounded-sm border border-transparent bg-transparent text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring md:h-9 md:w-9'

export default function EventShare() {
  const [shareSuccess, setShareSuccess] = useState(false)

  async function handleShare() {
    try {
      const url = window.location.href
      await navigator.clipboard.writeText(url)
      setShareSuccess(true)
      setTimeout(() => setShareSuccess(false), 2000)
    }
    catch (error) {
      console.error('Error copying URL:', error)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(headerIconButtonClass, 'size-auto p-0')}
      onClick={handleShare}
      aria-label="Copy event link"
      title="Copy event link"
    >
      {shareSuccess
        ? <CheckIcon className="size-4 text-primary" />
        : <LinkIcon className="size-4" />}
    </Button>
  )
}
