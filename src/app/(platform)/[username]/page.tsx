'use cache'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PublicProfileHeader from '@/app/(platform)/[username]/_components/PublicProfileHeader'
import PublicProfileStatsCards from '@/app/(platform)/[username]/_components/PublicProfileStatsCards'
import PublicProfileTabs from '@/app/(platform)/[username]/_components/PublicProfileTabs'
import { UserRepository } from '@/lib/db/queries/user'
import { truncateAddress } from '@/lib/utils'

export async function generateMetadata({ params }: PageProps<'/[username]'>): Promise<Metadata> {
  const { username } = await params

  const isUsername = username.startsWith('@')
  const displayName = isUsername ? username : truncateAddress(username)

  return {
    title: `${displayName} - Profile`,
  }
}

export default async function ProfilePage({ params }: PageProps<'/[username]'>) {
  const { username } = await params
  const { data: profile } = await UserRepository.getProfileByUsername(username)
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
