'use client'

import type { Route } from 'next'
import { TrendingUpIcon } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Teleport } from '@/components/layout/Teleport'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  tag: {
    slug: string
    name: string
    childs: { name: string, slug: string }[]
  }
  childParentMap: Record<string, string>
}

export default function NavigationTab({ tag, childParentMap }: Props) {
  const searchParams = useSearchParams()
  const showBookmarkedOnly = searchParams?.get('bookmarked') === 'true'
  const currentSearch = searchParams?.toString() ?? ''
  const tagFromURL = showBookmarkedOnly && searchParams?.get('tag') === 'trending'
    ? ''
    : searchParams?.get('tag') || 'trending'
  const contextFromURL = searchParams?.get('context') ?? undefined
  const parentSlug = childParentMap[tagFromURL]
  const hasChildMatch = tag.childs.some(child => child.slug === tagFromURL)
  const effectiveParent = contextFromURL ?? (parentSlug ?? (hasChildMatch ? tag.slug : tagFromURL))
  const isActive = effectiveParent === tag.slug

  function createHref(nextTag: string, context?: string): Route {
    const params = new URLSearchParams(currentSearch)
    params.set('tag', nextTag)

    if (context) {
      params.set('context', context)
    }
    else {
      params.delete('context')
    }

    if (!params.get('bookmarked') && showBookmarkedOnly) {
      params.set('bookmarked', 'true')
    }

    return (`/${params.toString() ? `?${params.toString()}` : ''}`) as Route
  }

  return (
    <>
      <Link
        href={createHref(tag.slug)}
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
          <Link href={createHref(tag.slug)} key={tag.slug}>
            <Button
              variant={tagFromURL === tag.slug ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-8 shrink-0 text-sm whitespace-nowrap',
                tagFromURL === tag.slug ? undefined : 'text-muted-foreground hover:text-foreground',
              )}
            >
              All
            </Button>
          </Link>

          {tag.childs.map(subtag => (
            <Link
              href={createHref(
                subtag.slug,
                tag.slug === 'trending' || tag.slug === 'new' ? tag.slug : undefined,
              )}
              key={subtag.slug}
            >
              <Button
                variant={tagFromURL === subtag.slug ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'h-8 shrink-0 text-sm whitespace-nowrap',
                  tagFromURL === subtag.slug ? undefined : 'text-muted-foreground hover:text-foreground',
                )}
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
