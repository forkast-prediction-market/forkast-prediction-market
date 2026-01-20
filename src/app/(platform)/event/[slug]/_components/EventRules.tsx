import type { Event } from '@/types'
import { LinkIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  UMA_CTF_ADAPTER_KUEST_ADDRESS,
  UMA_CTF_ADAPTER_POLYMARKET_ADDRESS,
  UMA_NEG_RISK_ADAPTER_ADDRESS,
} from '@/lib/contracts'
import { resolveUmaProposeTarget } from '@/lib/uma'
import { normalizeAddress } from '@/lib/wallet'

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

const UMA_RESOLVER_ADDRESS_SET = new Set(
  [
    UMA_CTF_ADAPTER_POLYMARKET_ADDRESS,
    UMA_CTF_ADAPTER_KUEST_ADDRESS,
    UMA_NEG_RISK_ADAPTER_ADDRESS,
  ].map(address => address.toLowerCase()),
)
const RULES_URL_REGEX = /((?:https?:\/\/|www\.)[^\s<>"']+)/g

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

  function formatCreatedAt(value: string): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return '—'
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York',
    }).format(date)
  }

  function renderRulesTextWithLinks(text: string) {
    if (!text) {
      return null
    }

    return text.split(RULES_URL_REGEX).map((part, index) => {
      if (index % 2 === 1) {
        const href = part.startsWith('http') ? part : `https://${part}`
        return (
          <a
            key={`rules-link-${index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:opacity-80"
          >
            {part}
          </a>
        )
      }
      return part
    })
  }

  const primaryMarket = event.markets[0]
  const proposeTarget = resolveUmaProposeTarget(primaryMarket?.condition)
  const resolverAddress = proposeTarget?.isMirror
    ? primaryMarket?.resolver
    : primaryMarket?.condition?.oracle
  const resolverGradient = getResolverGradient(resolverAddress)
  const proposeUrl = proposeTarget?.url ?? null
  const resolutionSourceUrl = (() => {
    const value = primaryMarket?.resolution_source_url?.trim() ?? ''
    if (!value) {
      return ''
    }
    const href = value.startsWith('http') ? value : `https://${value}`
    try {
      const url = new URL(href)
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : ''
    } catch {
      return ''
    }
  })()
  const normalizedResolutionSourceUrl = resolutionSourceUrl.toLowerCase()
  const formattedRules = formatRules(event.rules ?? '')
  const createdAtLabel = formatCreatedAt(event.created_at)
  const normalizedResolverAddress = normalizeAddress(resolverAddress)?.toLowerCase()
  const isUmaResolver = normalizedResolverAddress ? UMA_RESOLVER_ADDRESS_SET.has(normalizedResolverAddress) : false
  const hasResolutionSourceUrl = Boolean(resolutionSourceUrl) && normalizedResolutionSourceUrl !== 'n/a'
  const resolverBadgeClassName = isUmaResolver
    ? 'bg-transparent'
    : `bg-linear-to-r ${resolverGradient}`

  const resolverDetails = (
    <div className="flex items-start gap-3">
      <div
        className={`size-10 ${resolverBadgeClassName}
          flex shrink-0 items-center justify-center rounded-sm
        `}
      >
        {isUmaResolver && (
          // eslint-disable-next-line next/no-img-element
          <img
            src="/images/resolver/uma.svg"
            alt="UMA"
            className="h-auto w-full max-w-10"
          />
        )}
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
  )

  const resolverBlock = (
    <div className="rounded-lg border p-3">
      <div className={hasResolutionSourceUrl ? 'flex items-center' : 'flex items-center justify-between'}>
        {resolverDetails}
        {!hasResolutionSourceUrl && (
          proposeUrl
            ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={proposeUrl} target="_blank" rel="noopener noreferrer">
                    Propose resolution
                  </a>
                </Button>
              )
            : (
                <Button variant="outline" size="sm" disabled>
                  Propose resolution
                </Button>
              )
        )}
      </div>
    </div>
  )

  const resolutionSourceBlock = hasResolutionSourceUrl
    ? (
        <div className="rounded-lg border p-3">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <LinkIcon className="size-4 -scale-x-100 text-muted-foreground" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                Resolution Source
              </div>
              <a
                href={resolutionSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs break-all text-primary hover:opacity-80"
              >
                {resolutionSourceUrl}
              </a>
            </div>
          </div>
        </div>
      )
    : null

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
        <div className="overflow-hidden border-t border-border/30 px-3 pb-3">
          <div className="space-y-2 pt-3">
            {formattedRules && (
              <div className="text-sm leading-relaxed whitespace-pre-line text-white">
                {renderRulesTextWithLinks(formattedRules)}
              </div>
            )}
            <p className="mt-4 text-sm text-white">
              <span className="font-semibold">Created At:</span>
              {' '}
              {createdAtLabel}
              {' '}
              ET
            </p>

            {hasResolutionSourceUrl
              ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {resolutionSourceBlock}
                    {resolverBlock}
                  </div>
                )
              : (
                  <div className="mt-3">
                    {resolverBlock}
                  </div>
                )}
          </div>
        </div>
      )}
    </div>
  )
}
