import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { useDebounce } from './useDebounce'

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
  created_at: string
  search_text: string
}

interface UseAdminUsersParams {
  limit?: number
  search?: string
  sortBy?: 'username' | 'email' | 'address' | 'created_at'
  sortOrder?: 'asc' | 'desc'
  pageIndex?: number
}

interface AdminUsersResponse {
  data: AdminUserRow[]
  count: number
  totalCount: number
}

async function fetchAdminUsers(params: UseAdminUsersParams): Promise<AdminUsersResponse> {
  const { limit = 50, search, sortBy = 'created_at', sortOrder = 'desc', pageIndex = 0 } = params
  const offset = pageIndex * limit

  const searchParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    sortBy,
    sortOrder,
  })

  if (search && search.trim()) {
    searchParams.set('search', search.trim())
  }

  const response = await fetch(`/api/admin/users?${searchParams.toString()}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.statusText}`)
  }

  return response.json()
}

export function useAdminUsers(params: UseAdminUsersParams = {}) {
  const { limit = 50, search, sortBy = 'created_at', sortOrder = 'desc', pageIndex = 0 } = params

  // Debounce search to avoid excessive API calls
  const debouncedSearch = useDebounce(search, 300)

  const queryKey = useMemo(() => [
    'admin-users',
    { limit, search: debouncedSearch, sortBy, sortOrder, pageIndex },
  ], [limit, debouncedSearch, sortBy, sortOrder, pageIndex])

  const query = useQuery({
    queryKey,
    queryFn: () => fetchAdminUsers({
      limit,
      search: debouncedSearch,
      sortBy,
      sortOrder,
      pageIndex,
    }),
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  })

  const retry = useCallback(() => {
    query.refetch()
  }, [query])

  return {
    ...query,
    retry,
  }
}

// Hook for managing table state
export function useAdminUsersTable() {
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'username' | 'email' | 'address' | 'created_at'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { data, isLoading, error, retry } = useAdminUsers({
    limit: pageSize,
    search,
    sortBy,
    sortOrder,
    pageIndex,
  })

  const handleSearchChange = useCallback((newSearch: string) => {
    setSearch(newSearch)
    setPageIndex(0) // Reset to first page when searching
  }, [])

  const handleSortChange = useCallback((column: string | null, order: 'asc' | 'desc' | null) => {
    if (column === null || order === null) {
      setSortBy('created_at')
      setSortOrder('desc')
    }
    else {
      setSortBy(column as 'username' | 'email' | 'address' | 'created_at')
      setSortOrder(order)
    }
    setPageIndex(0) // Reset to first page when sorting changes
  }, [])

  const handlePageChange = useCallback((newPageIndex: number) => {
    setPageIndex(newPageIndex)
  }, [])

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setPageIndex(0) // Reset to first page when page size changes
  }, [])

  return {
    // Data
    users: data?.data || [],
    totalCount: data?.totalCount || 0,

    // Loading states
    isLoading,
    error: error?.message || null,
    retry,

    // Table state
    pageIndex,
    pageSize,
    search,
    sortBy,
    sortOrder,

    // State setters
    handleSearchChange,
    handleSortChange,
    handlePageChange,
    handlePageSizeChange,
  }
}
