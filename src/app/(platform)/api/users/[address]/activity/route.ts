import type { ActivityOrder, QueryResult } from '@/types'
import { NextResponse } from 'next/server'
import { UserModel } from '@/lib/db/users'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await params
    const { searchParams } = new URL(request.url)

    const limit = Number.parseInt(searchParams.get('limit') || '50', 10)
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10)
    const minAmountParam = searchParams.get('minAmount')
    const validatedLimit = Number.isNaN(limit) ? 50 : Math.min(Math.max(1, limit), 100)
    const validatedOffset = Number.isNaN(offset) ? 0 : Math.max(0, offset)

    let validatedMinAmount: number | undefined
    if (minAmountParam !== null) {
      const parsedMinAmount = Number.parseFloat(minAmountParam)
      if (!Number.isNaN(parsedMinAmount) && parsedMinAmount >= 0) {
        validatedMinAmount = parsedMinAmount
      }
      else {
        return NextResponse.json({ error: 'Invalid minAmount parameter. Must be a non-negative number.' }, { status: 400 })
      }
    }

    if (!address || address.trim().length === 0) {
      return NextResponse.json(
        { error: 'Address parameter is required.' },
        { status: 400 },
      )
    }

    const result: QueryResult<ActivityOrder[]> = await UserModel.getUserActivity({
      address: address.trim(),
      limit: validatedLimit,
      offset: validatedOffset,
      minAmount: validatedMinAmount,
    })

    if (result.error) {
      console.error('Error fetching user activity:', result.error)
      return NextResponse.json(
        { error: 'Failed to fetch user activity. Please try again later.' },
        { status: 500 },
      )
    }

    const activities = result.data || []
    return NextResponse.json(activities)
  }
  catch (error) {
    console.error('Error fetching user activity:', error)

    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 },
    )
  }
}
