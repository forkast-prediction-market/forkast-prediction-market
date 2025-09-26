import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: `${process.env.NEXT_PUBLIC_SITE_NAME} Docs`,
    },
  }
}
