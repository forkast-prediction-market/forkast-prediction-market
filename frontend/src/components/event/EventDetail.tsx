'use client'

import type { Event } from '@/types'
import { DialogTitle } from '@radix-ui/react-dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import {
  BookmarkIcon,
  RefreshCwIcon,
  SparklesIcon,
  TrendingDownIcon,
} from 'lucide-react'
import Image from 'next/image'
import { useLayoutEffect, useState } from 'react'
import PredictionChart from '@/components/charts/PredictionChart'
import EventActivity from '@/components/event/EventActivity'
import EventComments from '@/components/event/EventComments'
import RelatedEvents from '@/components/event/EventRelated'
import EventShare from '@/components/event/EventShare'
import EventTopHolders from '@/components/event/EventTopHolders'
import OrderPanel from '@/components/event/OrderPanel'
import Header from '@/components/layout/Header'
import NavigationTabs from '@/components/layout/NavigationTabs'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { useTradingState } from '@/hooks/useTradingState'
import { formatDate, formatVolume, mockMarketDetails } from '@/lib/mockData'
import { formatOracleAddress, formatRules, sanitizeSvg } from '@/lib/utils'

interface EventDetailProps {
  event: Event
}

export default function EventDetail({ event }: EventDetailProps) {
  const POLYMARKET_COLORS = ['#2D9CDB', '#FF5952', '#27AE60', '#9B51E0']

  // Use custom trading state hook
  const tradingState = useTradingState({ event })

  // Component states
  const [activeTimeRange, setActiveTimeRange] = useState('1D')
  const [activeCommentsTab, setActiveCommentsTab] = useState('comments')
  const [rulesExpanded, setRulesExpanded] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [contextExpanded, setContextExpanded] = useState(false)
  const [isGeneratingContext, setIsGeneratingContext] = useState(false)
  const [generatedContext, setGeneratedContext] = useState<string[]>([])
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false)

  // Utility functions - now using trading state
  const getYesOutcome = tradingState.getYesOutcome
  const primaryProbability = tradingState.primaryProbability
  const yesPrice = tradingState.yesPrice
  const noPrice = tradingState.noPrice

  // Function to get top 4 outcomes by volume
  function getTopOutcomesForChart() {
    return [...event.outcomes].sort((a, b) => b.volume - a.volume).slice(0, 4)
  }

  // Function to generate chart data based on actual outcomes
  function generateChartData() {
    const topOutcomes = getTopOutcomesForChart()
    const now = new Date()
    const data = []

    const colors = POLYMARKET_COLORS

    // Generate series configuration based on actual outcomes
    const series = topOutcomes.map((outcome, index) => ({
      key: `outcome_${outcome.id}`,
      name: outcome.name,
      color: colors[index] || '#8B5CF6',
    }))

    // Generate simulated historical data for the last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)

      const dataPoint: { date: Date, [key: string]: number | Date } = { date }

      // For each outcome, generate a trend based on current probability
      topOutcomes.forEach((outcome) => {
        const key = `outcome_${outcome.id}`
        const baseProbability = outcome.probability

        // Add temporal and random variation
        const timeVariation = Math.sin((29 - i) * 0.1) * 5
        const randomVariation = (Math.random() - 0.5) * 8
        const variation = timeVariation + randomVariation

        let value = baseProbability + variation
        value = Math.max(5, Math.min(85, value)) // Limit between 5% and 85%

        dataPoint[key] = value
      })

      // Normalize so the sum is close to 100%
      const total = topOutcomes.reduce(
        (sum, outcome) => sum + (dataPoint[`outcome_${outcome.id}`] as number),
        0,
      )

      if (total > 0) {
        topOutcomes.forEach((outcome) => {
          const key = `outcome_${outcome.id}`
          const currentValue = dataPoint[key] as number
          dataPoint[key] = (currentValue / total) * 100
        })
      }

      data.push(dataPoint)
    }

    return { data, series }
  }

  // Generate dynamic data for the chart
  const chartConfig = generateChartData()

  // Function to generate market context
  async function generateMarketContext() {
    setIsGeneratingContext(true)

    // Simulate AI generation delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Generate contextual content based on market title and type
    const contextLines = [
      `This market tracks ${event.title.toLowerCase()} with current probability trends indicating ${primaryProbability}% likelihood of the positive outcome.`,
      `Historical data shows similar events have had volatility patterns with key decision points typically occurring near market resolution dates.`,
      `Market sentiment and external factors including recent news developments, expert opinions, and related market movements may influence final outcomes.`,
    ]

    setGeneratedContext(contextLines)
    setContextExpanded(true)
    setIsGeneratingContext(false)
  }

  // Load favorite status from localStorage
  useLayoutEffect(() => {
    const siteName = process.env.NEXT_PUBLIC_SITE_NAME!.toLowerCase()
    const stored = localStorage.getItem(`${siteName}-favorites`)
    if (stored) {
      try {
        const favArray = JSON.parse(stored)
        setIsFavorite(favArray.includes(event.id))
      }
      catch (error) {
        console.error('Error loading favorites:', error)
      }
    }
  }, [event.id])

  // Auto-select outcome for all markets (binary and multi-outcome)
  useLayoutEffect(() => {
    if (
      !tradingState.selectedOutcomeForOrder
      && event.active_markets_count > 0
    ) {
      if (event.active_markets_count === 1) {
        // For binary markets, select the "Yes" option (isYes = true)
        const yesOutcome = getYesOutcome()
        if (yesOutcome) {
          tradingState.setSelectedOutcomeForOrder(yesOutcome.id)
          tradingState.setYesNoSelection('yes')
        }
        else {
          // If isYes not found, select first option
          tradingState.setSelectedOutcomeForOrder(event.outcomes[0].id)
          tradingState.setYesNoSelection('yes')
        }
      }
      else if (event.active_markets_count > 1) {
        // For multi-option markets, select option with highest probability
        const sortedOutcomes = [...event.outcomes].sort(
          (a, b) => b.probability - a.probability,
        )
        const highestProbOutcome = sortedOutcomes[0]
        if (highestProbOutcome) {
          tradingState.setSelectedOutcomeForOrder(highestProbOutcome.id)
          tradingState.setYesNoSelection('yes')
        }
      }
    }
  }, [
    event.active_markets_count,
    event.outcomes,
    tradingState.selectedOutcomeForOrder,
    getYesOutcome,
    tradingState,
  ])

  // Handle favorite toggle
  function handleFavoriteToggle() {
    const siteName = process.env.NEXT_PUBLIC_SITE_NAME!.toLowerCase()
    const stored = localStorage.getItem(`${siteName}-favorites`)
    let favArray: string[] = []

    if (stored) {
      try {
        favArray = JSON.parse(stored)
      }
      catch (error) {
        console.error('Error parsing favorites:', error)
      }
    }

    if (isFavorite) {
      // Remove from favorites
      favArray = favArray.filter(id => id !== event.id)
    }
    else {
      // Add to favorites
      favArray.push(event.id)
    }

    localStorage.setItem(`${siteName}-favorites`, JSON.stringify(favArray))
    setIsFavorite(!isFavorite)
  }

  const { timeRanges, eventTabs, trendingData } = mockMarketDetails

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <NavigationTabs
        activeCategory={event.category}
        onCategoryChange={() => {}}
      />

      <main className="container grid gap-8 pt-8 pb-12 md:pb-12 lg:grid-cols-[3fr_1fr] lg:gap-10">
        {/* Left column - Main content */}
        <div className="pb-20 md:pb-0">
          {/* Add padding bottom on mobile for the floating button */}
          {/* Market header */}
          <div className="mb-6 flex items-center gap-4">
            <Image
              src={
                event.creatorAvatar
                || `https://avatar.vercel.sh/${event.title.charAt(0)}.png`
              }
              alt={event.creator || 'Market creator'}
              width={64}
              height={64}
              className="flex-shrink-0 rounded-xl"
            />
            <h1 className="line-clamp-3 flex-1 text-lg leading-tight font-bold md:text-xl lg:text-2xl">
              {event.title}
            </h1>
            <div className="flex gap-2 text-muted-foreground">
              <BookmarkIcon
                className={`h-4 w-4 cursor-pointer transition-colors hover:text-primary ${
                  isFavorite ? 'fill-current text-primary' : ''
                }`}
                onClick={handleFavoriteToggle}
              />
              <EventShare />
            </div>
          </div>

          {/* Meta information */}
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <span>
              Volume
              {formatVolume(event.volume)}
            </span>
            <span>•</span>
            <span>
              Expires
              {formatDate(event.endDate)}
            </span>
            <span>•</span>
            <span>{event.category}</span>
          </div>

          {/* Probability tag or legend */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {event.active_markets_count === 1
                  ? (
                      <>
                        <span
                          className="inline-flex items-center gap-1 text-xl font-bold text-primary"
                        >
                          {Math.round(primaryProbability)}
                          % chance
                        </span>

                        {/* Red arrow with percentage */}
                        <div className="flex items-center gap-1 text-no">
                          <TrendingDownIcon className="h-4 w-4" />
                          <span className="text-xs font-semibold">
                            {trendingData.changePercentage}
                            %
                          </span>
                        </div>
                      </>
                    )
                  : (
                      <div className="flex flex-wrap items-center gap-4">
                        {getTopOutcomesForChart().map((outcome, index) => (
                          <div key={outcome.id} className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{
                                backgroundColor: POLYMARKET_COLORS[index % 4],
                              }}
                            />
                            <span className="text-sm font-medium text-muted-foreground">
                              {outcome.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
              </div>

              {/* Logo for prints - always present */}
              <div className="flex items-center gap-1 text-muted-foreground opacity-40">
                <div
                  className="h-6 w-6"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeSvg(process.env.NEXT_PUBLIC_SITE_LOGO_SVG!),
                  }}
                />
                <span className="text-xl font-medium">
                  {process.env.NEXT_PUBLIC_SITE_NAME}
                </span>
              </div>
            </div>
          </div>

          {/* Price chart */}
          <div className="mt-4">
            <div className="relative h-72 w-full">
              <div className="absolute inset-0">
                <PredictionChart
                  data={chartConfig.data}
                  series={chartConfig.series}
                  width={800}
                  height={280}
                  margin={{ top: 30, right: 40, bottom: 40, left: 0 }}
                />
              </div>
            </div>
            <ul className="mt-2 flex justify-center gap-4 text-[11px] font-medium">
              {timeRanges.map(range => (
                <li
                  key={range}
                  className={`cursor-pointer transition-colors duration-200 ${
                    activeTimeRange === range
                      ? 'border-b-2 border-foreground text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setActiveTimeRange(range)}
                >
                  {range}
                </li>
              ))}
            </ul>
          </div>

          {/* List of Outcomes (only if > 2) */}
          {event.active_markets_count > 1 && (
            <div className="mt-6 overflow-hidden bg-background">
              {/* Header */}
              <div
                className="hidden items-center rounded-t-lg border-b bg-muted/10 py-3 md:flex dark:border-border/20"
              >
                <div className="w-1/2">
                  <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    OUTCOMES
                  </span>
                </div>
                <div className="flex w-3/5 items-center justify-center gap-1">
                  <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    CHANCE
                  </span>
                  <a
                    href="#"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <RefreshCwIcon className="h-3 w-3" />
                  </a>
                </div>
                <div className="w-[24%]"></div>
                <div className="w-[24%]"></div>
              </div>

              {/* Items - Sorted by probability descending */}
              {[...event.outcomes]
                .sort((a, b) => b.probability - a.probability)
                .map((outcome, index, sortedOutcomes) => (
                  <div
                    key={outcome.id}
                    className={`
                      flex cursor-pointer flex-col items-start rounded-lg px-3 py-4 transition-all duration-200
                      ease-in-out
                      hover:bg-black/5
                      md:flex-row md:items-center md:px-2
                      dark:hover:bg-white/5
                      ${
                  tradingState.selectedOutcomeForOrder === outcome.id
                    ? 'bg-muted dark:bg-black/10'
                    : ''
                  } ${
                    index !== sortedOutcomes.length - 1
                      ? 'border-b border-border/50 dark:border-border/20'
                      : 'rounded-b-lg'
                  }`}
                    onClick={() => {
                      tradingState.setSelectedOutcomeForOrder(outcome.id)
                      tradingState.setActiveTab('buy')
                      tradingState.inputRef?.focus()
                    }}
                  >
                    {/* Mobile: Layout in column */}
                    <div className="w-full md:hidden">
                      {/* Row 1: Name and probability */}
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {event.show_market_icons !== false && (
                            <Image
                              src={
                                outcome.avatar
                                || `https://avatar.vercel.sh/${outcome.name.toLowerCase()}.png`
                              }
                              alt={outcome.name}
                              width={42}
                              height={42}
                              className="flex-shrink-0 rounded-full"
                            />
                          )}
                          <div>
                            <div className="text-lg font-bold">
                              {outcome.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              $
                              {outcome.volume?.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }) || '0.00'}
                              {' '}
                              Vol.
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-foreground">
                            {Math.round(outcome.probability)}
                            %
                          </span>
                          <div className="flex items-center gap-1 text-no">
                            <TrendingDownIcon className="h-3 w-3" />
                            <span className="text-xs font-semibold">3%</span>
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Buttons */}
                      <div className="flex gap-2">
                        <Button
                          size="lg"
                          variant="yes"
                          className={`flex-1 ${tradingState.selectedOutcomeForOrder === outcome.id
                          && tradingState.yesNoSelection === 'yes'
                            ? 'bg-yes text-white'
                            : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            tradingState.setSelectedOutcomeForOrder(outcome.id)
                            tradingState.setYesNoSelection('yes')
                            tradingState.setActiveTab('buy')
                            setIsMobileModalOpen(true)
                          }}
                        >
                          Buy Yes
                          {' '}
                          {Math.round(outcome.probability)}
                          ¢
                        </Button>
                        <Button
                          size="lg"
                          variant="no"
                          className={`flex-1 ${tradingState.selectedOutcomeForOrder === outcome.id
                          && tradingState.yesNoSelection === 'no'
                            ? 'bg-no text-white'
                            : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            tradingState.setSelectedOutcomeForOrder(outcome.id)
                            tradingState.setYesNoSelection('no')
                            tradingState.setActiveTab('buy')
                            setIsMobileModalOpen(true)
                          }}
                        >
                          Buy No
                          {' '}
                          {100 - Math.round(outcome.probability)}
                          ¢
                        </Button>
                      </div>
                    </div>

                    {/* Desktop: Original line layout */}
                    <div className="hidden w-full items-center md:flex">
                      {/* First column: Name and info - 50% */}
                      <div className="flex w-1/2 items-center gap-3">
                        {event.show_market_icons !== false && (
                          <Image
                            src={
                              outcome.avatar
                              || `https://avatar.vercel.sh/${outcome.name.toLowerCase()}.png`
                            }
                            alt={outcome.name}
                            width={42}
                            height={42}
                            className="flex-shrink-0 rounded-full"
                          />
                        )}
                        <div>
                          <div className="text-lg font-bold">
                            {outcome.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            $
                            {outcome.volume?.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }) || '0.00'}
                            {' '}
                            Vol.
                          </div>
                        </div>
                      </div>

                      {/* Second column: Probability - 20% */}
                      <div className="flex w-3/5 justify-center">
                        <div className="flex items-center gap-2">
                          <span className="text-4xl font-bold text-foreground">
                            {Math.round(outcome.probability)}
                            %
                          </span>
                          <div className="flex items-center gap-1 text-no">
                            <TrendingDownIcon className="h-3 w-3" />
                            <span className="text-xs font-semibold">3%</span>
                          </div>
                        </div>
                      </div>

                      {/* Third column: Yes button - 15% */}
                      <div className="ml-3 w-[15%]">
                        <Button
                          size="lg"
                          variant="yes"
                          className={tradingState.selectedOutcomeForOrder === outcome.id
                            && tradingState.yesNoSelection === 'yes'
                            ? 'bg-yes text-white'
                            : ''}
                          onClick={(e) => {
                            e.stopPropagation()
                            tradingState.setSelectedOutcomeForOrder(outcome.id)
                            tradingState.setYesNoSelection('yes')
                            tradingState.setActiveTab('buy')
                            tradingState.inputRef?.focus()
                          }}
                        >
                          <div className="flex flex-col items-center">
                            <span>
                              Buy Yes
                              {' '}
                              {Math.round(outcome.probability)}
                              ¢
                            </span>
                          </div>
                        </Button>
                      </div>
                      <div className="ml-2 w-[15%]">
                        <Button
                          size="lg"
                          variant="no"
                          className={tradingState.selectedOutcomeForOrder === outcome.id
                            && tradingState.yesNoSelection === 'no'
                            ? 'bg-no text-white'
                            : ''}
                          onClick={(e) => {
                            e.stopPropagation()
                            tradingState.setSelectedOutcomeForOrder(outcome.id)
                            tradingState.setYesNoSelection('no')
                            tradingState.setActiveTab('buy')
                            tradingState.inputRef?.focus()
                          }}
                        >
                          <div className="flex flex-col items-center">
                            <span>
                              Buy No
                              {' '}
                              {100 - Math.round(outcome.probability)}
                              ¢
                            </span>
                          </div>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Order Book - Commented for now */}

          {/* Market Context */}
          <div
            className={`
              mt-3 rounded-lg border border-border/50 transition-all duration-200 ease-in-out
              dark:border-border/20
            `}
          >
            <div className="flex items-center justify-between p-4 hover:bg-muted/50">
              <span className="text-lg font-medium">Market Context</span>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={generateMarketContext}
                disabled={isGeneratingContext}
              >
                <SparklesIcon
                  className={`h-3 w-3 ${
                    isGeneratingContext ? 'animate-spin' : ''
                  }`}
                />
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

          {/* Rules */}
          <div
            className={`
              mt-3 rounded-lg border border-border/50 transition-all duration-200 ease-in-out
              dark:border-border/20
            `}
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
                          className={`h-10 w-10 bg-gradient-to-r ${mockMarketDetails.resolver.gradientColors}
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

          {/* Comments tabs */}
          <ul className="mt-8 flex h-12 gap-8 border-b border-border/50 text-sm font-semibold dark:border-border/20">
            {eventTabs.map(tab => (
              <li
                key={tab}
                className={`cursor-pointer transition-colors duration-200 ${
                  activeCommentsTab === tab
                    ? 'border-b-2 border-primary text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveCommentsTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </li>
            ))}
          </ul>

          {activeCommentsTab === 'comments' && <EventComments />}
          {activeCommentsTab === 'holders' && <EventTopHolders />}
          {activeCommentsTab === 'activity' && <EventActivity />}
        </div>

        {/* Right column - Order panel (Sticky) - Hidden on mobile */}
        <div className="hidden gap-4 md:block lg:sticky lg:top-28 lg:grid lg:self-start">
          <OrderPanel event={event} tradingState={tradingState} />
          <RelatedEvents event={event} />
        </div>
      </main>

      {/* Floating buttons for mobile - only binary markets */}
      {event.active_markets_count === 1 && (
        <div className="fixed right-0 bottom-0 left-0 border-t border-border/50 bg-background p-4 md:hidden">
          <div className="flex gap-2">
            <Button
              variant="yes"
              size="lg"
              className="flex-1"
              onClick={() => {
                tradingState.setYesNoSelection('yes')
                setIsMobileModalOpen(true)
              }}
            >
              Buy Yes
              {' '}
              {yesPrice}
              ¢
            </Button>
            <Button
              variant="no"
              size="lg"
              className="flex-1"
              onClick={() => {
                tradingState.setYesNoSelection('no')
                setIsMobileModalOpen(true)
              }}
            >
              Buy No
              {' '}
              {noPrice}
              ¢
            </Button>
          </div>
        </div>
      )}

      <Drawer
        open={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
      >
        <DrawerContent>
          <VisuallyHidden>
            <DialogTitle>{event.title}</DialogTitle>
          </VisuallyHidden>

          <OrderPanel event={event} tradingState={tradingState} isMobileVersion={true} />
        </DrawerContent>
      </Drawer>
    </div>
  )
}
