import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { RootProvider } from 'fumadocs-ui/provider'
import { BookOpenIcon, CodeIcon } from 'lucide-react'
import { baseOptions } from '@/lib/layout.shared'
import { source } from '@/lib/source'
import '../(platform)/globals.css'

export default async function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <RootProvider>
          <DocsLayout
            sidebar={{
              tabs: [
                {
                  title: 'API',
                  description: 'API documentation and reference',
                  url: '/docs/api',
                  icon: <CodeIcon className="size-4" />,
                },
                {
                  title: 'Platform',
                  description: 'Platform guides and features',
                  url: '/docs/platform',
                  icon: <BookOpenIcon className="size-4" />,
                },
              ],
            }}
            tree={source.pageTree}
            {...baseOptions()}
          >
            {children}
          </DocsLayout>
        </RootProvider>
      </body>
    </html>
  )
}
