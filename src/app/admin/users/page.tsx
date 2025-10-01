import { redirect } from 'next/navigation'
import AdminUsersTable from '@/app/admin/_components/AdminUsersTable'
import { UserModel } from '@/lib/db/users'

export default async function AdminUsersPage() {
  const currentUser = await UserModel.getCurrentUser()
  if (!currentUser || !currentUser.is_admin) {
    redirect('/')
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4">
        <div className="grid gap-2">
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage user accounts and view user statistics.
          </p>
        </div>
        <div className="min-w-0">
          <AdminUsersTable />
        </div>
      </section>
    </div>
  )
}
