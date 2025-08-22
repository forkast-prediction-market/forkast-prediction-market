'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getCurrentUser, updateCurrentUser } from '@/lib/db/users'
import { supabaseAdmin } from '@/lib/supabase'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export interface ActionState {
  message?: string
  errors?: {
    email?: string
    username?: string
    bio?: string
    image?: string
  }
}

const updateUserSchema = z.object({
  email: z.email({ pattern: z.regexes.html5Email, error: 'Invalid email address' }),
  username: z.string().min(2, { error: 'Username must be at least 2 characters' }),
  bio: z.string().max(500, { error: 'Bio must be less than 500 characters' }),
  image: z
    .instanceof(File)
    .optional()
    .refine((file) => {
      if (!file || file.size === 0) {
        return true
      }

      return file.size <= MAX_FILE_SIZE
    }, { error: 'Image must be less than 5MB' })
    .refine((file) => {
      if (!file || file.size === 0) {
        return true
      }

      return ACCEPTED_IMAGE_TYPES.includes(file.type)
    }, { error: 'Only JPG, PNG, and WebP images are allowed' }),
})

export async function updateUser(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { message: 'Not authenticated' }
    }

    const imageFile = formData.get('image') as File

    const rawData = {
      email: formData.get('email') as string,
      username: formData.get('username') as string,
      bio: formData.get('bio') as string,
      image: imageFile && imageFile.size > 0 ? imageFile : undefined,
    }

    const validatedData = updateUserSchema.parse(rawData)

    let imageUrl
    if (validatedData.image && validatedData.image.size > 0) {
      const fileExt = validatedData.image.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`

      const { error } = await supabaseAdmin.storage
        .from('forkast-assets')
        .upload(fileName, validatedData.image, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        return {
          errors: { image: 'Failed to upload image' },
        }
      }

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('forkast-assets')
        .getPublicUrl(fileName)

      imageUrl = publicUrl
    }

    const updateData = {
      email: validatedData.email,
      username: validatedData.username,
      bio: validatedData.bio,
      ...(imageUrl && { image: imageUrl }),
    }

    await updateCurrentUser(user.id, updateData)

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
