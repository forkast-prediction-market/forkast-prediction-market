import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import { ExternalLinkIcon } from 'lucide-react'

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: `${process.env.NEXT_PUBLIC_SITE_NAME} Docs`,
    },
    links: [
      {
        type: 'main',
        url: '/',
        text: 'forkast.st',
        icon: <ExternalLinkIcon />,
      },
    ],
  }
}
