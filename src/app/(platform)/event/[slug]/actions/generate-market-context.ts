'use server'

import { z } from 'zod'
import { generateMarketContext } from '@/lib/ai/market-context'
import { isOpenRouterConfigured } from '@/lib/ai/openrouter'
import { EventModel } from '@/lib/db/events'

const GenerateMarketContextSchema = z.object({
  slug: z.string(),
  marketConditionId: z.string().optional(),
})

type GenerateMarketContextInput = z.infer<typeof GenerateMarketContextSchema>

export async function generateMarketContextAction(input: GenerateMarketContextInput) {
  if (!isOpenRouterConfigured()) {
    return { error: 'Market context generation is not configured.' }
  }

  const parsed = GenerateMarketContextSchema.safeParse(input)

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid request.' }
  }

  try {
    const { slug, marketConditionId } = parsed.data
    const { data: event, error } = await EventModel.getEventBySlug(slug, '')

    if (error || !event) {
      console.error('Failed to fetch event for market context.', error)
      return { error: 'Event could not be located.' }
    }

    const market = event.markets.find(candidate => candidate.condition_id === marketConditionId) ?? event.markets[0]

    if (!market) {
      return { error: 'No markets available for this event.' }
    }

    const context = await generateMarketContext(event, market)
    return { context }
  }
  catch (error) {
    console.error('Failed to generate market context.', error)
    return { error: 'Unable to generate market context. Please try again shortly.' }
  }
}
