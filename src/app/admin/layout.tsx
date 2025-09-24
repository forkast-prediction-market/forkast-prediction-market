import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/app/admin/_components/AdminSidebar'
import { UserModel } from '@/lib/db/users'

export const metadata: Metadata = {
  title: 'Admin',
}

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const user = await UserModel.getCurrentUser()
  if (!user || !user.isAdmin) {
    redirect('/')
  }

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
