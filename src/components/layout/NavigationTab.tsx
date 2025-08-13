'use client'

import { TrendingUpIcon } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Teleport } from '@/components/layout/Teleport'
import { Button } from '@/components/ui/button'

interface Props {
  tag: {
    slug: string
    name: string
    childs: { name: string, slug: string }[]
  }
}

export default function NavigationTab({ tag }: Props) {
  const searchParams = useSearchParams()
  const tagFromURL = searchParams?.get('tag') || 'trending'
  const isActive = tagFromURL === tag.slug || tag.childs.some(child => tagFromURL === child.slug)

  return (
    <>
      <Link
        href={`/?tag=${tag.slug}`}
        className={`flex items-center gap-1.5 border-b-2 py-2 pb-1 whitespace-nowrap transition-colors ${
          isActive
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        {tag.slug === 'trending' && <TrendingUpIcon className="size-4" />}
        <span>{tag.name}</span>
      </Link>

      {isActive && (
        <Teleport to="#navigation-tags">
          <Link href={`/?tag=${tag.slug}`} key={tag.slug}>
            <Button
              variant={tagFromURL === tag.slug ? 'default' : 'ghost'}
              size="sm"
              className="h-8 shrink-0 text-xs whitespace-nowrap"
            >
              All
            </Button>
          </Link>

          {tag.childs.map(subtag => (
            <Link href={`/?tag=${subtag.slug}`} key={subtag.slug}>
              <Button
                variant={tagFromURL === subtag.slug ? 'default' : 'ghost'}
                size="sm"
                className="h-8 shrink-0 text-xs whitespace-nowrap"
              >
                {subtag.name}
              </Button>
            </Link>
          ))}
        </Teleport>
      )}
    </>
  )
}
