import { redirect } from 'next/navigation'
import AdminCategoriesTable from '@/app/admin/categories/_components/AdminCategoriesTable'
import { UserModel } from '@/lib/db/users'

export default async function AdminCategoriesPage() {
  const currentUser = await UserModel.getCurrentUser()
  if (!currentUser || !currentUser.is_admin) {
    redirect('/')
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4">
        <div className="grid gap-2">
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Manage which tags appear as main categories and control their visibility across the site.
          </p>
        </div>
        <div className="min-w-0">
          <AdminCategoriesTable />
        </div>
      </section>
    </div>
  )
}
