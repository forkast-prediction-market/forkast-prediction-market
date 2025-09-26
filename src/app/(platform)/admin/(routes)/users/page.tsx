import { redirect } from 'next/navigation'
import AdminUsersTable from '@/app/(platform)/admin/_components/AdminUsersTable'
import { isAdminWallet } from '@/lib/admin'
import { UserModel } from '@/lib/db/users'
import { truncateAddress } from '@/lib/utils'

export default async function AdminUsersPage() {
  const currentUser = await UserModel.getCurrentUser()
  if (!currentUser || !currentUser.is_admin) {
    redirect('/')
  }

  const { data, count } = await UserModel.listUsers(100)
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

  const users = (data ?? []).map((user) => {
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

    return {
      ...user,
      is_admin: isAdminWallet(user.address),
      avatarUrl: avatarSource,
      referred_by_display: referredDisplay,
      referred_by_profile_url: referredProfile,
      created_label: createdLabel,
      profileUrl: `${baseProfileUrl}/${profilePath}`,
    }
  })

  return (
    <div className="space-y-8">
      <section className="grid gap-4">
        <div className="grid gap-2">
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Showing
            {' '}
            {users.length}
            {' '}
            of
            {' '}
            {count ?? users.length}
            {' '}
            total accounts.
          </p>
        </div>
        <AdminUsersTable users={users} />
      </section>

    </div>
  )
}
