import type { Event } from '@/types'
import { BookmarkIcon } from 'lucide-react'
import { useLayoutEffect, useState } from 'react'

interface Props {
  event: Event
}

export default function EventFavorite({ event }: Props) {
  const [isFavorite, setIsFavorite] = useState(false)

  useLayoutEffect(() => {
    const siteName = process.env.NEXT_PUBLIC_SITE_NAME!.toLowerCase()
    const stored = localStorage.getItem(`${siteName}-favorites`)
    if (stored) {
      try {
        const favArray = JSON.parse(stored)
        setIsFavorite(favArray.includes(event.id))
      }
      catch (error) {
        console.error('Error loading favorites:', error)
      }
    }
  }, [event.id])

  function handleFavoriteToggle() {
    const siteName = process.env.NEXT_PUBLIC_SITE_NAME!.toLowerCase()
    const stored = localStorage.getItem(`${siteName}-favorites`)
    let favArray: string[] = []

    if (stored) {
      try {
        favArray = JSON.parse(stored)
      }
      catch (error) {
        console.error('Error parsing favorites:', error)
      }
    }

    if (isFavorite) {
      favArray = favArray.filter(id => id !== event.id)
    }
    else {
      favArray.push(event.id)
    }

    localStorage.setItem(`${siteName}-favorites`, JSON.stringify(favArray))
    setIsFavorite(!isFavorite)
  }

  return (
    <BookmarkIcon
      className={`size-4 cursor-pointer transition-colors hover:text-primary ${
        isFavorite ? 'fill-current text-primary' : ''
      }`}
      onClick={handleFavoriteToggle}
    />
  )
}
