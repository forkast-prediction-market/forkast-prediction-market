import type { Event } from '@/types'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface EventRulesProps {
  event: Event
}

const RESOLVER_GRADIENTS = [
  'from-primary/80 to-primary',
  'from-blue-500/70 to-indigo-500',
  'from-emerald-500/70 to-teal-500',
  'from-orange-500/70 to-rose-500',
  'from-purple-500/70 to-fuchsia-500',
  'from-sky-500/70 to-cyan-500',
]

function getResolverGradient(address?: string) {
  if (!address) {
    return RESOLVER_GRADIENTS[0]
  }

  const checksum = [...address.toLowerCase()].reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return RESOLVER_GRADIENTS[checksum % RESOLVER_GRADIENTS.length]
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

  const primaryMarket = event.markets[0]
  const resolverAddress = primaryMarket?.condition?.oracle
  const resolverGradient = getResolverGradient(resolverAddress)

  return (
    <div className="rounded-xl border transition-all duration-200 ease-in-out">
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
        <h3 className="text-lg font-semibold">Rules</h3>
        <span
          aria-hidden="true"
          className={`
            pointer-events-none flex size-8 items-center justify-center rounded-md border bg-background
            text-muted-foreground transition
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
                    className={`size-10 bg-linear-to-r ${resolverGradient}
                      flex shrink-0 items-center justify-center rounded-sm
                    `}
                  >
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Resolver
                    </div>
                    <a
                      href={resolverAddress ? `https://polygonscan.com/address/${resolverAddress}` : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:opacity-80"
                    >
                      {formatOracleAddress(resolverAddress || '')}
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
