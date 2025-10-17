import type { AdminCategoryRow } from './useAdminCategories'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

// Generic action state interface
export interface ActionState {
  pending: boolean
  error: string | null
  pendingIds: Set<number>
}

// Category-specific action context for rollback
interface CategoryActionContext {
  previousQueries: Array<[readonly unknown[], AdminCategoriesQueryData | undefined]>
  categoryId: number
  optimisticUpdate: Partial<AdminCategoryRow>
}

// Query data interface for TanStack Query integration
interface AdminCategoriesQueryData {
  data: AdminCategoryRow[]
  totalCount: number
}

// Server action result interface
interface ServerActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Custom hook for managing server action states with optimistic updates
 * Provides pending state tracking, error handling, and TanStack Query integration
 */
export function useActionState() {
  const queryClient = useQueryClient()

  const [state, setState] = useState<ActionState>({
    pending: false,
    error: null,
    pendingIds: new Set(),
  })

  // Add a category ID to pending state
  const addPendingId = useCallback((id: number) => {
    setState(prev => ({
      ...prev,
      pending: true,
      pendingIds: new Set([...prev.pendingIds, id]),
    }))
  }, [])

  // Remove a category ID from pending state
  const removePendingId = useCallback((id: number) => {
    setState((prev) => {
      const newPendingIds = new Set(prev.pendingIds)
      newPendingIds.delete(id)
      return {
        ...prev,
        pending: newPendingIds.size > 0,
        pendingIds: newPendingIds,
      }
    })
  }, [])

  // Set error state
  const setError = useCallback((error: string | null) => {
    setState(prev => ({
      ...prev,
      error,
    }))
  }, [])

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }))
  }, [])

  // Check if a specific category ID is pending
  const isPending = useCallback((id: number) => {
    return state.pendingIds.has(id)
  }, [state.pendingIds])

  // Execute optimistic update for category
  const executeOptimisticUpdate = useCallback(async (
    categoryId: number,
    updates: Partial<Pick<AdminCategoryRow, 'is_main_category' | 'is_hidden'>>,
  ): Promise<CategoryActionContext> => {
    // Cancel any outgoing queries
    await queryClient.cancelQueries({ queryKey: ['admin-categories'] })

    // Snapshot the previous queries for rollback
    const previousQueries = queryClient.getQueriesData<AdminCategoriesQueryData>({
      queryKey: ['admin-categories'],
    })

    // Apply optimistic update
    queryClient.setQueriesData<AdminCategoriesQueryData>(
      { queryKey: ['admin-categories'] },
      (old) => {
        if (!old) { return old }

        return {
          ...old,
          data: old.data.map((item) => {
            if (item.id !== categoryId) { return item }
            return { ...item, ...updates }
          }),
        }
      },
    )

    return {
      previousQueries,
      categoryId,
      optimisticUpdate: updates,
    }
  }, [queryClient])

  // Rollback optimistic update on error
  const rollbackOptimisticUpdate = useCallback((context: CategoryActionContext) => {
    context.previousQueries.forEach(([queryKey, data]) => {
      queryClient.setQueryData(queryKey, data)
    })
  }, [queryClient])

  // Apply successful update to cache
  const applySuccessfulUpdate = useCallback((updatedCategory: AdminCategoryRow) => {
    queryClient.setQueriesData<AdminCategoriesQueryData>(
      { queryKey: ['admin-categories'] },
      (old) => {
        if (!old || !old.data) { return old }

        return {
          ...old,
          data: old.data.map(item =>
            item.id === updatedCategory.id ? { ...item, ...updatedCategory } : item,
          ),
        }
      },
    )
  }, [queryClient])

  // Invalidate queries after successful action
  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
  }, [queryClient])

  // Execute server action with full state management
  const executeAction = useCallback(async <T>(
    categoryId: number,
    updates: Partial<Pick<AdminCategoryRow, 'is_main_category' | 'is_hidden'>>,
    serverAction: () => Promise<ServerActionResult<T>>,
    options?: {
      onSuccess?: (data: T, context: CategoryActionContext) => void
      onError?: (error: string, context: CategoryActionContext) => void
      successMessage?: string
      errorMessage?: string
    },
  ): Promise<ServerActionResult<T>> => {
    let context: CategoryActionContext | null = null

    try {
      // Clear any previous errors
      clearError()

      // Add to pending state
      addPendingId(categoryId)

      // Execute optimistic update
      context = await executeOptimisticUpdate(categoryId, updates)

      // Execute server action
      const result = await serverAction()

      if (result.success && result.data) {
        // Apply successful update to cache
        if (result.data && typeof result.data === 'object' && 'id' in result.data) {
          applySuccessfulUpdate(result.data as unknown as AdminCategoryRow)
        }

        // Show success message with consistent timing
        if (options?.successMessage) {
          toast.success(options.successMessage, {
            duration: 3000, // 3 seconds - standard duration
          })
        }

        // Invalidate queries after successful update to ensure consistency
        invalidateQueries()

        // Call success callback
        if (options?.onSuccess && result.data) {
          options.onSuccess(result.data, context)
        }

        return result
      }
      else {
        // Handle server action error with appropriate categorization
        let errorMessage = result.error || options?.errorMessage || 'Action failed'

        // Provide more specific error messages based on error content
        if (result.error?.includes('Unauthorized') || result.error?.includes('Unauthenticated')) {
          errorMessage = 'You do not have permission to perform this action'
        }
        else if (result.error?.includes('Validation error')) {
          errorMessage = 'Invalid data provided'
        }
        else if (result.error?.includes('Internal server error')) {
          errorMessage = 'Server error. Please try again'
        }

        // Rollback optimistic update
        if (context) {
          rollbackOptimisticUpdate(context)
        }

        // Set error state
        setError(errorMessage)

        // Show error toast with appropriate duration
        toast.error(errorMessage, {
          duration: 4000, // 4 seconds for errors - slightly longer
        })

        // Call error callback
        if (options?.onError && context) {
          options.onError(errorMessage, context)
        }

        return result
      }
    }
    catch (error) {
      // Handle unexpected errors with better categorization
      let errorMessage = 'Unexpected error occurred'

      if (error instanceof Error) {
        // Network or connection errors
        if (error.message.includes('fetch') || error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again'
        }
        else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again'
        }
        else {
          errorMessage = error.message
        }
      }

      // Rollback optimistic update
      if (context) {
        rollbackOptimisticUpdate(context)
      }

      // Set error state
      setError(errorMessage)

      // Show error toast with appropriate duration
      toast.error(errorMessage, {
        duration: 4000, // 4 seconds for errors - slightly longer
      })

      // Call error callback
      if (options?.onError && context) {
        options.onError(errorMessage, context)
      }

      return {
        success: false,
        error: errorMessage,
      }
    }
    finally {
      // Remove from pending state
      removePendingId(categoryId)
    }
  }, [
    clearError,
    addPendingId,
    executeOptimisticUpdate,
    applySuccessfulUpdate,
    rollbackOptimisticUpdate,
    setError,
    removePendingId,
    invalidateQueries,
  ])

  // Retry mechanism for failed actions
  const retryAction = useCallback(async <T>(
    categoryId: number,
    updates: Partial<Pick<AdminCategoryRow, 'is_main_category' | 'is_hidden'>>,
    serverAction: () => Promise<ServerActionResult<T>>,
    options?: {
      onSuccess?: (data: T, context: CategoryActionContext) => void
      onError?: (error: string, context: CategoryActionContext) => void
      successMessage?: string
      errorMessage?: string
    },
  ): Promise<ServerActionResult<T>> => {
    // Clear previous error before retry
    clearError()
    return executeAction(categoryId, updates, serverAction, options)
  }, [clearError, executeAction])

  return {
    // State
    pending: state.pending,
    error: state.error,
    pendingIds: state.pendingIds,

    // State checkers
    isPending,

    // State setters
    setError,
    clearError,

    // Action execution
    executeAction,
    retryAction,

    // Manual cache operations (for advanced use cases)
    executeOptimisticUpdate,
    rollbackOptimisticUpdate,
    applySuccessfulUpdate,
    invalidateQueries,
  }
}

