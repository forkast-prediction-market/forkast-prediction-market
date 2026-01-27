import { useExtracted } from 'next-intl'

type OutcomeLabel = string | null | undefined

export function useOutcomeLabel() {
  const t = useExtracted('Event.Trade')

  return function normalizeOutcomeLabel(label: OutcomeLabel) {
    if (label === 'Yes') {
      return t('Yes')
    }
    if (label === 'No') {
      return t('No')
    }
    return label ?? undefined
  }
}
