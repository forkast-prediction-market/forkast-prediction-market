import type { Metadata } from 'next'
import PortfolioContent from '@/app/(platform)/portfolio/_components/PortfolioContent'
import { UserRepository } from '@/lib/db/queries/user'

export const metadata: Metadata = {
  title: 'Portfolio',
}

export default async function PortfolioPage() {
  const user = await UserRepository.getCurrentUser()

  return <PortfolioContent user={user} />
}
