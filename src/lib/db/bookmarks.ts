import { supabaseAdmin } from '@/lib/supabase'

export async function toggleBookmark(userId: number, eventId: number) {
  const { data: existing, error } = await supabaseAdmin
    .from('bookmarks')
    .select('event_id')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (error) {
    console.error(error)
    return { error: 'Could not find bookmark' }
  }

  if (existing) {
    const { error } = await supabaseAdmin
      .from('bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId)

    if (error) {
      console.error(error)
      return { error: 'Could not delete bookmark' }
    }

    return { success: true }
  }
  else {
    const { error } = await supabaseAdmin
      .from('bookmarks')
      .insert({ user_id: userId, event_id: eventId })
      .select()

    if (error) {
      console.error(error)
      return { error: 'Could not insert bookmark' }
    }

    return { success: true }
  }
}
