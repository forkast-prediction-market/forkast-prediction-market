'use client'

import type { AffiliateWidgetEvent } from '@/lib/affiliate-widget'
import { ExternalLinkIcon } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { cn, sanitizeSvg } from '@/lib/utils'

type WidgetTheme = 'light' | 'dark' | 'auto'

interface AffiliateWidgetProps {
  events: AffiliateWidgetEvent[]
  affiliateCode: string
  baseUrl: string
  siteName: string
  logoSvg?: string
  theme?: WidgetTheme
  rotationIntervalMs?: number
  className?: string
}

const ROTATION_DEFAULT = 8000

function buildAffiliateUrl(baseUrl: string, affiliateCode: string, eventSlug?: string) {
  const normalizedBase = baseUrl.replace(/\/$/, '')
  if (!eventSlug) {
    return `${normalizedBase}/r/${affiliateCode}`
  }

  const redirect = encodeURIComponent(`/event/${eventSlug}`)
  return `${normalizedBase}/r/${affiliateCode}?redirect=${redirect}`
}

export default function AffiliateWidget({
  events,
  affiliateCode,
  baseUrl,
  siteName,
  logoSvg,
  className,
  theme = 'auto',
  rotationIntervalMs = ROTATION_DEFAULT,
}: AffiliateWidgetProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [autoDark, setAutoDark] = useState(theme === 'dark')
  const currentEvent = events[activeIndex] ?? events[0]
  const sanitizedLogo = logoSvg ? sanitizeSvg(logoSvg) : ''
  const hasLogo = sanitizedLogo.trim().length > 0

  useEffect(() => {
    if (theme !== 'auto') {
      setAutoDark(theme === 'dark')
      return
    }

    if (typeof window === 'undefined') {
      return
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    setAutoDark(media.matches)

    function handleThemeChange(event: MediaQueryListEvent) {
      setAutoDark(event.matches)
    }

    media.addEventListener('change', handleThemeChange)
    return () => media.removeEventListener('change', handleThemeChange)
  }, [theme])

  useEffect(() => {
    setActiveIndex(0)
  }, [events])

  useEffect(() => {
    if (events.length > 0 && activeIndex >= events.length) {
      setActiveIndex(0)
    }
  }, [activeIndex, events.length])

  useEffect(() => {
    if (events.length < 2) {
      return
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex(prev => (prev + 1) % events.length)
    }, rotationIntervalMs)

    return () => window.clearInterval(intervalId)
  }, [events.length, rotationIntervalMs])

  const cardClassName = autoDark
    ? 'border-white/10 bg-slate-950 text-slate-50'
    : 'border-slate-200 bg-white text-slate-900 shadow-lg'

  if (!currentEvent) {
    return (
      <div className={cn('w-full rounded-3xl border p-6 text-sm text-muted-foreground', className, cardClassName)}>
        No events are available for this filter yet. As soon as new markets open, they will rotate here.
      </div>
    )
  }

  const eventUrl = buildAffiliateUrl(baseUrl, affiliateCode, currentEvent?.slug)
  const MAX_VISIBLE_OUTCOMES = 2
  const visibleOutcomes = currentEvent.outcomes.slice(0, MAX_VISIBLE_OUTCOMES)
  const remainingCount = Math.max(currentEvent.outcomes.length - visibleOutcomes.length, 0)
  const fallbackLogo = siteName.charAt(0).toUpperCase()
  const buttonStyles = autoDark
    ? 'bg-white/10 text-white hover:bg-white/20'
    : 'bg-slate-900 text-white hover:bg-slate-800'
  const imageSrc = currentEvent.imageUrl && currentEvent.imageUrl.trim() !== ''
    ? currentEvent.imageUrl
    : `https://avatar.vercel.sh/${encodeURIComponent(currentEvent.slug)}.png`

  return (
    <article className={cn('w-full max-w-xl rounded-3xl border p-4 transition-colors sm:p-6', cardClassName, className)}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn('flex size-12 items-center justify-center rounded-2xl border', autoDark
            ? 'border-white/20 bg-white/5'
            : 'border-slate-200 bg-slate-50')}
          >
            {hasLogo
              ? (
                  <div
                    className="flex h-8 w-8 items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: sanitizedLogo }}
                  />
                )
              : (
                  <span className="text-lg font-semibold">{fallbackLogo}</span>
                )}
          </div>
          <div>
            <p className={cn('text-xs font-medium tracking-wide uppercase', autoDark
              ? 'text-slate-300'
              : `text-slate-500`)}
            >
              {siteName}
            </p>
            <p className="text-base font-semibold">Featured markets</p>
          </div>
        </div>
      </header>

      <div className="mt-5 space-y-4">
        <a
          href={eventUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group block overflow-hidden rounded-2xl"
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
            <Image
              src={imageSrc}
              alt={currentEvent.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 420px"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-x-4 bottom-4 space-y-2 text-white">
              <span className={`
                inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium tracking-wide uppercase
              `}
              >
                {currentEvent.mainTag}
              </span>
              <p className="text-lg leading-tight font-semibold">
                {currentEvent.title}
              </p>
            </div>
          </div>
        </a>

        <div
          className={cn(
            'flex flex-col gap-3 rounded-2xl border p-4 backdrop-blur',
            autoDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white/70',
          )}
        >
          <div className="flex flex-col gap-2">
            {visibleOutcomes.map((outcome) => {
              const outcomeStyle = outcome.kind === 'yes'
                ? (autoDark
                    ? 'border-emerald-300/40 bg-emerald-400/20 text-emerald-100'
                    : 'border-emerald-500/20 bg-emerald-50 text-emerald-600')
                : outcome.kind === 'no'
                  ? (autoDark
                      ? 'border-rose-300/40 bg-rose-400/20 text-rose-100'
                      : 'border-rose-500/20 bg-rose-50 text-rose-600')
                  : (autoDark
                      ? 'border-white/10 bg-white/5 text-white'
                      : 'border-slate-200 bg-white text-slate-900 shadow-sm')

              return (
                <div
                  key={outcome.id}
                  className={cn(
                    `
                      flex min-h-[52px] w-full cursor-pointer items-center justify-between rounded-2xl border px-3 py-2
                      text-sm font-semibold transition-colors select-none
                    `,
                    outcomeStyle,
                  )}
                >
                  <span className="truncate pr-2 text-xs font-medium tracking-wide uppercase opacity-80">
                    {outcome.label}
                  </span>
                  {Number.isFinite(outcome.probability)
                    ? (
                        <span className="text-base font-semibold">
                          {outcome.probability.toFixed(1)}
                          %
                        </span>
                      )
                    : <span className="text-sm font-semibold opacity-70">—</span>}
                </div>
              )
            })}
          </div>

          {remainingCount > 0 && (
            <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              and
              {' '}
              {remainingCount}
              {' '}
              more markets
            </div>
          )}

          <a
            href={eventUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(`
              inline-flex w-full items-center justify-center rounded-2xl px-5 py-2 text-sm font-semibold
              transition-colors
            `, buttonStyles)}
          >
            View event
            <ExternalLinkIcon className="ml-2 size-4" />
          </a>
        </div>
      </div>

      <footer className="mt-5">
        <div className="flex w-full items-center justify-center gap-1">
          {events.map((event, index) => (
            <button
              key={event.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show event ${index + 1}`}
              className={cn('h-2.5 w-2.5 rounded-full transition-all', index === activeIndex
                ? (autoDark ? 'w-6 bg-white' : 'w-6 bg-slate-900')
                : (autoDark ? 'bg-white/30 hover:bg-white/60' : 'bg-slate-300 hover:bg-slate-500'))}
            />
          ))}
        </div>
      </footer>
    </article>
  )
}
