import type { Event } from '@/types'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { mockMarketDetails } from '@/lib/mockData'

interface Props {
  event: Event
}

export default function EventRules({ event }: Props) {
  const [rulesExpanded, setRulesExpanded] = useState(false)

  function formatRules(rules: string): string {
    if (!rules) {
      return ''
    }

    return rules
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/^"/, '') // Remove quotes at the beginning
      .replace(/"$/, '') // Remove quotes at the end
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
    <div
      className="mt-3 rounded-lg border border-border/50 transition-all duration-200 ease-in-out dark:border-border/20"
    >
      <div className="flex items-center justify-between p-4 hover:bg-muted/50">
        <span className="text-lg font-medium">Rules</span>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => setRulesExpanded(!rulesExpanded)}
        >
          {rulesExpanded ? 'Show less ▴' : 'Show more ▾'}
        </Button>
      </div>

      {rulesExpanded && (
        <div className="border-t border-border/30 px-3 pb-3">
          <div className="space-y-2 pt-3">
            {event.rules && (
              <div className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                {formatRules(event.rules)}
              </div>
            )}

            {/* Oracle Info */}
            <div className="mt-3 rounded-lg border border-border/50 p-3 dark:border-border/20">
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
                      href={
                        event.oracle
                          ? `https://polygonscan.com/address/${event.oracle}`
                          : '#'
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:opacity-80"
                    >
                      {event.oracle
                        ? formatOracleAddress(event.oracle)
                        : ''}
                    </a>
                  </div>
                </div>

                {/* Propose resolution button aligned to the right */}
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
