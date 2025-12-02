'use cache'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PublicProfileHeader from '@/app/(platform)/[username]/_components/PublicProfileHeader'
import PublicProfileStatsCards from '@/app/(platform)/[username]/_components/PublicProfileStatsCards'
import PublicProfileTabs from '@/app/(platform)/[username]/_components/PublicProfileTabs'
import { UserRepository } from '@/lib/db/queries/user'
import { truncateAddress } from '@/lib/formatters'

const DATA_API_URL = process.env.DATA_URL!

async function fetchPortfolioValue(userAddress?: string | null): Promise<number> {
  if (!userAddress) {
    return 0
  }

  try {
    const response = await fetch(`${DATA_API_URL}/value?user=${encodeURIComponent(userAddress)}`)

    if (!response.ok) {
      return 0
    }

    const body = await response.json()
    const parsed = typeof body.value === 'string' ? Number.parseFloat(body.value) : Number(body.value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  catch (error) {
    console.error('Failed to fetch portfolio value', error)
    return 0
  }
}

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

  const portfolioValue = await fetchPortfolioValue(profile.proxy_wallet_address)

  const stats = {
    positions_value: portfolioValue,
    profit_loss: 0.00,
    volume_traded: 3.50,
    markets_traded: 2,
  }

  return (
    <>
      <PublicProfileHeader profile={profile} />
      <PublicProfileStatsCards stats={stats} />
      <PublicProfileTabs userAddress={profile.proxy_wallet_address!} />
    </>
  )
}
