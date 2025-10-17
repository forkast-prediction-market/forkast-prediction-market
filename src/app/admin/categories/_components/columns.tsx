import type { ColumnDef } from '@tanstack/react-table'
import type { AdminCategoryRow } from '@/hooks/useAdminCategories'
import { ArrowUpDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

interface CategoryColumnOptions {
  onToggleMain: (category: AdminCategoryRow, nextValue: boolean) => void
  onToggleHidden: (category: AdminCategoryRow, nextValue: boolean) => void
  isUpdatingMain: (categoryId: number) => boolean
  isUpdatingHidden: (categoryId: number) => boolean
}

export function createCategoryColumns({
  onToggleMain,
  onToggleHidden,
  isUpdatingMain,
  isUpdatingHidden,
}: CategoryColumnOptions): ColumnDef<AdminCategoryRow>[] {
  return [
    {
      accessorKey: 'name',
      id: 'name',
      header: ({ column }) => (
        <Button
          type="button"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 text-xs font-medium text-muted-foreground uppercase hover:text-foreground"
        >
          Category
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const category = row.original
        return (
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{category.name}</span>
              {category.is_hidden && (
                <Badge variant="outline" className="text-xs">
                  Hidden
                </Badge>
              )}
              {category.is_main_category && (
                <Badge variant="secondary" className="text-xs">
                  Main
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              slug:
              {' '}
              {category.slug}
            </p>
            <p className="text-xs text-muted-foreground">
              {category.parent_name
                ? (
                    <>
                      Parent:
                      {' '}
                      {category.parent_name}
                    </>
                  )
                : (
                    <>No parent</>
                  )}
            </p>
          </div>
        )
      },
      enableHiding: false,
    },
    {
      accessorKey: 'active_markets_count',
      id: 'active_markets_count',
      header: ({ column }) => (
        <Button
          type="button"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 text-xs font-medium text-muted-foreground uppercase hover:text-foreground"
        >
          Active Markets
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground">
          {row.original.active_markets_count}
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: 'is_main_category',
      id: 'is_main_category',
      header: () => (
        <div className="text-center text-xs font-medium text-muted-foreground uppercase">
          Main Category
        </div>
      ),
      cell: ({ row }) => {
        const category = row.original
        const disabled = isUpdatingMain(category.id)
        return (
          <div className="text-center">
            <Switch
              id={`main-${category.id}`}
              checked={category.is_main_category}
              disabled={disabled}
              onCheckedChange={(checked) => {
                onToggleMain(category, checked)
              }}
            />
            <span className="sr-only">
              Toggle main category for
              {' '}
              {category.name}
            </span>
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'is_hidden',
      id: 'is_hidden',
      header: () => (
        <div className="text-center text-xs font-medium text-muted-foreground uppercase">
          Hide
        </div>
      ),
      cell: ({ row }) => {
        const category = row.original
        const disabled = isUpdatingHidden(category.id)
        return (
          <div className="text-center">
            <Switch
              id={`hide-${category.id}`}
              checked={category.is_hidden}
              disabled={disabled}
              onCheckedChange={(checked) => {
                onToggleHidden(category, checked)
              }}
            />
            <span className="sr-only">
              Toggle hide for
              {' '}
              {category.name}
            </span>
          </div>
        )
      },
      enableSorting: false,
    },
  ]
}
