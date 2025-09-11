import type { Event } from '@/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { requestCache } from '@/lib/cache'
import { performanceMonitor } from '@/lib/performance'
import { usePagination } from '@/stores/usePagination'

interface UseInfiniteEventsProps {
  initialEvents: Event[]
  tag: string
  search: string
  bookmarked: string
}

interface UseInfiniteEventsReturn {
  events: Event[]
  isLoading: boolean
  isError: boolean
  hasMore: boolean
  loadMore: () => void
  reset: () => void
  retryCount: number
  errorMessage: string | null
}

const EVENTS_PER_PAGE = 20
const DEBOUNCE_DELAY = 300
const MAX_RETRY_ATTEMPTS = 3
const RETRY_BASE_DELAY = 1000

// Network error types for better error handling
enum NetworkErrorType {
  TIMEOUT = 'timeout',
  NETWORK = 'network',
  SERVER = 'server',
  ABORT = 'abort',
  UNKNOWN = 'unknown',
}

interface NetworkError extends Error {
  type: NetworkErrorType
  status?: number
  retryable: boolean
}

// Helper function to classify and create network errors
function createNetworkError(error: unknown, response?: Response): NetworkError {
  let type = NetworkErrorType.UNKNOWN
  let retryable = false
  let status: number | undefined

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      type = NetworkErrorType.ABORT
      retryable = false
    }
    else if (
      error.message.includes('fetch')
      || error.message.includes('Failed to fetch')
    ) {
      type = NetworkErrorType.NETWORK
      retryable = true
    }
    else if (error.message.includes('timeout')) {
      type = NetworkErrorType.TIMEOUT
      retryable = true
    }
    else if (error.message.includes('HTTP error!')) {
      // Extract status from HTTP error message
      const statusMatch = error.message.match(/status: (\d+)/)
      if (statusMatch) {
        status = Number.parseInt(statusMatch[1], 10)
      }
    }
  }

  if (response) {
    status = response.status
    if (status >= 500) {
      type = NetworkErrorType.SERVER
      retryable = true
    }
    else if (status === 429) {
      type = NetworkErrorType.SERVER
      retryable = true // Rate limit, can retry with backoff
    }
    else if (status >= 400) {
      type = NetworkErrorType.SERVER
      retryable = false // Client error, don't retry
    }
  }

  const networkError = new Error(
    error instanceof Error ? error.message : 'Network request failed',
  ) as NetworkError

  networkError.type = type
  networkError.status = status
  networkError.retryable = retryable

  return networkError
}

// Helper function to get user-friendly error messages
function getErrorMessage(error: NetworkError): string {
  switch (error.type) {
    case NetworkErrorType.NETWORK:
      return 'Network connection failed. Please check your internet connection.'
    case NetworkErrorType.TIMEOUT:
      return 'Request timed out. Please try again.'
    case NetworkErrorType.SERVER:
      if (error.status === 429) {
        return 'Too many requests. Please wait a moment before trying again.'
      }
      if (error.status && error.status >= 500) {
        return 'Server error. Please try again later.'
      }
      return 'Request failed. Please try again.'
    case NetworkErrorType.ABORT:
      return 'Request was cancelled.'
    default:
      return 'Failed to load more events. Please try again.'
  }
}

