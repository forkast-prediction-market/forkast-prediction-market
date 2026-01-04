'use cache'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PublicProfileHeroCards from '@/app/(platform)/[username]/_components/PublicProfileHeroCards'
import PublicProfileTabs from '@/app/(platform)/[username]/_components/PublicProfileTabs'
import { UserRepository } from '@/lib/db/queries/user'
import { truncateAddress } from '@/lib/formatters'
import { fetchPortfolioSnapshot } from '@/lib/portfolio'

export async function generateMetadata({ params }: PageProps<'/[username]'>): Promise<Metadata> {
  const { username } = await params

  const isUsername = !username.startsWith('0x')
  const displayName = isUsername ? username : truncateAddress(username)

  return {
    title: `${displayName} - Profile`,
  }
}

export default async function ProfilePage({ params }: PageProps<'/[username]'>) {
  const { username } = await params
  const { data: profile } = await UserRepository.getProfileByUsernameOrProxyAddress(username)
  if (!profile) {
    notFound()
  }

  const userAddress = profile.proxy_wallet_address!
  const snapshot = await fetchPortfolioSnapshot(userAddress)

  return (
    <>
      <PublicProfileHeroCards
        profile={{
          username: profile.username,
          avatarUrl: profile.image,
          joinedAt: profile.created_at?.toString(),
          portfolioAddress: userAddress,
        }}
        snapshot={snapshot}
      />
      <PublicProfileTabs userAddress={userAddress} />
    </>
  )
}
