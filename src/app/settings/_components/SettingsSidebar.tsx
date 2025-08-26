import type { User } from '@/types'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface Props {
  user: User
  activeTab: string
  onTabChange: (tab: string) => void
  isLoading?: boolean
}

const menuItems = [
  { id: 'profile', label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'two-factor', label: 'Two-Factor Auth' },
  { id: 'export-key', label: 'Export Private Key' },
]

export default function SettingsSidebar({ user, activeTab, onTabChange, isLoading = false }: Props) {
  return (
    <aside className="lg:sticky lg:top-28 lg:self-start">
      <nav className="grid gap-1">
        {menuItems.map(item => (
          <Button
            type="button"
            key={item.id}
            onClick={() => onTabChange(item.id)}
            variant={activeTab === item.id ? 'outline' : 'ghost'}
            className="justify-start text-muted-foreground"
            disabled={isLoading}
          >
            {item.label}
          </Button>
        ))}
        <Button
          variant="ghost"
          className="justify-start text-muted-foreground"
          disabled={isLoading}
          asChild
        >
          <Link href={user.username ? `/@${user.username}` : `/@${user.address}`}>See public profile</Link>
        </Button>
      </nav>
    </aside>
  )
}
