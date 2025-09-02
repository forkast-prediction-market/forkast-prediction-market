import { supabaseAdmin } from '@/lib/supabase'

export const BookmarkModel = {
  async toggleBookmark(userId: string, eventId: string) {
    const { data: existing, error } = await supabaseAdmin
      .from('bookmarks')
      .select('event_id')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .maybeSingle()

    if (error) {
      console.error('Could not find bookmark.', error)
      return { data: null, error: 'Could not find bookmark.' }
    }

    if (existing) {
      const { error } = await supabaseAdmin
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId)

      if (error) {
        console.error('Could not delete bookmark.', error)
        return { data: null, error: 'Could not delete bookmark.' }
      }

      return { data: null, error: null }
    }
    else {
      const { error } = await supabaseAdmin
        .from('bookmarks')
        .insert({ user_id: userId, event_id: eventId })
        .select()

      if (error) {
        console.error('Could not insert bookmark.', error)
        return { data: null, error: 'Could not insert bookmark.' }
      }

      return { data: null, error: null }
    }
  },
}
