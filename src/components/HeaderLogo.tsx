import Link from 'next/link'
import { sanitizeSvg } from '@/lib/utils'

export default async function HeaderLogo() {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME
  const logoSvg = process.env.NEXT_PUBLIC_SITE_LOGO_SVG
  const sanitizedLogoSvg = logoSvg ? sanitizeSvg(logoSvg) : ''

  return (
    <Link
      href="/"
      className={`
        flex shrink-0 items-center gap-2 text-2xl font-semibold text-foreground transition-opacity
        hover:opacity-80
      `}
    >
      <div
        className={`
          h-[1em] w-[1em] text-current
          [&_svg]:h-[1em] [&_svg]:w-[1em]
          [&_svg_*]:fill-current [&_svg_*]:stroke-current
        `}
        dangerouslySetInnerHTML={{ __html: sanitizedLogoSvg! }}
      />
      <span className="font-bold">{siteName}</span>
    </Link>
  )
}
