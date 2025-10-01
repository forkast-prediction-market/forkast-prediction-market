import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isAdminWallet } from '@/lib/admin'
import { UserModel } from '@/lib/db/users'
import { truncateAddress } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin status
    const currentUser = await UserModel.getCurrentUser()
    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '50'), 100) // Cap at 100
    const offset = Math.max(Number.parseInt(searchParams.get('offset') || '0'), 0)
    const search = searchParams.get('search') || undefined
    const sortBy = (searchParams.get('sortBy') as 'username' | 'email' | 'address' | 'created_at') || 'created_at'
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'

    // Validate sortBy parameter
    const validSortFields = ['username', 'email', 'address', 'created_at']
    if (!validSortFields.includes(sortBy)) {
      return NextResponse.json({ error: 'Invalid sortBy parameter' }, { status: 400 })
    }

    // Fetch users with server-side filtering, sorting, and pagination
    const { data, count, error } = await UserModel.listUsers({
      limit,
      offset,
      search,
      sortBy,
      sortOrder,
    })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Get referred users data for referral display
    const referredIds = Array.from(new Set((data ?? [])
      .map(user => user.referred_by_user_id)
      .filter((id): id is string => Boolean(id))))

    const { data: referredUsers } = await UserModel.getUsersByIds(referredIds)
    const referredMap = new Map<string, { username?: string | null, address: string, image?: string | null }>(
      (referredUsers ?? []).map(referred => [referred.id, referred]),
    )

    const baseProfileUrl = (() => {
      const raw = process.env.NEXT_PUBLIC_SITE_URL!
      return raw.startsWith('http') ? raw : `https://${raw}`
    })()

    // Transform data for frontend consumption
    const transformedUsers = (data ?? []).map((user) => {
      const created = new Date(user.created_at)
      const createdLabel = Number.isNaN(created.getTime())
        ? '—'
        : created.toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          })

      const profilePath = user.username ?? user.address
      const avatarSource = user.image || `https://avatar.vercel.sh/${profilePath}.png`

      const referredSource = user.referred_by_user_id
        ? referredMap.get(user.referred_by_user_id)
        : undefined
      let referredDisplay: string | null = null
      let referredProfile: string | null = null

      if (user.referred_by_user_id) {
        const referredPath = referredSource?.username ?? referredSource?.address ?? user.referred_by_user_id
        referredDisplay = referredSource?.username ?? truncateAddress(referredSource?.address ?? user.referred_by_user_id)
        referredProfile = `${baseProfileUrl}/${referredPath}`
      }

      // Generate search text for client-side reference (though search is now server-side)
      const searchText = [
        user.username,
        user.email,
        user.address,
        referredDisplay,
      ].filter(Boolean).join(' ').toLowerCase()

      return {
        ...user,
        is_admin: isAdminWallet(user.address),
        avatarUrl: avatarSource,
        referred_by_display: referredDisplay,
        referred_by_profile_url: referredProfile,
        created_label: createdLabel,
        profileUrl: `${baseProfileUrl}/${profilePath}`,
        created_at: user.created_at, // Raw ISO date for proper sorting
        search_text: searchText, // Computed field for reference
      }
    })

    return NextResponse.json({
      data: transformedUsers,
      count: count || 0,
      totalCount: count || 0,
    })
  }
  catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
