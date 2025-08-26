'use server'

import { Buffer } from 'node:buffer'
import { revalidatePath } from 'next/cache'
import sharp from 'sharp'
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

export async function updateUserAction(
  _: ActionState,
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

      const buffer = Buffer.from(await validatedData.image.arrayBuffer())

      const resizedBuffer = await sharp(buffer)
        .resize(100, 100, { fit: 'cover' })
        .jpeg({ quality: 90 })
        .toBuffer()

      await supabaseAdmin.storage
        .from('forkast-assets')
        .upload(fileName, resizedBuffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: validatedData.image.type,
        })

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

    const result = await updateCurrentUser(user.id, updateData)

    if ('error' in result) {
      if (typeof result.error === 'string') {
        return { message: result.error }
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

    return { message: 'Failed to update user' }
  }
}
