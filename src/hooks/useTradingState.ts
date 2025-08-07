import type { Event } from '@/types'
import { useCallback, useMemo, useState } from 'react'

interface UseTradingStateProps {
  event: Event
}

export function useTradingState({ event }: UseTradingStateProps) {
  // Trading-related state
  const [activeTab, setActiveTab] = useState('buy')
  const [amount, setAmount] = useState('')
  const [selectedOutcomeForOrder, setSelectedOutcomeForOrder] = useState<string | null>(null)
  const [yesNoSelection, setYesNoSelection] = useState<'yes' | 'no' | null>('yes')
  const [isLoading, setIsLoading] = useState(false)
  const [showWinCard, setShowWinCard] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null)

  // Utility functions
  const getSelectedOutcome = useCallback(
    () => {
      if (!selectedOutcomeForOrder) {
        return event.outcomes[0] || null
      }
      return event.outcomes.find(o => o.id === selectedOutcomeForOrder) || null
    },
    [event.outcomes, selectedOutcomeForOrder],
  )

  const getYesOutcome = useCallback(
    () => event.outcomes.find(o => o.isYes === true),
    [event.outcomes],
  )

  const isMultiMarket = useMemo(() => event.active_markets_count > 1, [event])

  const yesOutcome = getYesOutcome()
  const primaryProbability = yesOutcome
    ? yesOutcome.probability
    : event.outcomes[0]?.probability || 0

  // Calculate prices in cents
  const yesPrice = Math.round(primaryProbability)
  const noPrice = 100 - yesPrice

  // Function to format values with 2 decimal places
  function formatValue(value: number): string {
    return value.toFixed(2)
  }

  // Function to limit decimal places while typing
  function limitDecimalPlaces(
    value: string,
    maxDecimals: number = 2,
  ): string {
    // Remove non-numeric characters except dot
    const cleaned = value.replace(/[^0-9.]/g, '')

    // Allow only one decimal point
    const parts = cleaned.split('.')
    if (parts.length > 2) {
      return `${parts[0]}.${parts[1]}`
    }

    // Limit decimal places
    if (parts.length === 2 && parts[1].length > maxDecimals) {
      return `${parts[0]}.${parts[1].substring(0, maxDecimals)}`
    }

    return cleaned
  }

  return {
    // State
    activeTab,
    setActiveTab,
    amount,
    setAmount,
    selectedOutcomeForOrder,
    setSelectedOutcomeForOrder,
    yesNoSelection,
    setYesNoSelection,
    isLoading,
    setIsLoading,
    showWinCard,
    setShowWinCard,
    claiming,
    setClaiming,
    claimed,
    setClaimed,
    inputRef,
    setInputRef,

    // Computed values
    getSelectedOutcome,
    getYesOutcome,
    yesOutcome,
    primaryProbability,
    yesPrice,
    noPrice,
    isMultiMarket,

    // Utility functions
    formatValue,
    limitDecimalPlaces,
  }
}
