import { routing } from '@/i18n/routing'

export async function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }))
}

export default async function PublicProfileLayout({ children }: LayoutProps<'/[locale]/[username]'>) {
  return (
    <main className="container py-8">
      <div className="mx-auto grid max-w-6xl gap-12">
        {children}
      </div>
    </main>
  )
}
