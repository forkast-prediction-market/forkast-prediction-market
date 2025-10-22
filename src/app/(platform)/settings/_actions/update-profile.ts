'use server'

import { Buffer } from 'node:buffer'
import { revalidatePath } from 'next/cache'
import sharp from 'sharp'
import { z } from 'zod'
import { UserRepository } from '@/lib/db/queries/user'
import { supabaseAdmin } from '@/lib/supabase'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export interface ActionState {
  error?: string
  errors?: Record<string, string | undefined>
}

const UpdateUserSchema = z.object({
  email: z.email({ pattern: z.regexes.html5Email, error: 'Invalid email address.' }),
  username: z
    .string()
    .min(1, 'Username must be at least 1 character long')
    .max(30, 'Username must be at most 30 characters long')
    .regex(/^[\w.]+$/, 'Only letters, numbers, dots and underscores are allowed')
    .regex(/^(?!\.)/, 'Cannot start with a dot')
    .regex(/(?<!\.)$/, 'Cannot end with a dot'),
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

export async function updateUserAction(formData: FormData): Promise<ActionState> {
  try {
    const user = await UserRepository.getCurrentUser()
    if (!user) {
      return { error: 'Unauthenticated.' }
    }

    const imageFile = formData.get('image') as File

    const rawData = {
      email: formData.get('email') as string,
      username: formData.get('username') as string,
      image: imageFile && imageFile.size > 0 ? imageFile : undefined,
    }

    const validated = UpdateUserSchema.safeParse(rawData)
    if (!validated.success) {
      const errors: ActionState['errors'] = {}
      validated.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0] as keyof typeof errors] = issue.message
        }
      })

      return { errors }
    }

    const updateData = {
      ...validated.data,
    }

    if (validated.data.image && validated.data.image.size > 0) {
      updateData.image = await uploadImage(user, validated.data.image)
    }

    const { error } = await UserRepository.updateUserProfileById(user.id, updateData)
    if (error) {
      if (typeof error === 'string') {
        return { error }
      }

      return { errors: error }
    }

    revalidatePath('/settings')
    return {}
  }
  catch {
    return { error: 'Failed to update user.' }
  }
}

async function uploadImage(user: any, image: File) {
  const fileName = `users/avatars/${user.id}-${Date.now()}.jpg`

  const buffer = Buffer.from(await image.arrayBuffer())

  const resizedBuffer = await sharp(buffer)
    .resize(100, 100, { fit: 'cover' })
    .jpeg({ quality: 90 })
    .toBuffer()

  const { error } = await supabaseAdmin.storage
    .from('forkast-assets')
    .upload(fileName, resizedBuffer, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
    })

  if (error) {
    return user.image?.startsWith('http') ? null : user.image
  }

  return fileName
}
