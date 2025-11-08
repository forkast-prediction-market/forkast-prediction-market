import type { Event } from '@/types'
import { LoaderIcon, SparklesIcon } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'
import { generateMarketContextAction } from '@/app/(platform)/event/[slug]/_actions/generate-market-context'
import { cn } from '@/lib/utils'
import { useOrder } from '@/stores/useOrder'

interface EventMarketContextProps {
  event: Event
}

export default function EventMarketContext({ event }: EventMarketContextProps) {
  const state = useOrder()
  const [contextExpanded, setContextExpanded] = useState(false)
  const [context, setContext] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [hasGenerated, setHasGenerated] = useState(false)

  async function generateMarketContext() {
    if (!state.market) {
      return
    }

    startTransition(async () => {
      setError(null)

      try {
        const response = await generateMarketContextAction({
          slug: event.slug,
          marketConditionId: state.market?.condition_id,
        })

        if (response?.error) {
          setError(response.error)
          setContext(null)
          setContextExpanded(false)
          return
        }

        if (response?.context) {
          setContext(response.context)
          setContextExpanded(true)
          setHasGenerated(true)
        }
      }
      catch (caughtError) {
        console.error('Failed to fetch market context.', caughtError)
        setError('Unable to reach the market context service right now.')
        setContext(null)
        setContextExpanded(false)
      }
    })
  }

  const paragraphs = useMemo(() => {
    if (!context) {
      return []
    }

    return context
      .split(/\n{2,}|\r\n{2,}/)
      .map(block => block.trim())
      .filter(Boolean)
  }, [context])

  function toggleCollapse() {
    setContextExpanded(current => !current)
  }

  return (
    <div className="rounded-lg border transition-all duration-200 ease-in-out">
      {hasGenerated
        ? (
            <button
              type="button"
              onClick={toggleCollapse}
              className={cn(
                'flex w-full items-center justify-between p-4 text-left transition-colors',
                `
                  hover:bg-muted/50
                  focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                  focus-visible:ring-offset-background focus-visible:outline-none
                `,
              )}
              aria-expanded={contextExpanded}
            >
              <span className="text-lg font-medium">Market Context</span>
              <span
                aria-hidden="true"
                className={cn(
                  `
                    pointer-events-none flex size-8 items-center justify-center rounded-md border border-border/60
                    bg-background text-muted-foreground transition
                  `,
                  contextExpanded ? 'bg-muted/50' : '',
                )}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={cn('transition-transform', { 'rotate-180': contextExpanded })}
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
          )
        : (
            <div className="flex items-center justify-between p-4 hover:bg-muted/50">
              <span className="text-lg font-medium">Market Context</span>
              <button
                type="button"
                onClick={generateMarketContext}
                className={`
                  flex items-center gap-1 rounded-md border border-border/60 bg-background px-3 py-1 text-sm font-medium
                  text-foreground shadow-sm transition
                  hover:bg-muted/50
                  disabled:cursor-not-allowed disabled:opacity-50
                `}
                disabled={isPending || !state.market}
              >
                {isPending ? <LoaderIcon className="size-3 animate-spin" /> : <SparklesIcon className="size-3" />}
                {isPending ? 'Generating...' : 'Generate'}
              </button>
            </div>
          )}

      {(contextExpanded || error) && (
        <div className="border-t border-border/30 px-3 pt-3 pb-3">
          <div className="space-y-3">
            {error && (
              <p className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}

            {paragraphs.map(paragraph => (
              <p
                key={paragraph}
                className="text-sm leading-relaxed text-muted-foreground"
              >
                {paragraph}
              </p>
            ))}

            {!error && context && (
              <div className="flex justify-end">
                <span className="font-mono text-[10px] tracking-wide text-muted-foreground/80 uppercase">
                  Results are experimental
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
