import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    // Fetch global trading statistics
    const [
      { data: globalOrders },
      { data: globalOI },
      { data: globalUSDC },
      { data: topMarkets },
      { data: recentFills },
    ] = await Promise.all([
      // Global order statistics
      supabaseAdmin.from('orders_matched_global').select('*').single(),

      // Open Interest global
      supabaseAdmin.from('global_open_interest').select('*').single(),

      // Balance USDC global
      supabaseAdmin.from('global_usdc_balance').select('*').single(),

      // Top 10 mercados por volume
      supabaseAdmin
        .from('markets')
        .select(
          `
          condition_id,
          name,
          slug,
          total_volume,
          current_volume_24h,
          open_interest,
          event:events(title, slug, icon_url)
        `,
        )
        .eq('is_active', true)
        .order('total_volume', { ascending: false })
        .limit(10),

      // Last 20 transactions
      supabaseAdmin
        .from('order_fills')
        .select(
          `
          *,
          markets(name, slug, event:events(title, slug))
        `,
        )
        .order('timestamp', { ascending: false })
        .limit(20),
    ])

    // Calculate additional statistics
    const totalActiveMarkets = await supabaseAdmin
      .from('markets')
      .select('condition_id', { count: 'exact' })
      .eq('is_active', true)

    const totalUsers = await supabaseAdmin
      .from('user_position_balances')
      .select('user_address', { count: 'exact' })
      .gt('balance', 0)

    const response = {
      global_stats: {
        total_trades: globalOrders?.trades_quantity || 0,
        total_buys: globalOrders?.buys_quantity || 0,
        total_sells: globalOrders?.sells_quantity || 0,
        total_volume: globalOrders?.collateral_volume || 0,
        total_buy_volume: globalOrders?.collateral_buy_volume || 0,
        total_sell_volume: globalOrders?.collateral_sell_volume || 0,
        global_open_interest: globalOI?.amount || 0,
        global_usdc_balance: globalUSDC?.balance || 0,
        total_active_markets: totalActiveMarkets.count || 0,
        total_active_users: totalUsers.count || 0,
      },
      top_markets: topMarkets || [],
      recent_fills: recentFills || [],
    }

    return NextResponse.json(response)
  }
  catch (error) {
    console.error('Error in trading stats API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
