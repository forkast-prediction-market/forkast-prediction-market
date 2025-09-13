import Link from 'next/link'
import { sanitizeSvg } from '@/lib/utils'

export default async function HeaderLogo() {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME
  const logoSvg = process.env.NEXT_PUBLIC_SITE_LOGO_SVG
  const sanitizedLogoSvg = logoSvg ? sanitizeSvg(logoSvg) : ''

  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-2 font-semibold text-foreground transition-opacity hover:opacity-80"
    >
      <div
        className="size-6 text-primary"
        dangerouslySetInnerHTML={{ __html: sanitizedLogoSvg! }}
      />
      <span className="text-2xl font-bold">{siteName}</span>
    </Link>
  )
}
