'use client'

import type { Comment, User } from '@/types'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { commentMetricsQueryKey } from '@/app/(platform)/event/[slug]/_hooks/useCommentMetrics'

interface LiveCommentProfile {
  baseAddress?: string
  displayUsernamePublic?: boolean
  name?: string
  profileImage?: string
  proxyWallet?: string
  pseudonym?: string
}

interface LiveCommentPayload {
  id?: string | number
  body?: string
  createdAt?: string
  parentCommentID?: string | null
  profile?: LiveCommentProfile | null
  reactionCount?: number
  userAddress?: string
}

interface LiveCommentsMessage {
  topic?: string
  type?: string
  payload?: LiveCommentPayload
}

function normalizeAddress(value?: string | null) {
  return value ? value.toLowerCase() : ''
}

function buildLiveComment(payload: LiveCommentPayload, user: User | null): Comment | null {
  if (!payload?.id) {
    return null
  }

  const profile = payload.profile ?? {}
  const userAddress = payload.userAddress ?? profile.baseAddress ?? ''
  const createdAt = payload.createdAt ?? new Date().toISOString()
  const username = profile.name || profile.pseudonym || 'Anonymous'

  return {
    id: String(payload.id),
    content: payload.body ?? '',
    user_id: userAddress,
    username,
    user_avatar: profile.profileImage ?? '',
    user_address: userAddress,
    user_proxy_wallet_address: profile.proxyWallet ?? null,
    likes_count: Number(payload.reactionCount ?? 0),
    replies_count: 0,
    created_at: createdAt,
    is_owner: normalizeAddress(user?.address) === normalizeAddress(userAddress),
    user_has_liked: false,
    recent_replies: [],
  }
}

function findExistingComment(pages: Comment[][], commentId: string) {
  return pages.some(page =>
    page.some(comment =>
      comment.id === commentId
      || comment.recent_replies?.some(reply => reply.id === commentId),
    ),
  )
}

function updateCommentMetrics(
  queryClient: ReturnType<typeof useQueryClient>,
  eventSlug: string,
  delta: number,
) {
  queryClient.setQueryData(commentMetricsQueryKey(eventSlug), (current: any) => {
    if (!current || typeof current.comments_count !== 'number') {
      return current
    }
    return {
      ...current,
      comments_count: Math.max(0, current.comments_count + delta),
    }
  })
}

interface LiveCommentsChannelParams {
  eventSlug: string
  sortBy: 'newest' | 'most_liked'
  user: User | null
}

