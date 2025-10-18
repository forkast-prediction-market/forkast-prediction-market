'use cache'

export default async function EventLayout({ children }: LayoutProps<'/event/[slug]'>) {
  return (
    <main className="container grid gap-8 pb-12 lg:grid-cols-[3fr_1fr] lg:gap-10">
      <div className="pt-4 pb-20 md:pb-0">{children}</div>

      <aside id="event-order-panel" className="hidden gap-4 md:block lg:sticky lg:top-28 lg:grid lg:self-start" />
    </main>
  )
}
