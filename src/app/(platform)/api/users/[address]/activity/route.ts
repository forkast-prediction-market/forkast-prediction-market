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

    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const minAmountParam = searchParams.get('minAmount')

    let limit = 50
    if (limitParam) {
      const parsedLimit = Number.parseInt(limitParam, 10)
      if (Number.isNaN(parsedLimit) || parsedLimit < 1) {
        return NextResponse.json(
          { error: 'Invalid limit parameter. Must be a positive integer.' },
          { status: 400 },
        )
      }
      if (parsedLimit > 100) {
        return NextResponse.json(
          { error: 'Limit parameter cannot exceed 100.' },
          { status: 400 },
        )
      }
      limit = parsedLimit
    }

    let offset = 0
    if (offsetParam) {
      const parsedOffset = Number.parseInt(offsetParam, 10)
      if (Number.isNaN(parsedOffset) || parsedOffset < 0) {
        return NextResponse.json(
          { error: 'Invalid offset parameter. Must be a non-negative integer.' },
          { status: 400 },
        )
      }
      offset = parsedOffset
    }

    let minAmount: number | undefined
    if (minAmountParam) {
      const parsedMinAmount = Number.parseFloat(minAmountParam)
      if (Number.isNaN(parsedMinAmount) || parsedMinAmount < 0) {
        return NextResponse.json({ error: 'Invalid minAmount parameter. Must be a non-negative number.' }, { status: 400 })
      }
      minAmount = parsedMinAmount
    }

    if (!address || address.trim().length === 0) {
      return NextResponse.json(
        { error: 'Address parameter is required.' },
        { status: 400 },
      )
    }

    const result: QueryResult<ActivityOrder[]> = await UserModel.getUserActivity({
      address: address.trim(),
      limit,
      offset,
      minAmount,
    })

    if (result.error) {
      if (typeof result.error === 'string' && result.error.includes('not found')) {
        return NextResponse.json(
          { error: 'User not found or has no activity data.' },
          { status: 404 },
        )
      }

      if (typeof result.error === 'string' && result.error.includes('connection')) {
        console.error('Database connection error:', result.error)
        return NextResponse.json(
          { error: 'Database connection error. Please try again later.' },
          { status: 503 },
        )
      }

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
    console.error('Error in user activity API:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 },
    )
  }
}
