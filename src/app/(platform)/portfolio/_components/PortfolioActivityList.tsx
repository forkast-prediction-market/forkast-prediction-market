import type { User } from '@/types'
import PublicActivityList from '@/app/(platform)/[username]/_components/PublicActivityList'

interface PortfolioActivityListProps {
  user: User
}

export default function PortfolioActivityList({ user }: PortfolioActivityListProps) {
  return <PublicActivityList userAddress={user.address} />
}
