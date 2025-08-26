'use server'

import { Buffer } from 'node:buffer'
import { revalidatePath } from 'next/cache'
import sharp from 'sharp'
import { z } from 'zod'
import { getCurrentUser, updateUserProfileById } from '@/lib/db/users'
import { supabaseAdmin } from '@/lib/supabase'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export interface ActionState {
  error?: string
  errors?: Record<string, string | undefined>
}

const updateUserSchema = z.object({
  email: z.email({ pattern: z.regexes.html5Email, error: 'Invalid email address.' }),
  username: z
    .string()
    .min(1, 'Username must be at least 1 character long')
    .max(30, 'Username must be at most 30 characters long')
    .regex(/^[\w.]+$/, 'Only letters, numbers, dots and underscores are allowed')
    .regex(/^(?!\.)/, 'Cannot start with a dot')
    .regex(/(?<!\.)$/, 'Cannot end with a dot'),
  bio: z.string().max(500, { error: 'Bio must be less than 500 characters.' }),
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

export async function updateUserAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { error: 'Not authenticated.' }
    }

    const imageFile = formData.get('image') as File

    const rawData = {
      email: formData.get('email') as string,
      username: formData.get('username') as string,
      bio: formData.get('bio') as string,
      image: imageFile && imageFile.size > 0 ? imageFile : undefined,
    }

    const validated = updateUserSchema.parse(rawData)

    const updateData = {
      email: validated.email,
      username: validated.username,
      bio: validated.bio,
      image: user.image,
    }

    if (validated.image && validated.image.size > 0) {
      updateData.image = await uploadImage(user, validated.image)
    }

    const result = await updateUserProfileById(user.id, updateData)

    if ('error' in result) {
      if (typeof result.error === 'string') {
        return { error: result.error }
      }

      return { errors: result.error }
    }

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

    return { error: 'Failed to update user.' }
  }
}

async function uploadImage(user: any, image: File) {
  const fileExt = image.name.split('.').pop()
  const fileName = `${user.id}-${Date.now()}.${fileExt}`

  const buffer = Buffer.from(await image.arrayBuffer())

  const resizedBuffer = await sharp(buffer)
    .resize(100, 100, { fit: 'cover' })
    .jpeg({ quality: 90 })
    .toBuffer()

  const { error } = await supabaseAdmin.storage
    .from('forkast-assets')
    .upload(fileName, resizedBuffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: image.type,
    })

  if (error) {
    return user.image
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('forkast-assets')
    .getPublicUrl(fileName)

  return publicUrl
}
