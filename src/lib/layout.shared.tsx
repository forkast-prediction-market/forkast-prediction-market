import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import { ExternalLinkIcon } from 'lucide-react'
import { sanitizeSvg } from '@/lib/utils'

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
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
    },
    githubUrl: 'https://github.com/forkast-prediction-market/forkast-prediction-market',
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
