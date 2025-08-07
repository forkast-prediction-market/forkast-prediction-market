import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mainOnly = searchParams.get('main') === 'true'

    let query = supabaseAdmin
      .from('tags')
      .select('*')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (mainOnly) {
      query = query.eq('is_main_category', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching tags:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tags' },
        { status: 500 },
      )
    }

    return NextResponse.json(data)
  }
  catch (error) {
    console.error('Error in tags API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
