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

export const AffiliateModel = {
  async getForkSettings() {
    const { data, error } = await supabaseAdmin
      .from('fork_settings')
      .select('trade_fee_bps, affiliate_share_bps, updated_at')
      .eq('singleton', true)
      .maybeSingle()

    if (error) {
      return { data: null, error }
    }

    if (!data) {
      // Ensure default row exists
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('fork_settings')
        .upsert({ singleton: true }, { onConflict: 'singleton' })
        .select('trade_fee_bps, affiliate_share_bps, updated_at')
        .single()

      return { data: inserted, error: insertError }
    }

    return { data, error: null }
  },

  async updateForkSettings(input: { trade_fee_bps: number, affiliate_share_bps: number }) {
    const { data, error } = await supabaseAdmin
      .from('fork_settings')
      .upsert({
        singleton: true,
        trade_fee_bps: input.trade_fee_bps,
        affiliate_share_bps: input.affiliate_share_bps,
      }, { onConflict: 'singleton' })
      .select('trade_fee_bps, affiliate_share_bps, updated_at')
      .single()

    return { data, error }
  },

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
    const normalized = code.trim().toLowerCase()

    if (!normalized) {
      return { data: null, error: null }
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, affiliate_code, username, address, image')
      .filter('affiliate_code', 'ilike', normalized)
      .maybeSingle()

    return { data, error }
  },

  async getReferral(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('affiliate_referrals')
      .select('user_id, affiliate_user_id, source, attributed_at')
      .eq('user_id', userId)
      .maybeSingle()

    return { data, error }
  },

  async recordReferral(args: { user_id: string, affiliate_user_id: string, source?: string }) {
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
        source: args.source,
        attributed_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select('user_id, affiliate_user_id, source, attributed_at')
      .single()

    if (!error) {
      await supabaseAdmin
        .from('users')
        .update({
          referred_by_user_id: args.affiliate_user_id,
          referred_at: new Date().toISOString(),
        })
        .eq('id', args.user_id)
        .is('referred_by_user_id', null)
    }

    return { data, error }
  },

  async getUserAffiliateStats(userId: string) {
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
    const { data, error } = await supabaseAdmin.rpc('get_affiliate_overview')

    return { data, error }
  },

  async getAffiliateProfiles(userIds: string[]) {
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
    const { data, error } = await supabaseAdmin
      .from('affiliate_referrals')
      .select(`
        user_id,
        attributed_at,
        users:users!affiliate_referrals_user_id_fkey (username, address, image)
      `)
      .eq('affiliate_user_id', affiliateUserId)
      .order('attributed_at', { ascending: false })
      .limit(limit)

    return { data, error }
  },
}
