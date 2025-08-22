'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getCurrentUser, updateCurrentUser } from '@/lib/db/users'

const updateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(2, 'Username must be at least 2 characters'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').nullable(),
})

export interface ActionState {
  errors?: {
    email?: string
    username?: string
    bio?: string
  }
  message?: string
}

export async function updateUser(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { message: 'Unauthenticated.' }
    }

    const rawData = {
      email: formData.get('email') as string,
      username: formData.get('username') as string,
      bio: formData.get('bio') as string,
    }

    const validatedData = updateUserSchema.parse(rawData)
    await updateCurrentUser(user.id, validatedData)

    revalidatePath('/settings')
    return {}
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ActionState['errors'] = {}

      error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0] as keyof typeof errors] = issue.message
        }
      })

      return { errors }
    }

    return { message: 'Failed to update user' }
  }
}
