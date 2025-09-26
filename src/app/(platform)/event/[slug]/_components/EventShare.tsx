import { CheckIcon, LinkIcon } from 'lucide-react'
import { useState } from 'react'

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

  return shareSuccess
    ? <CheckIcon className="size-4 text-primary" />
    : (
        <LinkIcon
          className="size-4 cursor-pointer transition-colors hover:text-foreground"
          onClick={handleShare}
        />
      )
}
