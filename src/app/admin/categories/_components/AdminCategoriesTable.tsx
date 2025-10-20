'use client'

import type { AdminCategoryRow } from '@/hooks/useAdminCategories'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { DataTable } from '@/app/admin/_components/DataTable'
import { updateCategoryAction } from '@/app/admin/categories/_actions/update-category'
import { createCategoryColumns } from '@/app/admin/categories/_components/columns'
import { useAdminCategoriesTable } from '@/hooks/useAdminCategories'

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
  const [pendingHideEventsId, setPendingHideEventsId] = useState<number | null>(null)

  const handleToggleMain = useCallback(async (category: AdminCategoryRow, checked: boolean) => {
    setPendingMainId(category.id)

    const result = await updateCategoryAction(category.id, {
      is_main_category: checked,
    })

    if (result.success) {
      toast.success(`${category.name} ${checked ? 'is now shown as a main category.' : 'is no longer marked as main.'}`)
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
    }
    else {
      toast.error(result.error || 'Failed to update category')
    }

    setPendingMainId(null)
  }, [queryClient])

  const handleToggleHidden = useCallback(async (category: AdminCategoryRow, checked: boolean) => {
    setPendingHiddenId(category.id)

    const result = await updateCategoryAction(category.id, {
      is_hidden: checked,
    })

    if (result.success) {
      toast.success(`${category.name} is now ${checked ? 'hidden' : 'visible'} on the site.`)
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
    }
    else {
      toast.error(result.error || 'Failed to update category')
    }

    setPendingHiddenId(null)
  }, [queryClient])

  const handleToggleHideEvents = useCallback(async (category: AdminCategoryRow, checked: boolean) => {
    setPendingHideEventsId(category.id)

    const result = await updateCategoryAction(category.id, {
      hide_events: checked,
    })

    if (result.success) {
      toast.success(`Events with category "${category.name}" are now ${checked ? 'hidden' : 'visible'} on the site.`)
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
    }
    else {
      toast.error(result.error || 'Failed to update category')
    }

    setPendingHideEventsId(null)
  }, [queryClient])

  const columns = useMemo(() => createCategoryColumns({
    onToggleMain: handleToggleMain,
    onToggleHidden: handleToggleHidden,
    onToggleHideEvents: handleToggleHideEvents,
    isUpdatingMain: id => pendingMainId === id,
    isUpdatingHidden: id => pendingHiddenId === id,
    isUpdatingHideEvents: id => pendingHideEventsId === id,
  }), [handleToggleHideEvents, handleToggleHidden, handleToggleMain, pendingHideEventsId, pendingHiddenId, pendingMainId])

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
