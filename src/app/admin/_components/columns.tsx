'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, MailIcon } from 'lucide-react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

interface AdminUserRow {
  id: string
  username: string
  email: string
  address: string
  proxy_wallet_address?: string | null
  created_label: string
  affiliate_code?: string | null
  referred_by_display?: string | null
  referred_by_profile_url?: string | null
  is_admin: boolean
  avatarUrl: string
  profileUrl: string
  created_at: string
  search_text: string
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
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className="flex min-w-44 items-center gap-2">
          <Image
            src={user.avatarUrl}
            alt={user.username}
            width={28}
            height={28}
            className="flex-shrink-0 rounded-full sm:size-8"
          />
          <div className="min-w-44 flex-1">
            <a
              href={user.profileUrl}
              target="_blank"
              className="flex items-center gap-1 font-medium text-foreground hover:text-primary"
            >
              <span>
                {user.username}
              </span>
              {user.is_admin && <Badge variant="outline" className="mt-1 text-xs">Admin</Badge>}
            </a>
          </div>
        </div>
      )
    },
    enableHiding: false,
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
          <ArrowUpDown className="ml-2 size-4" />
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
  },
  {
    accessorKey: 'referred_by_display',
    id: 'referral',
    header: () => {
      return (
        <div className="h-auto p-0 text-xs font-medium text-muted-foreground uppercase">
          Referral
        </div>
      )
    },
    enableSorting: false, // Disable sorting since this is a computed field not available in the database
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
                    block max-w-[60px] touch-manipulation truncate text-xs font-medium text-foreground
                    hover:text-primary
                    sm:max-w-[100px]
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
            <ArrowUpDown className="ml-2 size-4" />
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
  },
]
