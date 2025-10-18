'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { TagRepository } from '@/lib/db/tag'
import { UserRepository } from '@/lib/db/user'

const UpdateCategoryInputSchema = z.object({
  id: z.number().int().positive('Category ID must be a positive integer'),
  is_main_category: z.boolean().optional(),
  is_hidden: z.boolean().optional(),
}).refine(
  data => data.is_main_category !== undefined || data.is_hidden !== undefined,
  {
    message: 'At least one field (is_main_category or is_hidden) must be provided',
  },
)

export interface UpdateCategoryInput {
  id: number
  is_main_category?: boolean
  is_hidden?: boolean
}

export interface UpdateCategoryResult {
  success: boolean
  data?: {
    id: number
    name: string
    slug: string
    is_main_category: boolean
    is_hidden: boolean
    display_order: number
    parent_tag_id: number | null
    parent_name: string | null
    parent_slug: string | null
    active_markets_count: number
    created_at: string
    updated_at: string
  }
  error?: string
}

export async function updateCategoryAction(
  input: UpdateCategoryInput,
): Promise<UpdateCategoryResult> {
  try {
    const validationResult = UpdateCategoryInputSchema.safeParse(input)
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((err: any) => `${err.path.join('.')}: ${err.message}`)
        .join(', ')

      return {
        success: false,
        error: `Validation error: ${errorMessage}`,
      }
    }

    const { id, is_main_category, is_hidden } = validationResult.data

    const currentUser = await UserRepository.getCurrentUser()
    if (!currentUser || !currentUser.is_admin) {
      return {
        success: false,
        error: 'Unauthorized. Admin access required.',
      }
    }

    const updates: { is_main_category?: boolean, is_hidden?: boolean } = {}
    if (is_main_category !== undefined) {
      updates.is_main_category = is_main_category
    }
    if (is_hidden !== undefined) {
      updates.is_hidden = is_hidden
    }

    const { data, error } = await TagRepository.updateTagById(id, updates)

    if (error || !data) {
      console.error('Error updating category:', error)
      return {
        success: false,
        error: 'Failed to update category. Please try again.',
      }
    }

    const { parent, ...rest } = data
    const transformedData = {
      ...rest,
      parent_name: parent?.name ?? null,
      parent_slug: parent?.slug ?? null,
    }

    revalidatePath('/admin/categories')
    revalidatePath('/')

    return {
      success: true,
      data: transformedData,
    }
  }
  catch (error) {
    console.error('Server action error:', error)
    return {
      success: false,
      error: 'Internal server error. Please try again.',
    }
  }
}
