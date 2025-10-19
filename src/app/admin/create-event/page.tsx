import { redirect } from 'next/navigation'
import AdminCreateEventForm from '@/app/admin/create-event/_components/AdminCreateEventForm'
import { UserRepository } from '@/lib/db/user'

export default async function AdminCreateEventPage() {
  const currentUser = await UserRepository.getCurrentUser()
  if (!currentUser || !currentUser.is_admin) {
    redirect('/')
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4">
        <div className="grid gap-2">
          <h1 className="text-2xl font-semibold">Create Event</h1>
          <p className="text-sm text-muted-foreground">
            Prepare event and market data using the latest admin layout before wiring backend integrations.
          </p>
        </div>
        <div className="min-w-0">
          <AdminCreateEventForm />
        </div>
      </section>
    </div>
  )
}
