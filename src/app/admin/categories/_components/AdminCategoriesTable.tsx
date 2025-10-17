'use client'

import type { AdminCategoryRow } from '@/hooks/useAdminCategories'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { DataTable } from '@/app/admin/_components/DataTable'
import { createCategoryColumns } from '@/app/admin/categories/_components/columns'
import { useAdminCategoriesTable } from '@/hooks/useAdminCategories'

interface UpdateCategoryVariables {
  category: AdminCategoryRow
  updates: Partial<Pick<AdminCategoryRow, 'is_main_category' | 'is_hidden'>>
}

interface UpdateCategoryResponse {
  data: AdminCategoryRow
}

interface AdminCategoriesQueryData {
  data: AdminCategoryRow[]
  totalCount: number
}

async function updateCategoryRequest({ category, updates }: UpdateCategoryVariables): Promise<UpdateCategoryResponse> {
  const response = await fetch('/admin/api/categories', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: category.id,
      ...updates,
    }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const message = typeof payload?.error === 'string' ? payload.error : response.statusText
    throw new Error(message || 'Failed to update category')
  }

  return response.json()
}

export default function AdminCategoriesTable() {
  const queryClient = useQueryClient()
  const {
    categories,
    totalCount,
    isLoading,
    error,
    retry,
    search,
    handleSearchChange,
    sortBy,
    sortOrder,
    handleSortChange,
    pageIndex,
    pageSize,
    handlePageChange,
    handlePageSizeChange,
  } = useAdminCategoriesTable()

  const [pendingMainId, setPendingMainId] = useState<number | null>(null)
  const [pendingHiddenId, setPendingHiddenId] = useState<number | null>(null)

  const mutation = useMutation<UpdateCategoryResponse, Error, UpdateCategoryVariables, {
    previousQueries: Array<[readonly unknown[], AdminCategoriesQueryData | undefined]>
  }>({
    mutationFn: updateCategoryRequest,
    onMutate: async (variables: UpdateCategoryVariables) => {
      const { category, updates } = variables
      if (Object.prototype.hasOwnProperty.call(updates, 'is_main_category')) {
        setPendingMainId(category.id)
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'is_hidden')) {
        setPendingHiddenId(category.id)
      }

      await queryClient.cancelQueries({ queryKey: ['admin-categories'] })

      const previousQueries = queryClient.getQueriesData<AdminCategoriesQueryData>({
        queryKey: ['admin-categories'],
      })

      queryClient.setQueriesData<AdminCategoriesQueryData>({ queryKey: ['admin-categories'] }, (old) => {
        if (!old) {
          return old
        }

        return {
          ...old,
          data: old.data.map((item) => {
            if (item.id !== category.id) {
              return item
            }

            return {
              ...item,
              ...updates,
            }
          }),
        }
      })

      return { previousQueries }
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      toast.error(error.message || 'Failed to update category')
    },
    onSuccess: (response, variables) => {
      const updated = response.data

      queryClient.setQueriesData<AdminCategoriesQueryData>({ queryKey: ['admin-categories'] }, (old) => {
        if (!old) {
          return old
        }

        return {
          ...old,
          data: old.data.map(item => (item.id === updated.id ? updated : item)),
        }
      })

      const { updates, category } = variables
      if (Object.prototype.hasOwnProperty.call(updates, 'is_hidden')) {
        toast.success(`${category.name} is now ${updates.is_hidden ? 'hidden' : 'visible'} on the site.`)
      }
      else if (Object.prototype.hasOwnProperty.call(updates, 'is_main_category')) {
        toast.success(`${category.name} ${updates.is_main_category ? 'is now shown as a main category.' : 'is no longer marked as main.'}`)
      }
      else {
        toast.success('Category updated successfully.')
      }
    },
    onSettled: () => {
      setPendingMainId(null)
      setPendingHiddenId(null)
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
    },
  })

  const mutateCategory = mutation.mutate

  const handleToggleMain = useCallback((category: AdminCategoryRow, checked: boolean) => {
    mutateCategory({
      category,
      updates: { is_main_category: checked },
    })
  }, [mutateCategory])

  const handleToggleHidden = useCallback((category: AdminCategoryRow, checked: boolean) => {
    mutateCategory({
      category,
      updates: { is_hidden: checked },
    })
  }, [mutateCategory])

  const columns = useMemo(() => createCategoryColumns({
    onToggleMain: handleToggleMain,
    onToggleHidden: handleToggleHidden,
    isUpdatingMain: id => pendingMainId === id,
    isUpdatingHidden: id => pendingHiddenId === id,
  }), [handleToggleHidden, handleToggleMain, pendingHiddenId, pendingMainId])

  function handleSortChangeWithTranslation(column: string | null, order: 'asc' | 'desc' | null) {
    if (column === null || order === null) {
      handleSortChange(null, null)
      return
    }

    const columnMapping: Record<string, 'name' | 'slug' | 'display_order' | 'created_at' | 'updated_at' | 'active_markets_count'> = {
      name: 'name',
      active_markets_count: 'active_markets_count',
    }

    const dbFieldName = columnMapping[column] || column
    handleSortChange(dbFieldName, order)
  }

  return (
    <DataTable
      columns={columns}
      data={categories}
      totalCount={totalCount}
      searchPlaceholder="Search categories..."
      enableSelection={false}
      enablePagination
      enableColumnVisibility={false}
      isLoading={isLoading}
      error={error}
      onRetry={retry}
      emptyMessage="No categories found"
      emptyDescription="Once categories are synced they will appear here."
      search={search}
      onSearchChange={handleSearchChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={handleSortChangeWithTranslation}
      pageIndex={pageIndex}
      pageSize={pageSize}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
    />
  )
}
