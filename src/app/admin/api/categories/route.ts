import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { TagRepository } from '@/lib/db/tag'
import { UserRepository } from '@/lib/db/user'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await UserRepository.getCurrentUser()
    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    const limit = Number.parseInt(searchParams.get('limit') ?? '50', 10)
    const offset = Number.parseInt(searchParams.get('offset') ?? '0', 10)
    const search = searchParams.get('search') ?? undefined
    const sortByParam = searchParams.get('sortBy') as 'name' | 'slug' | 'display_order' | 'created_at' | 'updated_at' | null
    const sortOrderParam = searchParams.get('sortOrder') as 'asc' | 'desc' | null

    const { data, error, totalCount } = await TagRepository.listTags({
      limit: Number.isNaN(limit) ? 50 : limit,
      offset: Number.isNaN(offset) ? 0 : offset,
      search,
      sortBy: sortByParam ?? undefined,
      sortOrder: sortOrderParam ?? undefined,
    })

    if (error) {
      console.error('Error fetching admin tags:', error)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    const transformed = data.map(({ parent, ...tag }) => ({
      ...tag,
      parent_name: parent?.name ?? null,
      parent_slug: parent?.slug ?? null,
    }))

    return NextResponse.json({
      data: transformed,
      totalCount,
    })
  }
  catch (error) {
    console.error('Admin categories GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await UserRepository.getCurrentUser()
    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const payload = await request.json()
    const id = Number.parseInt(payload?.id?.toString() ?? '', 10)
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Invalid category id' }, { status: 400 })
    }

    const updates: { is_main_category?: boolean, is_hidden?: boolean } = {}
    if (Object.prototype.hasOwnProperty.call(payload, 'is_main_category')) {
      if (typeof payload.is_main_category !== 'boolean') {
        return NextResponse.json({ error: 'Field is_main_category must be boolean' }, { status: 400 })
      }
      updates.is_main_category = payload.is_main_category
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'is_hidden')) {
      if (typeof payload.is_hidden !== 'boolean') {
        return NextResponse.json({ error: 'Field is_hidden must be boolean' }, { status: 400 })
      }
      updates.is_hidden = payload.is_hidden
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: 'No valid fields supplied' }, { status: 400 })
    }

    const { data, error } = await TagRepository.updateTagById(id, updates)
    if (error || !data) {
      console.error('Error updating admin tag:', error)
      return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
    }

    const { parent, ...rest } = data
    const response = {
      ...rest,
      parent_name: parent?.name ?? null,
      parent_slug: parent?.slug ?? null,
    }

    return NextResponse.json({ data: response })
  }
  catch (error) {
    console.error('Admin categories PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
