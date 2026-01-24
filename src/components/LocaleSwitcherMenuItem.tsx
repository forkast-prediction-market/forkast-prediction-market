'use client'

import type { Locale } from 'next-intl'
import { CheckIcon } from 'lucide-react'
import { useLocale } from 'next-intl'
import { useParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import {
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  es: 'Spanish',
}

const LOOP_LABELS: Record<Locale, string> = {
  en: 'Language',
  es: 'Idioma',
}

export default function LocaleSwitcherMenuItem() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const locale = useLocale()
  const [isPending, startTransition] = useTransition()
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [isSliding, setIsSliding] = useState(true)
  const localeLabels = routing.locales.map(
    option => LOOP_LABELS[option as Locale] ?? option.toUpperCase(),
  )
  const loopedLabels = [
    ...localeLabels,
    localeLabels[0],
  ].filter(Boolean)
  const shouldAnimate = localeLabels.length > 1
  const displayDurationMs = 1000
  const transitionDurationMs = 200
  const itemHeightRem = 1.25

  useEffect(() => {
    if (!shouldAnimate) {
      return
    }

    const interval = window.setInterval(() => {
      setIsSliding(true)
      setCarouselIndex(prev => prev + 1)
    }, displayDurationMs + transitionDurationMs)

    return () => window.clearInterval(interval)
  }, [shouldAnimate, displayDurationMs, transitionDurationMs])

  function handleCarouselTransitionEnd() {
    if (carouselIndex === localeLabels.length) {
      setIsSliding(false)
      setCarouselIndex(0)
    }
  }

  function handleValueChange(nextLocale: string) {
    startTransition(() => {
      router.replace(
        // @ts-expect-error -- next-intl validates that params match the pathname.
        { pathname, params },
        { locale: nextLocale as Locale },
      )
    })
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={isPending}>
        <span className="sr-only">Language</span>
        <span className="h-5 overflow-hidden text-sm">
          <span
            className="block transition-transform duration-200 ease-in-out"
            style={{
              transform: `translateY(-${carouselIndex * itemHeightRem}rem)`,
              transition: isSliding && shouldAnimate ? undefined : 'none',
            }}
            onTransitionEnd={handleCarouselTransitionEnd}
          >
            {loopedLabels.map((label, index) => (
              <span key={`${label}-${index}`} className="block h-5 leading-5">
                {label}
              </span>
            ))}
          </span>
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          <DropdownMenuRadioGroup
            value={locale}
            onValueChange={handleValueChange}
          >
            {routing.locales.map(option => (
              <DropdownMenuRadioItem
                key={option}
                value={option}
                className="group flex items-center gap-2 pr-8 pl-2 [&>span:first-child]:hidden"
              >
                <span className="flex-1">
                  {LOCALE_LABELS[option as Locale] ?? option.toUpperCase()}
                </span>
                <CheckIcon className="ml-auto size-4 opacity-0 group-data-[state=checked]:opacity-100" />
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  )
}
