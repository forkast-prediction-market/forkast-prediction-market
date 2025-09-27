import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { RootProvider } from 'fumadocs-ui/provider'
import { BookOpenIcon, CodeIcon, ExternalLinkIcon } from 'lucide-react'
import { source } from '@/lib/source'
import { sanitizeSvg } from '@/lib/utils'
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
            nav={{
              title: (
                <>
                  <div
                    className="size-6"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeSvg(process.env.NEXT_PUBLIC_SITE_LOGO_SVG!),
                    }}
                  />
                  <span className="font-medium [.uwu_&]:hidden [header_&]:text-[15px]">
                    {`${process.env.NEXT_PUBLIC_SITE_NAME} Docs`}
                  </span>
                </>
              ),
              transparentMode: 'top',
            }}
            sidebar={{
              tabs: [
                {
                  title: 'Platform',
                  description: 'Platform guides and features',
                  url: '/docs/platform',
                  icon: <BookOpenIcon className="size-4" />,
                },
                {
                  title: 'API',
                  description: 'API documentation and keys',
                  url: '/docs/api',
                  icon: <CodeIcon className="size-4" />,
                },
              ],
            }}
            tree={source.pageTree}
            githubUrl="https://github.com/forkast-prediction-market/forkast-prediction-market"
            links={[
              {
                type: 'main',
                url: '/',
                text: 'forka.st',
                icon: <ExternalLinkIcon />,
              },
            ]}
          >
            {children}
          </DocsLayout>
        </RootProvider>
      </body>
    </html>
  )
}
