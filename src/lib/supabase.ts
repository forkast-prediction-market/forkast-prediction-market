import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export function getSupabaseImageUrl(iconPath: string | null): string {
  if (!iconPath) {
    return 'https://avatar.vercel.sh/creator.png'
  }

  const supabaseUrl = process.env.SUPABASE_URL
  if (!supabaseUrl) {
    return 'https://avatar.vercel.sh/creator.png'
  }

  return `${supabaseUrl}/storage/v1/object/public/forkast-assets/${iconPath}`
}
