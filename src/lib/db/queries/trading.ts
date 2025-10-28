import type { ClobConditionSnapshot } from '@/lib/clob/client'
import { eq, sql } from 'drizzle-orm'
import { markets, outcome_recent_trades, outcomes } from '@/lib/db/schema'
import { db } from '@/lib/drizzle'

function toNumericString(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toString()
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return value
  }

  return null
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const TradingRepository = {
  async upsertConditionSnapshots(snapshots: ClobConditionSnapshot[]) {
    if (!snapshots.length) {
      return
    }

    const now = new Date()

    await db.transaction(async (tx) => {
      for (const condition of snapshots) {
        const snapshotDate = toDate(condition.snapshot_ts) ?? now

        const totals = condition.outcomes.reduce<{ volume24h: number, volumeTotal: number }>(
          (accumulator, outcome) => {
            const volume24h = typeof outcome.rolling_24h_volume === 'number' ? outcome.rolling_24h_volume : 0
            const volumeTotal = typeof outcome.rolling_total_volume === 'number' ? outcome.rolling_total_volume : 0

            return {
              volume24h: accumulator.volume24h + volume24h,
              volumeTotal: accumulator.volumeTotal + volumeTotal,
            }
          },
          { volume24h: 0, volumeTotal: 0 },
        )

        await tx.update(markets)
          .set({
            current_volume_24h: toNumericString(totals.volume24h) ?? '0',
            total_volume: toNumericString(totals.volumeTotal) ?? '0',
            last_snapshot_at: snapshotDate,
            updated_at: now,
          })
          .where(eq(markets.condition_id, condition.condition_id))

        for (const outcomeSnapshot of condition.outcomes) {
          const currentPrice = toNumericString(outcomeSnapshot.last_trade_price)
            ?? toNumericString(outcomeSnapshot.best_bid_price)
            ?? toNumericString(outcomeSnapshot.best_ask_price)

          await tx.update(outcomes)
            .set({
              best_bid_price: toNumericString(outcomeSnapshot.best_bid_price),
              best_bid_size: toNumericString(outcomeSnapshot.best_bid_size),
              best_ask_price: toNumericString(outcomeSnapshot.best_ask_price),
              best_ask_size: toNumericString(outcomeSnapshot.best_ask_size),
              open_interest: toNumericString(outcomeSnapshot.open_interest),
              current_price: currentPrice,
              last_trade_price: toNumericString(outcomeSnapshot.last_trade_price),
              last_trade_ts: toDate(outcomeSnapshot.last_trade_ts) ?? null,
              volume_24h: toNumericString(outcomeSnapshot.rolling_24h_volume) ?? '0',
              total_volume: toNumericString(outcomeSnapshot.rolling_total_volume) ?? '0',
              snapshot_ts: snapshotDate,
              updated_at: now,
            })
            .where(eq(outcomes.token_id, outcomeSnapshot.token_id))

          if (outcomeSnapshot.recent_trades?.length) {
            const tradeValues = outcomeSnapshot.recent_trades.map(trade => ({
              trade_id: trade.trade_id,
              token_id: trade.token_id,
              price: toNumericString(trade.price) ?? '0',
              size: toNumericString(trade.size) ?? '0',
              side: trade.side,
              executed_at: toDate(trade.executed_at) ?? now,
              buyer_order_id: trade.buyer_order_id ?? null,
              seller_order_id: trade.seller_order_id ?? null,
              inserted_at: now,
            }))

            if (tradeValues.length > 0) {
              await tx.insert(outcome_recent_trades)
                .values(tradeValues)
                .onConflictDoUpdate({
                  target: outcome_recent_trades.trade_id,
                  set: {
                    price: sql`EXCLUDED.price`,
                    size: sql`EXCLUDED.size`,
                    side: sql`EXCLUDED.side`,
                    executed_at: sql`EXCLUDED.executed_at`,
                    buyer_order_id: sql`EXCLUDED.buyer_order_id`,
                    seller_order_id: sql`EXCLUDED.seller_order_id`,
                    inserted_at: sql`EXCLUDED.inserted_at`,
                  },
                })
            }
          }
        }
      }
    })
  },
}
