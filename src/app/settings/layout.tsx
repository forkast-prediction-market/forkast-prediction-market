export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="container py-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:gap-16">
          {children}
        </div>
      </div>
    </main>
  )
}
