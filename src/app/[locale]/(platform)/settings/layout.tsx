import type { Metadata } from 'next'
import { Suspense } from 'react'
import SettingsSidebar from '@/app/[locale]/(platform)/settings/_components/SettingsSidebar'

export const metadata: Metadata = {
  title: 'Settings',
}

export default async function SettingsLayout({ children }: LayoutProps<'/[locale]/settings'>) {
  return (
    <main className="container py-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:gap-16">
          <Suspense fallback={null}>
            <SettingsSidebar />
          </Suspense>
          {children}
        </div>
      </div>
    </main>
  )
}
