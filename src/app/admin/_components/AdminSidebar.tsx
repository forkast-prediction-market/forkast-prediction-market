'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface AdminMenuItem {
  id: string
  label: string
  href: Route
}

const adminMenuItems: AdminMenuItem[] = [
  { id: 'affiliate', label: 'Affiliate Settings', href: '/admin/affiliate' },
]

export default function AdminSidebar() {
  const segment = useSelectedLayoutSegment()
  const active = segment ?? 'affiliate'

  return (
    <aside className="lg:sticky lg:top-28 lg:self-start">
      <nav className="grid gap-1">
        {adminMenuItems.map(item => (
          <Button
            key={item.id}
            type="button"
            variant={active === item.id ? 'outline' : 'ghost'}
            className="justify-start text-muted-foreground"
            asChild
          >
            <Link href={item.href}>{item.label}</Link>
          </Button>
        ))}
      </nav>
    </aside>
  )
}
