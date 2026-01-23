import type { ChartSettings } from '@/app/[locale]/(platform)/event/[slug]/_components/EventChartControls'
import { defaultChartSettings } from '@/app/[locale]/(platform)/event/[slug]/_components/EventChartControls'

const STORAGE_KEY = 'event-chart-settings'

export function loadStoredChartSettings(): ChartSettings {
  if (typeof window === 'undefined') {
    return defaultChartSettings
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return defaultChartSettings
    }
    const parsed = JSON.parse(raw) as Partial<ChartSettings> | null
    if (!parsed || typeof parsed !== 'object') {
      return defaultChartSettings
    }
    return { ...defaultChartSettings, ...parsed }
  }
  catch {
    return defaultChartSettings
  }
}

export function storeChartSettings(settings: ChartSettings) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }
  catch {
  }
}
