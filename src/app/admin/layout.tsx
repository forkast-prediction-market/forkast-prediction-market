import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { cookieToInitialState } from 'wagmi'
import AdminHeader from '@/app/admin/_components/AdminHeader'
import AdminSidebar from '@/app/admin/_components/AdminSidebar'
import { config } from '@/lib/appkit'
import { Providers } from '@/providers/Providers'

export const metadata: Metadata = {
  title: 'Admin',
}

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const initialState = cookieToInitialState(
    config,
    (await headers()).get('cookie'),
  )

  return (
    <Providers initialState={initialState}>
      <AdminHeader />
      <main className="container py-8">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:gap-16">
          <AdminSidebar />
          {children}
        </div>
      </main>
    </Providers>
  )
}
