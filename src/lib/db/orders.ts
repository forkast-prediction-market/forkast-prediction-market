import { supabaseAdmin } from '@/lib/supabase'

export async function getUserBalance(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_balances')
    .select('available_balance, locked_balance, total_balance')
    .eq('user_id', userId)
    .single()

  return { data, error }
}

export async function getUserPositions(userId: string, conditionId?: string) {
  let query = supabaseAdmin
    .from('user_positions')
    .select(`
      condition_id,
      outcome_index,
      shares_owned,
      average_cost_basis,
      total_cost_basis,
      realized_pnl,
      outcomes!inner(
        outcome_text,
        current_price
      )
    `)
    .eq('user_id', userId)
    .gt('shares_owned', 0)

  if (conditionId) {
    query = query.eq('condition_id', conditionId)
  }

  const { data, error } = await query

  return { data, error }
}

export async function getUserOrders(userId: string, status?: string) {
  let query = supabaseAdmin
    .from('orders')
    .select(`
      *,
      outcomes!inner(
        outcome_text,
        current_price
      )
    `)
    .eq('user_id', userId)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  return { data, error }
}

export async function createOrder(orderData: {
  userId: string
  conditionId: string
  outcomeIndex: number
  side: 'buy' | 'sell'
  amount: number
  price?: number
  orderType?: 'market' | 'limit'
}) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .insert({
      user_id: orderData.userId,
      condition_id: orderData.conditionId,
      outcome_index: orderData.outcomeIndex,
      order_type: orderData.orderType || 'market',
      side: orderData.side,
      amount: orderData.amount,
      price: orderData.price,
      status: 'pending',
      filled_amount: 0,
      remaining_amount: orderData.amount,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create order: ${error.message}`)
  }

  return { data, error }
}

export async function cancelOrder(orderId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to cancel order: ${error.message}`)
  }

  return { data, error }
}

export async function getOrderBook(conditionId: string, outcomeIndex: number) {
  const { data, error } = await supabaseAdmin
    .from('v_order_book')
    .select('*')
    .eq('condition_id', conditionId)
    .eq('outcome_index', outcomeIndex)

  return { data, error }
}
