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
        <div className="flex min-w-[200px] items-start gap-3">
          <Image
            src={user.avatarUrl}
            alt={user.username ?? user.address}
            width={40}
            height={40}
            className="flex-shrink-0 rounded-full"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <a
              href={user.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground hover:text-primary"
            >
              <span className="inline-flex flex-wrap items-center gap-2">
                <span className="truncate">{user.username ?? formatAddress(user.address)}</span>
                {user.is_admin && <Badge variant="outline">Admin</Badge>}
              </span>
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
        <div className="min-w-[80px] text-xs text-muted-foreground">
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
        <div className="min-w-[100px]">
          {user.referred_by_display
            ? (
                <a
                  href={user.referred_by_profile_url ?? '#'}
                  target={user.referred_by_profile_url ? '_blank' : undefined}
                  rel={user.referred_by_profile_url ? 'noreferrer' : undefined}
                  className="block touch-manipulation truncate text-xs font-medium text-foreground hover:text-primary"
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
        <div className="min-w-[100px] text-right text-xs text-muted-foreground">
          {user.created_label}
        </div>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = new Date(rowA.original.created_at).getTime()
      const b = new Date(rowB.original.created_at).getTime()
      return a - b
    },
  },
]
