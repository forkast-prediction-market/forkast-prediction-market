'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, MailIcon } from 'lucide-react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

interface AdminUserRow {
  id: string
  username?: string | null
  email: string
  address: string
  created_label: string
  affiliate_code?: string | null
  referred_by_display?: string | null
  referred_by_profile_url?: string | null
  is_admin: boolean
  avatarUrl: string
  profileUrl: string
  // Enhanced fields for TanStack Table functionality
  created_at: string // Raw ISO date for proper sorting
  search_text: string // Computed field for global search across username, email, and address
}

function formatAddress(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-6)}`
}

export const columns: ColumnDef<AdminUserRow>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected()
          || (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={value => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40, // Fixed width for checkbox column
  },
  {
    accessorKey: 'username',
    id: 'user',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 text-xs font-medium text-muted-foreground uppercase hover:text-foreground"
        >
          User
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className="flex min-w-0 items-start gap-3">
          <Image
            src={user.avatarUrl}
            alt={user.username ?? user.address}
            width={32}
            height={32}
            className="flex-shrink-0 rounded-full sm:h-10 sm:w-10"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <a
              href={user.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground hover:text-primary"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                <span className="truncate text-sm">{user.username ?? formatAddress(user.address)}</span>
                {user.is_admin && <Badge variant="outline" className="w-fit text-xs">Admin</Badge>}
              </div>
            </a>
          </div>
        </div>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.username ?? rowA.original.address
      const b = rowB.original.username ?? rowB.original.address
      return a.localeCompare(b)
    },
    enableHiding: false, // User column should always be visible
    minSize: 200, // Minimum width for user column
  },
  {
    accessorKey: 'email',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 text-xs font-medium text-muted-foreground uppercase hover:text-foreground"
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className="min-w-0 text-xs text-muted-foreground">
          {user.email
            ? (
                <a
                  href={`mailto:${user.email}`}
                  className="inline-flex touch-manipulation items-center gap-1 text-muted-foreground hover:text-primary"
                >
                  <MailIcon className="size-4 flex-shrink-0" />
                  <span className="sr-only">
                    Email
                    {user.email}
                  </span>
                </a>
              )
            : (
                <span className="italic">hidden</span>
              )}
        </div>
      )
    },
    size: 80, // Fixed width for email column
  },
  {
    accessorKey: 'referred_by_display',
    id: 'referral',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 text-xs font-medium text-muted-foreground uppercase hover:text-foreground"
        >
          Referral
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className="min-w-0">
          {user.referred_by_display
            ? (
                <a
                  href={user.referred_by_profile_url ?? '#'}
                  target={user.referred_by_profile_url ? '_blank' : undefined}
                  rel={user.referred_by_profile_url ? 'noreferrer' : undefined}
                  className={`
                    block max-w-[120px] touch-manipulation truncate text-xs font-medium text-foreground
                    hover:text-primary
                    sm:max-w-none
                  `}
                >
                  {user.referred_by_display}
                </a>
              )
            : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
        </div>
      )
    },
    size: 120, // Fixed width for referral column
  },
  {
    accessorKey: 'created_at',
    id: 'created',
    header: ({ column }) => {
      return (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 text-xs font-medium text-muted-foreground uppercase hover:text-foreground"
          >
            Created
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )
    },
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className="text-right text-xs whitespace-nowrap text-muted-foreground">
          {user.created_label}
        </div>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = new Date(rowA.original.created_at).getTime()
      const b = new Date(rowB.original.created_at).getTime()
      return a - b
    },
    size: 100, // Fixed width for created date column
  },
]
