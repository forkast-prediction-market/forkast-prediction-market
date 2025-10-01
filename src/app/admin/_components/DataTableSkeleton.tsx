'use client'

import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface DataTableSkeletonProps {
  columnCount?: number
  rowCount?: number
  searchable?: boolean
  showPagination?: boolean
}

export function DataTableSkeleton({
  columnCount = 5,
  rowCount = 10,
  searchable = true,
  showPagination = true,
}: DataTableSkeletonProps) {
  return (
    <div className="space-y-4">
      {/* Toolbar skeleton */}
      {searchable && (
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center space-x-2">
            <Skeleton className="h-8 w-[250px]" />
            <Skeleton className="h-8 w-[70px]" />
          </div>
          <Skeleton className="h-8 w-[70px]" />
        </div>
      )}

      {/* Table skeleton */}
      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              {Array.from({ length: columnCount }).map((_, i) => (
                <TableHead key={`skeleton-col-${i + 1}`} className="whitespace-nowrap">
                  <Skeleton className="h-4 w-[80px]" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <TableRow key={`row-${rowIndex + 1}`}>
                {Array.from({ length: columnCount }).map((_, cellIndex) => (
                  <TableCell key={`cell-${cellIndex + 1}`} className="whitespace-nowrap">
                    {cellIndex === 0
                      ? <Skeleton className="h-4 w-4" />
                      : cellIndex === 1
                        ? (
                            <div className="flex min-w-[200px] items-start gap-3">
                              <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full" />
                              <div className="flex min-w-0 flex-col gap-1">
                                <Skeleton className="h-4 w-[120px]" />
                                <Skeleton className="h-3 w-[60px]" />
                              </div>
                            </div>
                          )
                        : cellIndex === 2
                          ? (
                              <div className="min-w-[80px]">
                                <Skeleton className="h-4 w-4" />
                              </div>
                            )
                          : cellIndex === 3
                            ? (
                                <div className="min-w-[100px]">
                                  <Skeleton className="h-4 w-[80px]" />
                                </div>
                              )
                            : (
                                <div className="min-w-[100px] text-right">
                                  <Skeleton className="ml-auto h-4 w-[80px]" />
                                </div>
                              )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination skeleton */}
      {showPagination && (
        <div className="flex items-center justify-between px-2">
          <div className="flex-1 text-sm text-muted-foreground">
            <Skeleton className="h-4 w-[100px]" />
          </div>
          <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-8 w-[70px]" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-[100px]" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
