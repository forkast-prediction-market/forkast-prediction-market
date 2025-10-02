import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { RootProvider } from 'fumadocs-ui/provider'
import { BookOpenIcon, CodeIcon, HomeIcon } from 'lucide-react'
import { source } from '@/lib/source'
import { sanitizeSvg } from '@/lib/utils'

export default async function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <RootProvider
      search={{
        options: {
          api: '/docs/search',
        },
      }}
    >
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
              title: 'User Guide',
              description: 'How to trade and use the platform',
              url: '/docs/users',
              icon: <BookOpenIcon className="size-4" />,
            },
            {
              title: 'For Developers',
              description: 'API reference and integration details',
              url: '/docs/developers',
              icon: <CodeIcon className="size-4" />,
            },
          ],
        }}
        tree={source.pageTree}
        links={[
          {
            type: 'main',
            url: '/',
            text: process.env.NEXT_PUBLIC_SITE_NAME,
            icon: <HomeIcon />,
          },
        ]}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  )
}
