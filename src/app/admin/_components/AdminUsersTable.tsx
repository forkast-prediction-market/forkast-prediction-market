'use client'

import { useAdminUsersTable } from '@/hooks/useAdminUsers'
import { columns } from './columns'
import { ServerDataTable } from './server-data-table'

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

  return (
    <ServerDataTable
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
      onSortChange={handleSortChange}
      pageIndex={pageIndex}
      pageSize={pageSize}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
    />
  )
}