/**
 * Specialized hook for category actions with predefined success messages
 * Builds on top of useActionState with category-specific logic
 */
export function useCategoryActionState() {
  const actionState = useActionState()

  // Execute category toggle with appropriate success messages
  const executeToggleAction = useCallback(async (
    category: AdminCategoryRow,
    updates: Partial<Pick<AdminCategoryRow, 'is_main_category' | 'is_hidden'>>,
    serverAction: () => Promise<ServerActionResult<AdminCategoryRow>>,
  ) => {
    // Generate concise success message matching app patterns
    let successMessage = 'Category updated successfully'

    if (updates.is_hidden !== undefined) {
      successMessage = updates.is_hidden ? 'Category hidden' : 'Category made visible'
    }
    else if (updates.is_main_category !== undefined) {
      successMessage = updates.is_main_category ? 'Set as main category' : 'Removed from main categories'
    }

    return actionState.executeAction(
      category.id,
      updates,
      serverAction,
      {
        successMessage,
        errorMessage: 'Failed to update category',
      },
    )
  }, [actionState])

  // Retry toggle action with same parameters
  const retryToggleAction = useCallback(async (
    category: AdminCategoryRow,
    updates: Partial<Pick<AdminCategoryRow, 'is_main_category' | 'is_hidden'>>,
    serverAction: () => Promise<ServerActionResult<AdminCategoryRow>>,
  ) => {
    // Generate appropriate success message
    let successMessage = 'Category updated successfully'

    if (updates.is_hidden !== undefined) {
      successMessage = updates.is_hidden ? 'Category hidden' : 'Category made visible'
    }
    else if (updates.is_main_category !== undefined) {
      successMessage = updates.is_main_category ? 'Set as main category' : 'Removed from main categories'
    }

    return actionState.retryAction(
      category.id,
      updates,
      serverAction,
      {
        successMessage,
        errorMessage: 'Failed to update category',
      },
    )
  }, [actionState])

  return {
    ...actionState,
    executeToggleAction,
    retryToggleAction,
  }
}
