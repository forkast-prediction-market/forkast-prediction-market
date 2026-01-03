export default function PortfolioLayout({ children }: LayoutProps<'/portfolio'>) {
  return (
    <main className="container py-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        {children}
      </div>
    </main>
  )
}
