import { createClient } from '@supabase/supabase-js'
import 'server-only'

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export function getSupabaseImageUrl(iconPath: string | null): string {
  const supabaseUrl = process.env.SUPABASE_URL

  if (!iconPath || !supabaseUrl) {
    return 'https://avatar.vercel.sh/creator.png'
  }

  return `${supabaseUrl}/storage/v1/object/public/kuest-assets/${iconPath}`
}
