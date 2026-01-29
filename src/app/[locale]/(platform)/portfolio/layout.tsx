import { routing } from '@/i18n/routing'

export async function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }))
}

export default async function PortfolioLayout({ children }: LayoutProps<'/[locale]/portfolio'>) {
  return (
    <main className="container py-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        {children}
      </div>
    </main>
  )
}
