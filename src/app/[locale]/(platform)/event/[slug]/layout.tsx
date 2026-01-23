export default async function EventLayout({ children }: LayoutProps<'/[locale]/event/[slug]'>) {
  return (
    <main className="container grid min-h-screen gap-8 pb-12 lg:grid-cols-[minmax(0,3fr)_21.25rem] lg:gap-10">
      <div className="pt-4 pb-20 md:pb-0">{children}</div>

      <aside
        id="event-order-panel"
        className={`
          hidden gap-4
          lg:sticky lg:top-28 lg:grid lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto
        `}
      />
    </main>
  )
}
