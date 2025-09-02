import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Event',
}

export default async function CreateEventLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="container py-8">
      <div className="mx-auto max-w-4xl">
        {children}
      </div>
    </main>
  )
}