export function useLiveCommentsChannel({ eventSlug, sortBy, user }: LiveCommentsChannelParams) {
  const queryClient = useQueryClient()
  const wsUrl = process.env.WS_LIVE_DATA_URL!
  const commentsQueryKey = useMemo(
    () => ['event-comments', eventSlug, sortBy, user?.address ?? null],
    [eventSlug, sortBy, user?.address],
  )

  useEffect(() => {
    if (!eventSlug || !wsUrl) {
      return
    }

    let isActive = true
    let ws: WebSocket | null = null
    let reconnectTimeout: number | null = null

    function buildSubscriptionPayload(action: 'subscribe' | 'unsubscribe') {
      return JSON.stringify({
        action,
        subscriptions: [
          {
            topic: 'comments',
            type: '*',
            filters: { event_slug: eventSlug },
          },
        ],
      })
    }

    function handleOpen() {
      if (!ws) {
        return
      }
      ws.send(buildSubscriptionPayload('subscribe'))
    }

    function handleCommentCreated(payload: LiveCommentPayload) {
      const newComment = buildLiveComment(payload, user)
      if (!newComment) {
        return
      }

      const parentId = payload.parentCommentID ? String(payload.parentCommentID) : null
      let didInsert = false

      queryClient.setQueryData(commentsQueryKey, (oldData: any) => {
        if (!oldData) {
          if (parentId) {
            return oldData
          }
          didInsert = true
          return { pages: [[newComment]], pageParams: [0] }
        }

        const pages = oldData.pages as Comment[][]

        if (findExistingComment(pages, newComment.id)) {
          return oldData
        }

        if (!parentId) {
          const newPages = [...pages]
          const firstPage = newPages[0] ? [...newPages[0]] : []
          newPages[0] = [newComment, ...firstPage]
          didInsert = true
          return { ...oldData, pages: newPages }
        }

        let didChange = false
        const newPages = pages.map(page =>
          page.map((comment) => {
            if (comment.id !== parentId) {
              return comment
            }
            const replies = comment.recent_replies ? [...comment.recent_replies] : []
            if (replies.some(reply => reply.id === newComment.id)) {
              return comment
            }
            didChange = true
            didInsert = true
            return {
              ...comment,
              recent_replies: [newComment, ...replies],
              replies_count: comment.replies_count + 1,
            }
          }),
        )

        return didChange ? { ...oldData, pages: newPages } : oldData
      })

      if (didInsert) {
        updateCommentMetrics(queryClient, eventSlug, 1)
      }
    }

    function handleCommentRemoved(payload: LiveCommentPayload) {
      const commentId = payload?.id ? String(payload.id) : ''
      if (!commentId) {
        return
      }

      let didRemove = false

      queryClient.setQueryData(commentsQueryKey, (oldData: any) => {
        if (!oldData) {
          return oldData
        }

        const pages = oldData.pages as Comment[][]
        const newPages = pages.map((page) => {
          let pageChanged = false
          const filteredPage = page.filter((comment) => {
            if (comment.id === commentId) {
              didRemove = true
              pageChanged = true
              return false
            }
            return true
          })

          const updatedPage = filteredPage.map((comment) => {
            if (!comment.recent_replies || comment.recent_replies.length === 0) {
              return comment
            }
            const filteredReplies = comment.recent_replies.filter(reply => reply.id !== commentId)
            if (filteredReplies.length === comment.recent_replies.length) {
              return comment
            }
            didRemove = true
            pageChanged = true
            return {
              ...comment,
              recent_replies: filteredReplies,
              replies_count: Math.max(0, comment.replies_count - 1),
            }
          })

          return pageChanged ? updatedPage : filteredPage
        })

        return didRemove ? { ...oldData, pages: newPages } : oldData
      })

      if (didRemove) {
        updateCommentMetrics(queryClient, eventSlug, -1)
      }
    }

    function handleMessage(eventMessage: MessageEvent<string>) {
      if (!isActive) {
        return
      }

      let payload: LiveCommentsMessage | null = null
      try {
        payload = JSON.parse(eventMessage.data)
      }
      catch {
        return
      }

      if (payload?.topic !== 'comments') {
        return
      }

      if (payload.type === 'comment_created' && payload.payload) {
        handleCommentCreated(payload.payload)
        return
      }

      if (payload.type === 'comment_removed' && payload.payload) {
        handleCommentRemoved(payload.payload)
      }
    }

    function handleError() {
      if (!isActive) {
        //
      }
    }

    function handleClose() {
      if (!isActive) {
        return
      }
      scheduleReconnect()
    }

    function connect() {
      if (!isActive || ws || document.hidden) {
        return
      }
      ws = new WebSocket(wsUrl)
      ws.addEventListener('open', handleOpen)
      ws.addEventListener('message', handleMessage)
      ws.addEventListener('error', handleError)
      ws.addEventListener('close', handleClose)
    }

    function clearReconnect() {
      if (reconnectTimeout != null) {
        window.clearTimeout(reconnectTimeout)
        reconnectTimeout = null
      }
    }

    function scheduleReconnect() {
      clearReconnect()
      reconnectTimeout = window.setTimeout(() => {
        if (!isActive) {
          return
        }
        if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
          ws = null
          connect()
        }
      }, 1500)
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
          ws = null
          connect()
        }
      }
    }

    connect()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isActive = false
      clearReconnect()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (ws) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(buildSubscriptionPayload('unsubscribe'))
        }
        ws.removeEventListener('open', handleOpen)
        ws.removeEventListener('message', handleMessage)
        ws.removeEventListener('error', handleError)
        ws.removeEventListener('close', handleClose)
        ws.close()
      }
    }
  }, [commentsQueryKey, eventSlug, queryClient, sortBy, user, wsUrl])
}
