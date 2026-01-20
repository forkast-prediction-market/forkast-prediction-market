import type { Metadata } from 'next'
import AdminHeader from '@/app/admin/_components/AdminHeader'
import AdminSidebar from '@/app/admin/_components/AdminSidebar'
import { AppProviders } from '@/providers/AppProviders'

export const metadata: Metadata = {
  title: 'Admin',
}

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <AppProviders>
      <AdminHeader />
      <main className="container py-8">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:gap-16">
          <AdminSidebar />
          <div className="space-y-8">
            {children}
          </div>
        </div>
      </main>
    </AppProviders>
  )
}
