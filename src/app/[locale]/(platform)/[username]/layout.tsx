export default async function PublicProfileLayout({ children }: LayoutProps<'/[locale]/[username]'>) {
  return (
    <main className="container py-8">
      <div className="mx-auto grid max-w-6xl gap-12">
        {children}
      </div>
    </main>
  )
}
