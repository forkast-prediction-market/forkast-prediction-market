import type { Event } from '@/types'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { mockMarketDetails } from '@/lib/mockData'

interface EventRulesProps {
  event: Event
}

export default function EventRules({ event }: EventRulesProps) {
  const [rulesExpanded, setRulesExpanded] = useState(false)

  function formatRules(rules: string): string {
    if (!rules) {
      return ''
    }

    return rules
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/^"/, '')
      .replace(/"$/, '')
  }

  function formatOracleAddress(address: string): string {
    if (!address || !address.startsWith('0x')) {
      return '0x0000...0000'
    }

    const prefix = address.substring(0, 6)
    const suffix = address.substring(address.length - 4)
    return `${prefix}...${suffix}`
  }

  return (
    <div className="rounded-lg border transition-all duration-200 ease-in-out">
      <button
        type="button"
        onClick={() => setRulesExpanded(!rulesExpanded)}
        className={`
          flex w-full items-center justify-between p-4 text-left transition-colors
          hover:bg-muted/50
          focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
          focus-visible:outline-none
        `}
        aria-expanded={rulesExpanded}
      >
        <span className="text-lg font-medium">Rules</span>
        <span
          aria-hidden="true"
          className={`
            pointer-events-none flex h-8 w-8 items-center justify-center rounded-md border border-border/60
            bg-background text-muted-foreground transition
            ${rulesExpanded ? 'bg-muted/50' : ''}
          `}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`transition-transform ${rulesExpanded ? 'rotate-180' : ''}`}
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {rulesExpanded && (
        <div className="border-t border-border/30 px-3 pb-3">
          <div className="space-y-2 pt-3">
            {event.rules && (
              <div className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                {formatRules(event.rules)}
              </div>
            )}

            <div className="mt-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`size-10 bg-gradient-to-r ${mockMarketDetails.resolver.gradientColors}
                      flex flex-shrink-0 items-center justify-center rounded-sm
                    `}
                  >
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Resolver
                    </div>
                    <a
                      href={`https://polygonscan.com/address/${event.markets[0].condition.oracle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:opacity-80"
                    >
                      {formatOracleAddress(event.markets[0].condition.oracle)}
                    </a>
                  </div>
                </div>

                <Button variant="outline" size="sm">
                  Propose resolution
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
