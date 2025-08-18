'use client'

import { cn } from '@/lib/utils'

interface Props {
  activeTab: string
  onTabChange: (tab: string) => void
}

const menuItems = [
  { id: 'profile', label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'two-factor', label: 'Two-Factor Auth' },
  { id: 'export-key', label: 'Export Private Key' },
]

export default function SettingsSidebar({ activeTab, onTabChange }: Props) {
  return (
    <aside className="lg:sticky lg:top-28 lg:self-start">
      <nav className="grid gap-1">
        {menuItems.map(item => (
          <button
            type="button"
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              'w-full rounded-md px-4 py-3 text-left text-sm font-medium transition-colors',
              activeTab === item.id
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
