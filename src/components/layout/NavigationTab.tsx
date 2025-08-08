'use client'

import { TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface Props {
  category: {
    id: string
    label: string
  }
}

export default function NavigationTab({ category }: Props) {
  const searchParams = useSearchParams()
  const categoryFromURL = searchParams?.get('category') || 'trending'

  return (
    <Link
      href={`/?category=${category.id}`}
      className={`flex items-center gap-1.5 border-b-2 py-2 pb-1 whitespace-nowrap transition-colors ${
        categoryFromURL === category.id
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {category.id === 'trending' && <TrendingUp className="size-4" />}
      <span>{category.label}</span>
    </Link>
  )
}
