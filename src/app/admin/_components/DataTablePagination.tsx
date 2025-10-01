import type { Table } from '@tanstack/react-table'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  totalCount?: number
  onPageChange?: (pageIndex: number) => void
  onPageSizeChange?: (pageSize: number) => void
}

export function DataTablePagination<TData>({
  table,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: DataTablePaginationProps<TData>) {
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const pageCount = table.getPageCount()
  const isServerSide = totalCount !== undefined

  function handlePageChange(newPageIndex: number) {
    if (onPageChange) {
      onPageChange(newPageIndex)
    }
    else {
      table.setPageIndex(newPageIndex)
    }
  }

  function handlePageSizeChange(newPageSize: string) {
    const size = Number.parseInt(newPageSize)
    if (onPageSizeChange) {
      onPageSizeChange(size)
    }
    else {
      table.setPageSize(size)
    }
  }

  const canPreviousPage = pageIndex > 0
  const canNextPage = pageIndex < pageCount - 1

  return (
    <div className="flex flex-col space-y-2 px-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
      <div className={`
        flex flex-col space-y-1 text-sm text-muted-foreground
        sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4
      `}
      >
        <div>
          {table.getFilteredSelectedRowModel().rows.length}
          {' '}
          of
          {' '}
          {isServerSide ? totalCount : table.getFilteredRowModel().rows.length}
          {' '}
          row(s) selected.
        </div>
        {isServerSide && (
          <div>
            Showing
            {' '}
            {totalCount ? pageIndex * pageSize + 1 : 0}
            {' '}
            to
            {' '}
            {Math.min((pageIndex + 1) * pageSize, totalCount!)}
            {' '}
            of
            {' '}
            {totalCount}
            {' '}
            entries.
          </div>
        )}
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${pageSize}`}
            onValueChange={handlePageSizeChange}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 25, 50, 100].map(size => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium whitespace-nowrap">
          Page
          {' '}
          {pageIndex + 1}
          {' '}
          of
          {' '}
          {pageCount}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => handlePageChange(0)}
            disabled={!canPreviousPage}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => handlePageChange(pageIndex - 1)}
            disabled={!canPreviousPage}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => handlePageChange(pageIndex + 1)}
            disabled={!canNextPage}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => handlePageChange(pageCount - 1)}
            disabled={!canNextPage}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
