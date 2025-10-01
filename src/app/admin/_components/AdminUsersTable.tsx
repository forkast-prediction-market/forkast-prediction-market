'use client'

import { useAdminUsersTable } from '@/hooks/useAdminUsers'
import { columns } from './columns'
import { DataTable } from './DataTable'

export default function AdminUsersTable() {
  const {
    users,
    totalCount,
    isLoading,
    error,
    retry,
    pageIndex,
    pageSize,
    search,
    sortBy,
    sortOrder,
    handleSearchChange,
    handleSortChange,
    handlePageChange,
    handlePageSizeChange,
  } = useAdminUsersTable()

  function handleSortChangeWithTranslation(column: string | null, order: 'asc' | 'desc' | null) {
    if (column === null || order === null) {
      handleSortChange(null, null)
      return
    }

    const columnMapping: Record<string, string> = {
      user: 'username',
      email: 'email',
      created: 'created_at',
    }

    const dbFieldName = columnMapping[column] || column
    handleSortChange(dbFieldName, order)
  }

  return (
    <DataTable
      columns={columns}
      data={users}
      totalCount={totalCount}
      searchPlaceholder="Search users..."
      enableSelection={true}
      enablePagination={true}
      enableColumnVisibility={true}
      isLoading={isLoading}
      error={error}
      onRetry={retry}
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
