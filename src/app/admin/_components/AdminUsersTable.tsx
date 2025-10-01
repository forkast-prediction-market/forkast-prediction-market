import { columns } from './columns'
import { DataTable } from './data-table'

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

interface AdminUsersTableProps {
  users: AdminUserRow[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}

export default function AdminUsersTable({
  users,
  isLoading = false,
  error = null,
  onRetry,
}: AdminUsersTableProps) {
  return (
    <DataTable
      columns={columns}
      data={users}
      searchKey="search_text"
      searchPlaceholder="Search users..."
      enableSelection={true}
      enablePagination={true}
      enableColumnVisibility={true}
      storageKey="admin-users-table"
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
    />
  )
}
