import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ condition_id: string }> },
) {
  try {
    const { condition_id } = await params

    // Fetch complete market data with trading data
    const { data: market, error: marketError } = await supabaseAdmin
      .from('markets')
      .select(
        `
        *,
        event:events(*),
        outcomes(
          id,
          condition_id,
          outcome_text,
          outcome_index,
          token_id,
          is_winning_outcome,
          payout_value,
          current_price,
          volume_24h,
          total_volume
        )
      `,
      )
      .eq('condition_id', condition_id)
      .single()

    if (marketError) {
      console.error('Error fetching market:', marketError)
      return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    }

    // Fetch condition data (blockchain data)
    const { data: condition, error: conditionError } = await supabaseAdmin
      .from('conditions')
      .select('*')
      .eq('id', condition_id)
      .single()

    if (conditionError) {
      console.error('Error fetching condition:', conditionError)
    }

    // Fetch recent fills (last 50 transactions)
    const { data: recentFills, error: fillsError } = await supabaseAdmin
      .from('order_fills')
      .select('*')
      .eq('condition_id', condition_id)
      .order('timestamp', { ascending: false })
      .limit(50)

    if (fillsError) {
      console.error('Error fetching fills:', fillsError)
    }

    // Fetch user positions (top 20 by balance)
    const { data: topPositions, error: positionsError } = await supabaseAdmin
      .from('user_position_balances')
      .select('*')
      .eq('condition_id', condition_id)
      .gt('balance', 0)
      .order('balance', { ascending: false })
      .limit(20)

    if (positionsError) {
      console.error('Error fetching positions:', positionsError)
    }

    const response = {
      market,
      condition: condition || null,
      recent_fills: recentFills || [],
      top_positions: topPositions || [],
    }

    return NextResponse.json(response)
  }
  catch (error) {
    console.error('Error in market API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
