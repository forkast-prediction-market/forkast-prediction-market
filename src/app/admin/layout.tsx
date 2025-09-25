import type { Metadata } from 'next'
import AdminSidebar from '@/app/admin/_components/AdminSidebar'

export const metadata: Metadata = {
  title: 'Admin',
}

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <main className="container py-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:gap-16">
          <AdminSidebar />
          <div className="space-y-8">
            {children}
          </div>
        </div>
      </div>
    </main>
  )
}
