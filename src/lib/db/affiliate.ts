import { randomBytes } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase'

const AFFILIATE_CODE_BYTES = 4

function generateAffiliateCode() {
  return randomBytes(AFFILIATE_CODE_BYTES).toString('hex')
}

async function generateUniqueAffiliateCode() {
  for (let i = 0; i < 10; i++) {
    const candidate = generateAffiliateCode()

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('affiliate_code', candidate)
      .maybeSingle()

    if (!error && !data) {
      return candidate
    }
  }

  throw new Error('Failed to generate unique affiliate code')
}

export const AffiliateRepository = {
  async ensureUserAffiliateCode(userId: string) {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('affiliate_code')
      .eq('id', userId)
      .single()

    if (error) {
      return { data: null, error }
    }

    if (user.affiliate_code) {
      return { data: user.affiliate_code, error: null }
    }

    const code = await generateUniqueAffiliateCode()

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ affiliate_code: code })
      .eq('id', userId)
      .select('affiliate_code')
      .single()

    return { data: updated?.affiliate_code ?? null, error: updateError }
  },

  async getAffiliateByCode(code: string) {
    'use cache'

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, affiliate_code, username, address, image')
      .filter('affiliate_code', 'ilike', code)
      .maybeSingle()

    return { data, error }
  },

  async getReferral(userId: string) {
    'use cache'

    const { data, error } = await supabaseAdmin
      .from('affiliate_referrals')
      .select('user_id, affiliate_user_id, created_at, affiliate_user:users!affiliate_user_id(address)')
      .eq('user_id', userId)
      .maybeSingle()

    return { data, error }
  },

  async recordReferral(args: { user_id: string, affiliate_user_id: string }) {
    if (args.user_id === args.affiliate_user_id) {
      return { data: null, error: 'Self referrals are not allowed.' }
    }

    const existingReferral = await supabaseAdmin
      .from('affiliate_referrals')
      .select('affiliate_user_id')
      .eq('user_id', args.user_id)
      .maybeSingle()

    if (existingReferral.data && existingReferral.data.affiliate_user_id === args.affiliate_user_id) {
      return { data: existingReferral.data, error: null }
    }

    const { data, error } = await supabaseAdmin
      .from('affiliate_referrals')
      .upsert({
        user_id: args.user_id,
        affiliate_user_id: args.affiliate_user_id,
      }, { onConflict: 'user_id' })
      .select('user_id, affiliate_user_id, source, created_at')
      .single()

    if (!error) {
      await supabaseAdmin
        .from('users')
        .update({
          referred_by_user_id: args.affiliate_user_id,
        })
        .eq('id', args.user_id)
        .is('referred_by_user_id', null)
    }

    return { data, error }
  },

  async getUserAffiliateStats(userId: string) {
    'use cache'

    const { data, error } = await supabaseAdmin.rpc('get_affiliate_stats', {
      target_user_id: userId,
    })

    if (error || !data) {
      return { data: null, error }
    }

    return {
      data: data.length > 0
        ? data[0]
        : {
            total_referrals: 0,
            active_referrals: 0,
            total_volume: 0,
            total_affiliate_fees: 0,
            total_fork_fees: 0,
          },
      error: null,
    }
  },

  async listAffiliateOverview() {
    'use cache'

    const { data, error } = await supabaseAdmin.rpc('get_affiliate_overview')

    return { data, error }
  },

  async getAffiliateProfiles(userIds: string[]) {
    'use cache'

    if (!userIds.length) {
      return { data: [] as any[], error: null }
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, username, address, image, affiliate_code')
      .in('id', userIds)

    return { data, error }
  },

  async listReferralsByAffiliate(affiliateUserId: string, limit = 20) {
    'use cache'

    const { data, error } = await supabaseAdmin
      .from('affiliate_referrals')
      .select(`
        user_id,
        created_at,
        users:users!affiliate_referrals_user_id_fkey (username, address, image)
      `)
      .eq('affiliate_user_id', affiliateUserId)
      .order('created_at', { ascending: false })
      .limit(limit)

    return { data, error }
  },
}
