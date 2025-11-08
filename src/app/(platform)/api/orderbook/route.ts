import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'

interface OrderbookLevelSummary {
  price: string
  size: string
}

interface ClobOrderbookSummary {
  asset_id: string
  bids?: OrderbookLevelSummary[]
  asks?: OrderbookLevelSummary[]
}

interface LastTradePriceEntry {
  token_id: string
  price: string
  side: 'BUY' | 'SELL'
}

interface CombinedOrderBookEntry {
  bids?: OrderbookLevelSummary[]
  asks?: OrderbookLevelSummary[]
  spread?: string
  last_trade_price?: string
  last_trade_side?: 'BUY' | 'SELL'
}

type SpreadResponse = Record<string, string>

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tokenIds = extractTokenIds(searchParams)

  if (tokenIds.length === 0) {
    return NextResponse.json(
      { error: 'At least one token_id is required' },
      { status: 400 },
    )
  }

  const payload = tokenIds.map(tokenId => ({ token_id: tokenId }))

  try {
    const [orderBooks, spreads, lastTrades] = await Promise.all([
      fetchClobJson<ClobOrderbookSummary[]>('/books', payload),
      fetchClobJson<SpreadResponse>('/spreads', payload).catch((error) => {
        console.error('Failed to fetch spreads', error)
        return null
      }),
      fetchClobJson<LastTradePriceEntry[]>('/last-trades-prices', payload).catch((error) => {
        console.error('Failed to fetch last trades prices', error)
        return null
      }),
    ])

    if (!Array.isArray(orderBooks)) {
      throw new TypeError('Unexpected response format from /books')
    }

    const orderBookByToken = new Map<string, ClobOrderbookSummary>()
    orderBooks.forEach((entry) => {
      if (entry?.asset_id) {
        orderBookByToken.set(entry.asset_id, entry)
      }
    })

    const lastTradesByToken = new Map<string, LastTradePriceEntry>()
    lastTrades?.forEach((entry) => {
      if (entry?.token_id) {
        lastTradesByToken.set(entry.token_id, entry)
      }
    })

    const combined: Record<string, CombinedOrderBookEntry> = {}

    tokenIds.forEach((tokenId) => {
      const orderbookEntry = orderBookByToken.get(tokenId)
      const spreadEntry = spreads?.[tokenId]
      const lastTradeEntry = lastTradesByToken.get(tokenId)

      combined[tokenId] = {
        bids: orderbookEntry?.bids ?? [],
        asks: orderbookEntry?.asks ?? [],
        spread: spreadEntry,
        last_trade_price: lastTradeEntry?.price,
        last_trade_side: lastTradeEntry?.side,
      }
    })

    return NextResponse.json(combined)
  }
  catch (error) {
    console.error('Unexpected error while fetching order book data', error)
    return NextResponse.json(
      { error: 'Failed to fetch order book data' },
      { status: 500 },
    )
  }
}

function extractTokenIds(searchParams: URLSearchParams): string[] {
  const collected = new Set<string>()

  const repeatedParams = searchParams.getAll('token_id')
  repeatedParams.forEach((tokenId) => {
    if (tokenId?.trim()) {
      collected.add(tokenId.trim())
    }
  })

  const csv = searchParams.get('token_ids')
  if (csv) {
    csv
      .split(',')
      .map(entry => entry.trim())
      .filter(Boolean)
      .forEach(tokenId => collected.add(tokenId))
  }

  return Array.from(collected)
}

async function fetchClobJson<T>(path: string, body: unknown): Promise<T> {
  const endpoint = `${process.env.CLOB_URL!}${path}`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const text = await response.text()

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${text}`)
  }

  try {
    return JSON.parse(text) as T
  }
  catch (error) {
    console.error(`Failed to parse response from ${path}`, error)
    throw new Error(`Failed to parse response from ${path}`)
  }
}
