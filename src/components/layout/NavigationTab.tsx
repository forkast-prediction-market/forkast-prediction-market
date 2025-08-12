'use client'

import { TrendingUpIcon } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Teleport } from '@/components/layout/Teleport'
import { Button } from '@/components/ui/button'

interface Props {
  category: {
    slug: string
    name: string
    childs: { name: string, slug: string }[]
  }
}

export default function NavigationTab({ category }: Props) {
  const searchParams = useSearchParams()
  const categoryFromURL = searchParams?.get('category') || 'trending'

  const isActive = categoryFromURL === category.slug || category.childs.some(child => categoryFromURL === child.slug)

  return (
    <>
      {isActive && (
        <Teleport to="#navigation-tags">
          {category.childs.map(subtag => (
            <Link href={`/?category=${subtag.slug}`} key={subtag.slug}>
              <Button
                variant={categoryFromURL === subtag.slug ? 'default' : 'ghost'}
                size="sm"
                className="h-8 shrink-0 text-xs whitespace-nowrap"
              >
                {subtag.name}
              </Button>
            </Link>
          ))}
        </Teleport>
      )}

      <Link
        href={`/?category=${category.slug}`}
        className={`flex items-center gap-1.5 border-b-2 py-2 pb-1 whitespace-nowrap transition-colors ${
          isActive
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        {category.slug === 'trending' && <TrendingUpIcon className="size-4" />}
        <span>{category.name}</span>
      </Link>
    </>
  )
}
