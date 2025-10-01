'use client'

import type { Table } from '@tanstack/react-table'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableViewOptions } from './data-table-view-options'

interface ServerDataTableToolbarProps<TData> {
  table: Table<TData>
  search: string
  onSearchChange: (search: string) => void
  searchPlaceholder?: string
  enableColumnVisibility?: boolean
  enableSelection?: boolean
  isLoading?: boolean
}

export function ServerDataTableToolbar<TData>({
  table,
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  enableColumnVisibility = true,
  enableSelection = false,
  isLoading = false,
}: ServerDataTableToolbarProps<TData>) {
  const isFiltered = search.length > 0
  const selectedRowsCount = table.getFilteredSelectedRowModel().rows.length

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChange={event => onSearchChange(event.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
          disabled={isLoading}
        />
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => onSearchChange('')}
            className="h-8 px-2 lg:px-3"
            disabled={isLoading}
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center space-x-2">
        {enableSelection && selectedRowsCount > 0 && (
          <div className="flex-1 text-sm text-muted-foreground">
            {selectedRowsCount}
            {' '}
            of
            {' '}
            {table.getFilteredRowModel().rows.length}
            {' '}
            row(s) selected.
          </div>
        )}
        {enableColumnVisibility && <DataTableViewOptions table={table} />}
      </div>
    </div>
  )
}
