'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { OrderModel } from '@/lib/db/orders'
import { UserModel } from '@/lib/db/users'

const StoreOrderSchema = z.object({
  condition_id: z.string(),
  outcome_index: z.coerce.number().int().min(0).max(1),
  side: z.enum(['buy', 'sell']),
  amount: z.coerce.number().positive(),
  price: z.coerce.number().positive().optional(),
  order_type: z.enum(['market', 'limit']).default('market'),
  slug: z.string(),
})

export async function storeOrderAction(formData: FormData) {
  const user = await UserModel.getCurrentUser()
  if (!user) {
    return { error: 'Unauthenticated.' }
  }

  const validated = StoreOrderSchema.safeParse({
    condition_id: formData.get('condition_id'),
    outcome_index: formData.get('outcome_index'),
    side: formData.get('side'),
    amount: formData.get('amount'),
    price: formData.get('price'),
    order_type: formData.get('order_type'),
    slug: formData.get('slug'),
  })

  if (!validated.success) {
    return {
      error: validated.error.issues[0].message,
    }
  }

  const { slug, ...orderPayload } = validated.data

  try {
    const { error } = await OrderModel.createOrder({
      ...orderPayload,
      user_id: user.id,
    })

    if (error) {
      console.error('Failed to create order.', error)
      return { error: 'Failed to create order.' }
    }

    revalidatePath(`/event/${slug}`)
  }
  catch {
    return { error: 'An unknown error occurred.' }
  }
}
