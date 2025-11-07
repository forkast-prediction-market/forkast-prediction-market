import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tokenId = searchParams.get('token_id')

  if (!tokenId) {
    return NextResponse.json(
      { error: 'token_id is required' },
      { status: 422 },
    )
  }

  const endpoint = `${process.env.CLOB_URL!}/book?${new URLSearchParams({ token_id: tokenId }).toString()}`

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    const text = await response.text()

    if (!response.ok) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    try {
      const data = JSON.parse(text)
      return NextResponse.json(data)
    }
    catch (error) {
      console.error('Failed to parse order book response', error)
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }
  }
  catch (error) {
    console.error('Unexpected error while fetching order book summary', error)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
