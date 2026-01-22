import type { Event } from '@/types'
import Image from 'next/image'
import Link from 'next/link'

interface EventCardHeaderProps {
  event: Event
  isInTradingMode: boolean
  isSingleMarket: boolean
  roundedPrimaryDisplayChance: number
  onCancelTrade: () => void
}

export default function EventCardHeader({
  event,
  isInTradingMode,
  isSingleMarket,
  roundedPrimaryDisplayChance,
  onCancelTrade,
}: EventCardHeaderProps) {
  return (
    <div className="mb-3 flex items-start justify-between">
      <Link href={`/event/${event.slug}`} className="flex flex-1 items-center gap-2 pr-2">
        <div
          className={`
            flex size-10 shrink-0 items-center justify-center overflow-hidden rounded bg-muted text-muted-foreground
          `}
        >
          <Image
            src={event.icon_url}
            alt={event.creator || 'Market creator'}
            width={40}
            height={40}
            className="size-full rounded object-cover"
          />
        </div>

        <h3
          className={
            `
              line-clamp-2 w-fit text-sm leading-5 font-bold text-pretty underline-offset-2 transition-all duration-200
              hover:line-clamp-none hover:text-foreground hover:underline
            `
          }
        >
          {event.title}
        </h3>
      </Link>

      {isInTradingMode
        ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onCancelTrade()
              }}
              className={
                `
                  flex size-6 items-center justify-center rounded-lg bg-slate-200 text-slate-600 transition-colors
                  hover:bg-slate-300
                  dark:bg-slate-600 dark:text-slate-400 dark:hover:bg-slate-500
                `
              }
            >
              ✕
            </button>
          )
        : (
            isSingleMarket && (
              <div className="relative -mt-3 flex flex-col items-center">
                <div className="relative">
                  <svg
                    width="72"
                    height="52"
                    viewBox="0 0 72 52"
                    className="rotate-0 transform"
                  >
                    <path
                      d="M 6 46 A 30 30 0 0 1 66 46"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="5"
                      className="text-slate-200 dark:text-slate-600"
                    />

                    <path
                      d="M 6 46 A 30 30 0 0 1 66 46"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinecap="round"
                      className={
                        `transition-all duration-300 ${
                          roundedPrimaryDisplayChance < 40
                            ? 'text-no'
                            : roundedPrimaryDisplayChance === 50
                              ? 'text-slate-400'
                              : 'text-yes'
                        }`
                      }
                      strokeDasharray={`${(roundedPrimaryDisplayChance / 100) * 94.25} 94.25`}
                      strokeDashoffset="0"
                    />
                  </svg>

                  <div className="absolute inset-0 flex items-center justify-center pt-4">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {roundedPrimaryDisplayChance}
                      %
                    </span>
                  </div>
                </div>

                <div className="-mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  chance
                </div>
              </div>
            )
          )}
    </div>
  )
}