export function useInfiniteEvents({
  initialEvents,
  tag,
  search,
  bookmarked,
}: UseInfiniteEventsProps): UseInfiniteEventsReturn {
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [isRequestInProgress, setIsRequestInProgress] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const {
    currentPage,
    hasMore,
    isLoading,
    error,
    setLoading,
    setError,
    setHasMore,
    incrementPage,
    reset: resetPagination,
  } = usePagination()

  // Refs for managing requests and debouncing
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previousFiltersRef = useRef({ tag, search, bookmarked })
  const mountedRef = useRef(true)

  // Check if filters have changed
  const filtersChanged = useMemo(() => {
    return (
      previousFiltersRef.current.tag !== tag
      || previousFiltersRef.current.search !== search
      || previousFiltersRef.current.bookmarked !== bookmarked
    )
  }, [tag, search, bookmarked])

  // Reset when filters change
  useEffect(() => {
    if (filtersChanged) {
      // Cancel any pending requests and timeouts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
        debounceTimeoutRef.current = null
      }

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }

      // Invalidate cache for old filters
      requestCache.invalidate()

      // Reset state
      resetPagination()
      setEvents(initialEvents)
      setIsRequestInProgress(false)
      setRetryCount(0)

      // Update previous filters
      previousFiltersRef.current = { tag, search, bookmarked }

      performanceMonitor.record('filter_change', 0, {
        newTag: tag,
        newSearch: search,
        newBookmarked: bookmarked,
      })
    }
  }, [tag, search, bookmarked, initialEvents, resetPagination, filtersChanged])

  // Memoized cache key for current request parameters
  const cacheKey = useMemo(
    () => ({
      tag,
      search: search || '',
      bookmarked: bookmarked === 'true',
      page: currentPage + 1,
      limit: EVENTS_PER_PAGE,
    }),
    [tag, search, bookmarked, currentPage],
  )

  const loadMoreEvents = useCallback(
    async (signal: AbortSignal, attemptNumber = 0) => {
      if (!mountedRef.current) { return }

      const requestStart = performance.now()

      try {
        const offset = (currentPage + 1) * EVENTS_PER_PAGE

        // Check cache first
        const cachedData = requestCache.get(cacheKey)
        if (cachedData && !signal.aborted) {
          performanceMonitor.record(
            'api_events_cache_hit',
            performance.now() - requestStart,
            {
              offset,
              tag,
              search: !!search,
              bookmarked: bookmarked === 'true',
            },
          )

          const newEvents = cachedData.events || []
          const hasMoreData = cachedData.hasMore ?? false

          if (mountedRef.current) {
            setEvents(prevEvents => [...prevEvents, ...newEvents])
            setHasMore(hasMoreData)
            incrementPage()
            setError(null)
            setRetryCount(0)
          }
          return
        }

        // Make API request with timeout
        const params = new URLSearchParams({
          tag,
          offset: offset.toString(),
          limit: EVENTS_PER_PAGE.toString(),
        })

        if (search) {
          params.append('search', search)
        }

        if (bookmarked === 'true') {
          params.append('bookmarked', 'true')
        }

        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Request timeout'))
          }, 30000) // 30 second timeout

          signal.addEventListener('abort', () => {
            clearTimeout(timeoutId)
          })
        })

        const fetchPromise = performanceMonitor.measure(
          'api_events_request',
          async () => {
            return fetch(`/api/events?${params.toString()}`, {
              signal,
              headers: {
                'Content-Type': 'application/json',
              },
            })
          },
          {
            offset,
            tag,
            search: !!search,
            bookmarked: bookmarked === 'true',
            attemptNumber,
          },
        )

        const response = await Promise.race([fetchPromise, timeoutPromise])

        if (signal.aborted || !mountedRef.current) {
          return
        }

        if (!response.ok) {
          const networkError = createNetworkError(
            new Error(`HTTP error! status: ${response.status}`),
            response,
          )
          throw networkError
        }

        const data = await response.json()

        if (signal.aborted || !mountedRef.current) {
          return
        }

        // Cache the response
        requestCache.set(cacheKey, data)

        const newEvents = data.events || []
        const hasMoreData = data.hasMore ?? false

        setEvents(prevEvents => [...prevEvents, ...newEvents])
        setHasMore(hasMoreData)
        incrementPage()
        setError(null)
        setRetryCount(0)

        performanceMonitor.record(
          'api_events_success',
          performance.now() - requestStart,
          {
            eventsLoaded: newEvents.length,
            totalEvents: events.length + newEvents.length,
            hasMore: hasMoreData,
            attemptNumber,
          },
        )
      }
      catch (err) {
        if (signal.aborted || !mountedRef.current) {
          return
        }

        const networkError = createNetworkError(err)
        const errorMessage = getErrorMessage(networkError)

        // Only retry if the error is retryable and we haven't exceeded max attempts
        if (networkError.retryable && attemptNumber < MAX_RETRY_ATTEMPTS) {
          const nextAttempt = attemptNumber + 1
          const delay = Math.min(RETRY_BASE_DELAY * 2 ** attemptNumber, 10000)

          performanceMonitor.record('api_events_retry_scheduled', delay, {
            error: errorMessage,
            attemptNumber: nextAttempt,
            delay,
            errorType: networkError.type,
          })

          setRetryCount(nextAttempt)

          retryTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current && !signal.aborted) {
              loadMoreEvents(signal, nextAttempt)
            }
          }, delay)

          return
        }

        // Set error state for non-retryable errors or max attempts exceeded
        setError(errorMessage)
        setRetryCount(attemptNumber)

        performanceMonitor.record(
          'api_events_error',
          performance.now() - requestStart,
          {
            error: errorMessage,
            errorType: networkError.type,
            status: networkError.status,
            offset: (currentPage + 1) * EVENTS_PER_PAGE,
            attemptNumber,
            retryable: networkError.retryable,
          },
        )

        console.error('Error loading more events:', networkError)
      }
      finally {
        if (mountedRef.current && !signal.aborted) {
          setIsRequestInProgress(false)
          setLoading(false)
        }
      }
    },
    [
      currentPage,
      tag,
      search,
      bookmarked,
      setHasMore,
      incrementPage,
      setError,
      setLoading,
      cacheKey,
      events.length,
    ],
  )

  const debouncedLoadMore = useCallback(() => {
    // Clear existing timeouts
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      // Don't load if already loading, no more data, or request in progress
      if (isLoading || !hasMore || isRequestInProgress || !mountedRef.current) {
        return
      }

      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController()

      setIsRequestInProgress(true)
      setLoading(true)
      setError(null)

      loadMoreEvents(abortControllerRef.current.signal)
    }, DEBOUNCE_DELAY)
  }, [
    isLoading,
    hasMore,
    isRequestInProgress,
    loadMoreEvents,
    setLoading,
    setError,
  ])

  const reset = useCallback(() => {
    // Cancel any pending requests and timeouts
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
      debounceTimeoutRef.current = null
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    // Reset state
    resetPagination()
    setEvents(initialEvents)
    setIsRequestInProgress(false)
    setRetryCount(0)
  }, [resetPagination, initialEvents])

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  return {
    events,
    isLoading,
    isError: !!error,
    hasMore,
    loadMore: debouncedLoadMore,
    reset,
    retryCount,
    errorMessage: error,
  }
}
