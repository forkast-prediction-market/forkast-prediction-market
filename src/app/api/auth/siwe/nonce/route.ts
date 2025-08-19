import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const walletAddress = url.searchParams.get('walletAddress')

    if (!walletAddress) {
      return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 })
    }

    const result = await auth.api.getSiweNonce({
      body: {
        walletAddress,
      },
      headers: request.headers,
    })

    return NextResponse.json({ nonce: result.nonce })
  }
  catch (error) {
    console.error('Error generating nonce:', error)
    return NextResponse.json({ error: 'Failed to generate nonce' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { walletAddress } = await request.json()

    if (!walletAddress) {
      return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 })
    }

    const result = await auth.api.getSiweNonce({
      body: {
        walletAddress,
      },
      headers: request.headers,
    })

    return NextResponse.json({ nonce: result.nonce })
  }
  catch (error) {
    console.error('Error generating nonce:', error)
    return NextResponse.json({ error: 'Failed to generate nonce' }, { status: 500 })
  }
}
