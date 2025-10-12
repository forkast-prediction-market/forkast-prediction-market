import type { Comment } from '@/types'

/**
 * Fetches a page of comments for an event using pagination parameters
 * Compatible with TanStack Query's useInfiniteQuery
 */
export async function fetchComments({
  pageParam = 0,
  eventSlug,
}: {
  pageParam: number
  eventSlug: string
}): Promise<Comment[]> {
  const limit = 20 // Default page size as specified in requirements
  const offset = pageParam * limit

  // Construct URL with limit and offset parameters
  const url = new URL(`/api/events/${eventSlug}/comments`, window.location.origin)
  url.searchParams.set('limit', limit.toString())
  url.searchParams.set('offset', offset.toString())

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error('Failed to fetch comments')
  }

  const comments: Comment[] = await response.json()
  return comments
}
