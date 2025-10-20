import AdminUsersTable from '@/app/admin/_components/AdminUsersTable'

export default function Loading() {
  return (
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
  )
}
