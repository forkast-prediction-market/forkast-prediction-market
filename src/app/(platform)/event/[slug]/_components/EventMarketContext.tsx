import type { Event } from '@/types'
import { SparklesIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useOrder } from '@/stores/useOrder'

interface Props {
  event: Event
}

export default function EventMarketContext({ event }: Props) {
  const state = useOrder()
  const [contextExpanded, setContextExpanded] = useState(false)
  const [isGeneratingContext, setIsGeneratingContext] = useState(false)
  const [generatedContext, setGeneratedContext] = useState<string[]>([])

  async function generateMarketContext() {
    setIsGeneratingContext(true)

    // Simulate AI generation delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Generate contextual content based on market title and type
    const contextLines = [
      `This market tracks ${event.title.toLowerCase()} with current probability trends indicating ${state.market?.probability}% likelihood of the positive outcome.`,
      `Historical data shows similar events have had volatility patterns with key decision points typically occurring near market resolution dates.`,
      `Market sentiment and external factors including recent news developments, expert opinions, and related market movements may influence final outcomes.`,
    ]

    setGeneratedContext(contextLines)
    setContextExpanded(true)
    setIsGeneratingContext(false)
  }

  return (
    <div className="rounded-lg border transition-all duration-200 ease-in-out">
      <div className="flex items-center justify-between p-4 hover:bg-muted/50">
        <span className="text-lg font-medium">Market Context</span>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={generateMarketContext}
          disabled={isGeneratingContext}
        >
          <SparklesIcon className={cn({ 'animate-spin': isGeneratingContext }, 'size-3')} />
          {isGeneratingContext ? 'Generating...' : 'Generate'}
        </Button>
      </div>

      {contextExpanded && (
        <div className="border-t border-border/30 px-3 pb-3">
          <div className="space-y-2 pt-3">
            {generatedContext.map(line => (
              <p
                key={line}
                className="text-sm leading-relaxed text-muted-foreground"
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
