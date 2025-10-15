import { notFound } from 'next/navigation'
import PublicProfileHeader from '@/app/(platform)/[username]/_components/PublicProfileHeader'
import PublicProfileStatsCards from '@/app/(platform)/[username]/_components/PublicProfileStatsCards'
import PublicProfileTabs from '@/app/(platform)/[username]/_components/PublicProfileTabs'
import { UserModel } from '@/lib/db/users'

interface Props {
  username: string
}

export default async function PublicProfileContent({ username }: Props) {
  const { data: profile } = await UserModel.getProfileByUsername(username)
  if (!profile) {
    notFound()
  }

  const stats = {
    positions_value: 0.00,
    profit_loss: 0.00,
    volume_traded: 3.50,
    markets_traded: 2,
  }

  return (
    <>
      <PublicProfileHeader profile={profile} />
      <PublicProfileStatsCards stats={stats} />
      <PublicProfileTabs userAddress={profile.address} />
    </>
  )
}
