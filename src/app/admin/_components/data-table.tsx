'use client'

import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import * as React from 'react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { useLocalStorage } from '@/hooks/useLocalStorage'
import { DataTablePagination } from './data-table-pagination'
import { DataTableSkeleton } from './data-table-skeleton'
import { DataTableToolbar } from './data-table-toolbar'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  enableSelection?: boolean
  enablePagination?: boolean
  enableColumnVisibility?: boolean
  storageKey?: string // Key for localStorage persistence
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  enableSelection = false,
  enablePagination = true,
  enableColumnVisibility = true,
  storageKey,
  isLoading = false,
  error = null,
  onRetry,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState('')

  // Use localStorage for column visibility if storageKey is provided
  const [columnVisibility, setColumnVisibility] = storageKey
    ? useLocalStorage<VisibilityState>(`${storageKey}-column-visibility`, {})
    : React.useState<VisibilityState>({})

  // Use localStorage for page size if storageKey is provided
  const [pageSize, setPageSize] = storageKey && enablePagination
    ? useLocalStorage<number>(`${storageKey}-page-size`, 25)
    : React.useState<number>(25)

  // Ensure always-visible columns remain visible
  React.useEffect(() => {
    if (storageKey && enableColumnVisibility) {
      const alwaysVisibleColumns = columns
        .filter(col => col.enableHiding === false)
        .map(col => col.id)
        .filter(Boolean) as string[]

      if (alwaysVisibleColumns.length > 0) {
        const currentVisibility = Array.isArray(columnVisibility) ? columnVisibility[0] : columnVisibility
        const updatedVisibility = { ...currentVisibility }
        let hasChanges = false

        alwaysVisibleColumns.forEach((columnId) => {
          if (updatedVisibility[columnId] === false) {
            updatedVisibility[columnId] = true
            hasChanges = true
          }
        })

        if (hasChanges) {
          const setVisibility = Array.isArray(columnVisibility) ? columnVisibility[1] : setColumnVisibility
          setVisibility(updatedVisibility)
        }
      }
    }
  }, [columns, storageKey, enableColumnVisibility, columnVisibility])

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: Array.isArray(columnVisibility) ? columnVisibility[1] : setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: searchKey
      ? (row, columnId, filterValue) => {
          const searchValue = String(filterValue).toLowerCase()
          const searchText = String(row.getValue(searchKey) || '').toLowerCase()
          return searchText.includes(searchValue)
        }
      : undefined,
    initialState: enablePagination
      ? {
          pagination: {
            pageSize: Array.isArray(pageSize) ? pageSize[0] : pageSize,
          },
        }
      : undefined,
    state: {
      sorting,
      columnFilters,
      columnVisibility: Array.isArray(columnVisibility) ? columnVisibility[0] : columnVisibility,
      rowSelection,
      globalFilter,
    },
  })

  // Handle page size changes and persist to localStorage
  React.useEffect(() => {
    if (enablePagination && storageKey) {
      const currentPageSize = table.getState().pagination.pageSize
      const storedPageSize = Array.isArray(pageSize) ? pageSize[0] : pageSize

      if (currentPageSize !== storedPageSize) {
        const setStoredPageSize = Array.isArray(pageSize) ? pageSize[1] : setPageSize
        setStoredPageSize(currentPageSize)
      }
    }
  }, [table.getState().pagination.pageSize, enablePagination, storageKey, pageSize])

  // Show loading skeleton while data is loading
  if (isLoading) {
    return (
      <DataTableSkeleton
        columnCount={columns.length}
        rowCount={10}
        searchable={!!searchKey}
        showPagination={enablePagination}
      />
    )
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="space-y-4">
        {searchKey && (
          <DataTableToolbar
            table={table}
            searchKey={searchKey}
            searchPlaceholder={searchPlaceholder}
            enableColumnVisibility={enableColumnVisibility}
            enableSelection={enableSelection}
          />
        )}
        <div className="rounded-md border">
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <div className="mb-4 text-muted-foreground">
              <svg
                className="mx-auto h-12 w-12 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-medium text-foreground">Something went wrong</h3>
            <p className="mb-4 text-sm text-muted-foreground">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className={`
                  inline-flex items-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium
                  text-white shadow-sm
                  hover:bg-primary/90
                  focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none
                `}
              >
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        searchKey={searchKey}
        searchPlaceholder={searchPlaceholder}
        enableColumnVisibility={enableColumnVisibility}
        enableSelection={enableSelection}
      />
      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-full">
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan} className="whitespace-nowrap">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="whitespace-nowrap">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {data.length === 0 ? (
                    // Empty state - no data at all
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="mb-2 text-muted-foreground">
                        <svg
                          className="mx-auto h-8 w-8"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </div>
                      <h3 className="mb-1 text-sm font-medium text-foreground">No users found</h3>
                      <p className="text-xs text-muted-foreground">There are no users in the system yet.</p>
                    </div>
                  ) : (
                    // No results state - data exists but filtered out
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="mb-2 text-muted-foreground">
                        <svg
                          className="mx-auto h-8 w-8"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                      </div>
                      <h3 className="mb-1 text-sm font-medium text-foreground">No results found</h3>
                      <p className="text-xs text-muted-foreground">
                        Try adjusting your search or filter to find what you're looking for.
                      </p>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {enablePagination && <DataTablePagination table={table} />}
    </div>
  )
}
