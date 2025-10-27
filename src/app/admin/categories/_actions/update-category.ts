'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { cacheTags } from '@/lib/cache-tags'
import { TagRepository } from '@/lib/db/queries/tag'
import { UserRepository } from '@/lib/db/queries/user'

const UpdateCategoryInputSchema = z.object({
  is_main_category: z.boolean().optional(),
  is_hidden: z.boolean().optional(),
  hide_events: z.boolean().optional(),
})

export interface UpdateCategoryInput {
  is_main_category?: boolean
  is_hidden?: boolean
  hide_events?: boolean
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
  categoryId: number,
  input: UpdateCategoryInput,
): Promise<UpdateCategoryResult> {
  try {
    const parsed = UpdateCategoryInputSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Invalid input.',
      }
    }

    const currentUser = await UserRepository.getCurrentUser()
    if (!currentUser || !currentUser.is_admin) {
      return {
        success: false,
        error: 'Unauthorized. Admin access required.',
      }
    }

    const { data, error } = await TagRepository.updateTagById(categoryId, parsed.data)

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
    revalidateTag(cacheTags.events(currentUser.id), 'max')

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
