import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await params
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '50'

    // Fetch user positions with market data
    const { data: positions, error } = await supabaseAdmin
      .from('user_position_balances')
      .select(
        `
        *,
        markets!inner(
          condition_id,
          name,
          slug,
          icon_url,
          is_active,
          is_resolved,
          event:events(
            id,
            slug,
            title,
            icon_url
          )
        ),
        outcomes!inner(
          outcome_text,
          outcome_index,
          current_price,
          is_winning_outcome
        )
      `,
      )
      .eq('user_address', address.toLowerCase())
      .gt('balance', 0)
      .order('last_updated_timestamp', { ascending: false })
      .limit(Number.parseInt(limit))

    if (error) {
      console.error('Error fetching user positions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch positions' },
        { status: 500 },
      )
    }

    // Calculate user statistics
    const totalValue
      = positions?.reduce((sum, pos) => {
        const currentValue = pos.balance * (pos.outcomes?.current_price || 0)
        return sum + currentValue
      }, 0) || 0

    const totalCost
      = positions?.reduce((sum, pos) => sum + pos.total_cost, 0) || 0
    const totalRealizedPnL
      = positions?.reduce((sum, pos) => sum + pos.realized_pnl, 0) || 0
    const totalUnrealizedPnL
      = positions?.reduce((sum, pos) => sum + pos.unrealized_pnl, 0) || 0

    const response = {
      positions: positions || [],
      summary: {
        total_positions: positions?.length || 0,
        total_value: totalValue,
        total_cost: totalCost,
        total_realized_pnl: totalRealizedPnL,
        total_unrealized_pnl: totalUnrealizedPnL,
        total_pnl: totalRealizedPnL + totalUnrealizedPnL,
      },
    }

    return NextResponse.json(response)
  }
  catch (error) {
    console.error('Error in user positions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
