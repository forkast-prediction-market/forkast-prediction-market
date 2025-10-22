import { NextResponse } from 'next/server'
import { z } from 'zod'
import { fetchOpenRouterModels } from '@/lib/ai/openrouter'
import { UserRepository } from '@/lib/db/queries/user'

const RequestSchema = z.object({
  apiKey: z.string().min(16, 'API key is required.'),
})

export async function POST(request: Request) {
  try {
    const currentUser = await UserRepository.getCurrentUser()
    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
    }

    const payload = await request.json().catch(() => null)
    const parsed = RequestSchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 })
    }

    const models = await fetchOpenRouterModels(parsed.data.apiKey)

    return NextResponse.json({
      models: models.map(model => ({
        id: model.id,
        label: model.name,
        contextWindow: model.contextLength,
      })),
    })
  }
  catch (error) {
    console.error('Failed to fetch OpenRouter models', error)
    return NextResponse.json({ error: 'Unable to load models from OpenRouter.' }, { status: 502 })
  }
}
