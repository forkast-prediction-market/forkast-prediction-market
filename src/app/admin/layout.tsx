import type { Metadata } from 'next'
import { headers } from 'next/headers'
import AdminHeader from '@/app/admin/_components/AdminHeader'
import AdminSidebar from '@/app/admin/_components/AdminSidebar'
import { Providers } from '@/providers/Providers'

export const metadata: Metadata = {
  title: 'Admin',
}

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const headersData = await headers()
  const cookies = headersData.get('cookie')

  return (
    <Providers cookies={cookies}>
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
