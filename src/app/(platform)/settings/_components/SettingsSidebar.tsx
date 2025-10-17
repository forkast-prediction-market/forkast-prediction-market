import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface SettingsSidebarProps {
  tab: string
}

const menuItems = [
  { id: 'profile', label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'affiliate', label: 'Affiliate' },
  { id: 'two-factor', label: 'Two-Factor Auth' },
  { id: 'export-key', label: 'Export Private Key' },
]

export default function SettingsSidebar({ tab }: SettingsSidebarProps) {
  return (
    <aside className="lg:sticky lg:top-28 lg:self-start">
      <nav className="grid gap-1">
        {menuItems.map(item => (
          <Button
            type="button"
            key={item.id}
            variant={tab === item.id ? 'outline' : 'ghost'}
            className="justify-start text-muted-foreground"
            asChild
          >
            <Link href={`/settings?tab=${item.id}`}>{item.label}</Link>
          </Button>
        ))}
      </nav>
    </aside>
  )
}
