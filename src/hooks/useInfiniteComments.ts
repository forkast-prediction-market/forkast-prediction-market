import type { Comment } from '@/types'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { deleteCommentAction } from '@/app/(platform)/event/[slug]/actions/delete-comment'
import { likeCommentAction } from '@/app/(platform)/event/[slug]/actions/like-comment'
import { storeCommentAction } from '@/app/(platform)/event/[slug]/actions/store-comment'

export async function fetchComments({
  pageParam = 0,
  eventSlug,
}: {
  pageParam: number
  eventSlug: string
}): Promise<Comment[]> {
  const limit = 20
  const offset = pageParam * limit

  const url = new URL(`/api/events/${eventSlug}/comments`, window.location.origin)
  url.searchParams.set('limit', limit.toString())
  url.searchParams.set('offset', offset.toString())

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(`Failed to fetch comments: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

export function useInfiniteComments(eventSlug: string) {
  const queryClient = useQueryClient()

  // Track infinite scroll errors separately from initial load errors
  const [infiniteScrollError, setInfiniteScrollError] = useState<Error | null>(null)

  // Configure useInfiniteQuery with proper query key and options
  const {
    data,
    status,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['event-comments', eventSlug],
    queryFn: ({ pageParam = 0 }) => fetchComments({ pageParam, eventSlug }),
    getNextPageParam: (lastPage, allPages) => {
      // If the last page has fewer than 20 comments, we've reached the end
      const pageSize = 20
      if (lastPage.length < pageSize) {
        return undefined // No more pages
      }
      // Return the next page number (current page count)
      return allPages.length
    },
    initialPageParam: 0,
    // Set up proper query options for caching and refetch behavior
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    retry: 3,
  })

  // Flatten pages data to provide comments array to component
  const comments = useMemo(() => {
    if (!data?.pages) {
      return []
    }
    return data.pages.flat()
  }, [data?.pages])

  // Wrapper for fetchNextPage with error handling
  const fetchNextPageWithErrorHandling = useCallback(async () => {
    try {
      setInfiniteScrollError(null)
      await fetchNextPage()
    }
    catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load more comments')
      setInfiniteScrollError(error)
    }
  }, [fetchNextPage])

  // Check if we have an infinite scroll error (error occurred after initial load)
  const hasInfiniteScrollError = infiniteScrollError !== null && data?.pages && data.pages.length > 0

  // Mutation for creating a new comment
  const createCommentMutation = useMutation({
    mutationFn: async ({ eventId, content, parentCommentId }: {
      eventId: string
      content: string
      parentCommentId?: string
    }) => {
      const formData = new FormData()
      formData.append('content', content)
      if (parentCommentId) {
        formData.append('parent_comment_id', parentCommentId)
      }

      const result = await storeCommentAction(eventId, formData)
      if (result.error) {
        throw new Error(result.error)
      }
      return result.comment
    },
    onMutate: async ({ content, parentCommentId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['event-comments', eventSlug] })

      // Snapshot the previous value
      const previousComments = queryClient.getQueryData(['event-comments', eventSlug])

      // Create optimistic comment
      const optimisticComment: Comment = {
        id: `temp-${Date.now()}`,
        content,
        user_id: 'current-user',
        username: 'You',
        user_avatar: null,
        user_address: '',
        likes_count: 0,
        replies_count: 0,
        created_at: new Date().toISOString(),
        is_owner: true,
        user_has_liked: false,
        recent_replies: [],
      }

      if (parentCommentId) {
        // If it's a reply, add to the parent comment's recent_replies
        queryClient.setQueryData(['event-comments', eventSlug], (oldData: any) => {
          if (!oldData) {
            return oldData
          }

          const newPages = oldData.pages.map((page: Comment[]) =>
            page.map((comment: Comment) => {
              if (comment.id === parentCommentId) {
                return {
                  ...comment,
                  recent_replies: [...(comment.recent_replies || []), optimisticComment],
                  replies_count: comment.replies_count + 1,
                }
              }
              return comment
            }),
          )

          return { ...oldData, pages: newPages }
        })
      }
      else {
        // If it's a top-level comment, add to the first page
        queryClient.setQueryData(['event-comments', eventSlug], (oldData: any) => {
          if (!oldData) {
            return { pages: [[optimisticComment]], pageParams: [0] }
          }

          const newPages = [...oldData.pages]
          newPages[0] = [optimisticComment, ...newPages[0]]

          return { ...oldData, pages: newPages }
        })
      }

      return { previousComments, optimisticComment }
    },
    onError: (_err, _variables, context) => {
      // Rollback to previous state on error
      if (context?.previousComments) {
        queryClient.setQueryData(['event-comments', eventSlug], context.previousComments)
      }
    },
    onSuccess: (newComment, variables, context) => {
      // Replace optimistic comment with real comment
      queryClient.setQueryData(['event-comments', eventSlug], (oldData: any) => {
        if (!oldData) {
          return oldData
        }

        const newPages = oldData.pages.map((page: Comment[]) => {
          if (variables.parentCommentId) {
            // Replace in replies
            return page.map((comment: Comment) => {
              if (comment.id === variables.parentCommentId && comment.recent_replies) {
                return {
                  ...comment,
                  recent_replies: comment.recent_replies.map(reply =>
                    reply.id === context?.optimisticComment.id ? newComment : reply,
                  ),
                }
              }
              return comment
            })
          }
          else {
            // Replace in top-level comments
            return page.map((comment: Comment) =>
              comment.id === context?.optimisticComment.id ? newComment : comment,
            )
          }
        })

        return { ...oldData, pages: newPages }
      })
    },
  })

  // Mutation for toggling comment like
  const likeCommentMutation = useMutation({
    mutationFn: async ({ eventId, commentId }: { eventId: string, commentId: string }) => {
      const result = await likeCommentAction(eventId, commentId)
      if (result.error) {
        throw new Error(result.error)
      }
      return result.data
    },
    onMutate: async ({ commentId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['event-comments', eventSlug] })

      // Snapshot the previous value
      const previousComments = queryClient.getQueryData(['event-comments', eventSlug])

      // Optimistically update the like status
      queryClient.setQueryData(['event-comments', eventSlug], (oldData: any) => {
        if (!oldData) {
          return oldData
        }

        const newPages = oldData.pages.map((page: Comment[]) =>
          page.map((comment: Comment) => {
            if (comment.id === commentId) {
              return {
                ...comment,
                user_has_liked: !comment.user_has_liked,
                likes_count: comment.user_has_liked
                  ? comment.likes_count - 1
                  : comment.likes_count + 1,
              }
            }
            // Also check replies
            if (comment.recent_replies) {
              return {
                ...comment,
                recent_replies: comment.recent_replies.map((reply) => {
                  if (reply.id === commentId) {
                    return {
                      ...reply,
                      user_has_liked: !reply.user_has_liked,
                      likes_count: reply.user_has_liked
                        ? reply.likes_count - 1
                        : reply.likes_count + 1,
                    }
                  }
                  return reply
                }),
              }
            }
            return comment
          }),
        )

        return { ...oldData, pages: newPages }
      })

      return { previousComments }
    },
    onError: (_err, _variables, context) => {
      // Rollback to previous state on error
      if (context?.previousComments) {
        queryClient.setQueryData(['event-comments', eventSlug], context.previousComments)
      }
    },
    onSuccess: (data, variables) => {
      // Update with actual server response if needed
      if (data) {
        queryClient.setQueryData(['event-comments', eventSlug], (oldData: any) => {
          if (!oldData) {
            return oldData
          }

          const newPages = oldData.pages.map((page: Comment[]) =>
            page.map((comment: Comment) => {
              if (comment.id === variables.commentId) {
                return {
                  ...comment,
                  user_has_liked: data.user_has_liked,
                  likes_count: data.likes_count,
                }
              }
              // Also check replies
              if (comment.recent_replies) {
                return {
                  ...comment,
                  recent_replies: comment.recent_replies.map((reply) => {
                    if (reply.id === variables.commentId) {
                      return {
                        ...reply,
                        user_has_liked: data.user_has_liked,
                        likes_count: data.likes_count,
                      }
                    }
                    return reply
                  }),
                }
              }
              return comment
            }),
          )

          return { ...oldData, pages: newPages }
        })
      }
    },
  })

  // Mutation for deleting a comment
  const deleteCommentMutation = useMutation({
    mutationFn: async ({ eventId, commentId }: { eventId: string, commentId: string }) => {
      const result = await deleteCommentAction(eventId, commentId)
      if (result.error !== false) {
        throw new Error(typeof result.error === 'string' ? result.error : 'Failed to delete comment')
      }
      return commentId
    },
    onMutate: async ({ commentId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['event-comments', eventSlug] })

      // Snapshot the previous value
      const previousComments = queryClient.getQueryData(['event-comments', eventSlug])

      // Optimistically remove the comment
      queryClient.setQueryData(['event-comments', eventSlug], (oldData: any) => {
        if (!oldData) {
          return oldData
        }

        const newPages = oldData.pages.map((page: Comment[]) => {
          // Remove from top-level comments
          const filteredPage = page.filter((comment: Comment) => comment.id !== commentId)

          // Also remove from replies and update reply counts
          return filteredPage.map((comment: Comment) => {
            if (comment.recent_replies) {
              const originalReplyCount = comment.recent_replies.length
              const filteredReplies = comment.recent_replies.filter(reply => reply.id !== commentId)
              const removedReplies = originalReplyCount - filteredReplies.length

              return {
                ...comment,
                recent_replies: filteredReplies,
                replies_count: Math.max(0, comment.replies_count - removedReplies),
              }
            }
            return comment
          })
        })

        return { ...oldData, pages: newPages }
      })

      return { previousComments }
    },
    onError: (_err, _variables, context) => {
      // Rollback to previous state on error
      if (context?.previousComments) {
        queryClient.setQueryData(['event-comments', eventSlug], context.previousComments)
      }
    },
  })

  // Core mutation functions with proper error handling and optimistic updates
  const createComment = useCallback((eventId: string, content: string, parentCommentId?: string) => {
    createCommentMutation.mutate({ eventId, content, parentCommentId })
  }, [createCommentMutation])

  const toggleCommentLike = useCallback((eventId: string, commentId: string) => {
    likeCommentMutation.mutate({ eventId, commentId })
  }, [likeCommentMutation])

  const deleteComment = useCallback((commentId: string, eventId: string) => {
    deleteCommentMutation.mutate({ eventId, commentId })
  }, [deleteCommentMutation])

  const createReply = useCallback((eventId: string, parentCommentId: string, content: string) => {
    createCommentMutation.mutate({ eventId, content, parentCommentId })
  }, [createCommentMutation])

  const toggleReplyLike = useCallback((eventId: string, replyId: string) => {
    likeCommentMutation.mutate({ eventId, commentId: replyId })
  }, [likeCommentMutation])

  const deleteReply = useCallback((_commentId: string, replyId: string, eventId: string) => {
    deleteCommentMutation.mutate({ eventId, commentId: replyId })
  }, [deleteCommentMutation])

  // Mutation for loading more replies
  const loadMoreRepliesMutation = useMutation({
    mutationFn: async ({ commentId }: { commentId: string }) => {
      const response = await fetch(`/api/comments/${commentId}/replies`)
      if (!response.ok) {
        throw new Error('Failed to load replies')
      }
      return await response.json()
    },
    onSuccess: (replies, variables) => {
      // Update the specific comment with all replies
      queryClient.setQueryData(['event-comments', eventSlug], (oldData: any) => {
        if (!oldData) {
          return oldData
        }

        const newPages = oldData.pages.map((page: Comment[]) =>
          page.map((comment: Comment) => {
            if (comment.id === variables.commentId) {
              return {
                ...comment,
                recent_replies: replies,
              }
            }
            return comment
          }),
        )

        return { ...oldData, pages: newPages }
      })
    },
  })

  const loadMoreReplies = useCallback((commentId: string) => {
    loadMoreRepliesMutation.mutate({ commentId })
  }, [loadMoreRepliesMutation])

  return {
    comments,
    status,
    error,
    fetchNextPage: fetchNextPageWithErrorHandling,
    hasNextPage,
    isFetchingNextPage,
    infiniteScrollError,
    hasInfiniteScrollError,
    refetch,

    // Core mutation functions
    createComment,
    toggleCommentLike,
    deleteComment,
    createReply,
    toggleReplyLike,
    deleteReply,
    loadMoreReplies,

    // Mutation states for UI feedback
    isCreatingComment: createCommentMutation.isPending,
    isTogglingLike: likeCommentMutation.isPending,
    isDeletingComment: deleteCommentMutation.isPending,
    isLoadingReplies: loadMoreRepliesMutation.isPending,

    // Error states
    createCommentError: createCommentMutation.error,
    likeCommentError: likeCommentMutation.error,
    deleteCommentError: deleteCommentMutation.error,

    // Reset functions for error handling
    resetCreateCommentError: createCommentMutation.reset,
    resetLikeCommentError: likeCommentMutation.reset,
    resetDeleteCommentError: deleteCommentMutation.reset,
  }
}
