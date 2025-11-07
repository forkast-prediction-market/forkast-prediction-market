import type { QueryResult, UserPosition } from '@/types'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { UserRepository } from '@/lib/db/queries/user'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await params
    const { searchParams } = new URL(request.url)

    const limit = Number.parseInt(searchParams.get('limit') || '50', 10)
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10)
    const status = searchParams.get('status') as 'active' | 'closed' | null
    const minAmountParam = searchParams.get('minAmount')
    const searchQuery = searchParams.get('search')
    const validatedLimit = Number.isNaN(limit) ? 50 : Math.min(Math.max(1, limit), 100)
    const validatedOffset = Number.isNaN(offset) ? 0 : Math.max(0, offset)

    let validatedStatus: 'active' | 'closed' | undefined
    if (status !== null) {
      if (status === 'active' || status === 'closed') {
        validatedStatus = status
      }
      else {
        return NextResponse.json(
          { error: 'Invalid status parameter. Must be "active" or "closed".' },
          { status: 422 },
        )
      }
    }

    let validatedMinAmount: number | undefined
    if (minAmountParam !== null) {
      const parsedMinAmount = Number.parseFloat(minAmountParam)
      if (!Number.isNaN(parsedMinAmount) && parsedMinAmount >= 0) {
        validatedMinAmount = parsedMinAmount
      }
      else {
        return NextResponse.json(
          { error: 'Invalid minAmount parameter. Must be a non-negative number.' },
          { status: 422 },
        )
      }
    }

    let validatedSearchQuery: string | undefined
    if (searchQuery !== null) {
      const trimmedSearch = searchQuery.trim()
      if (trimmedSearch.length > 0) {
        if (trimmedSearch.length > 200) {
          return NextResponse.json(
            { error: 'Search query too long. Maximum 200 characters allowed.' },
            { status: 422 },
          )
        }
        validatedSearchQuery = trimmedSearch
      }
    }

    if (!address || address.trim().length === 0) {
      return NextResponse.json(
        { error: 'Address parameter is required.' },
        { status: 422 },
      )
    }

    const { data, error }: QueryResult<{ data: UserPosition[], hasMore: boolean, total: number }>
      = await UserRepository.getUserPositions({
        address: address.trim(),
        limit: validatedLimit,
        offset: validatedOffset,
        status: validatedStatus,
        minAmount: validatedMinAmount,
        search: validatedSearchQuery,
      })

    if (error) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    const response = data || { data: [], hasMore: false, total: 0 }
    return NextResponse.json(response)
  }
  catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
