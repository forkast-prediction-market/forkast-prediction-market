'use client'

import type { AdminCategoryRow } from '@/hooks/useAdminCategories'
import { useCallback, useMemo } from 'react'
import { DataTable } from '@/app/admin/_components/DataTable'
import { updateCategoryAction } from '@/app/admin/categories/_actions/update-category'
import { createCategoryColumns } from '@/app/admin/categories/_components/columns'
import { useCategoryActionState } from '@/hooks/useActionState'
import { useAdminCategoriesTable } from '@/hooks/useAdminCategories'

export default function AdminCategoriesTable() {
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

  const { executeToggleAction, isPending } = useCategoryActionState()

  const handleToggleMain = useCallback(async (category: AdminCategoryRow, checked: boolean) => {
    await executeToggleAction(
      category,
      { is_main_category: checked },
      () => updateCategoryAction({
        id: category.id,
        is_main_category: checked,
      }),
    )
  }, [executeToggleAction])

  const handleToggleHidden = useCallback(async (category: AdminCategoryRow, checked: boolean) => {
    await executeToggleAction(
      category,
      { is_hidden: checked },
      () => updateCategoryAction({
        id: category.id,
        is_hidden: checked,
      }),
    )
  }, [executeToggleAction])

  const columns = useMemo(() => createCategoryColumns({
    onToggleMain: handleToggleMain,
    onToggleHidden: handleToggleHidden,
    isUpdatingMain: (id: number) => isPending(id),
    isUpdatingHidden: (id: number) => isPending(id),
  }), [handleToggleHidden, handleToggleMain, isPending])

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
