import type { QueryResult, UserPosition } from '@/types'
import { NextResponse } from 'next/server'
import { UserRepository } from '@/lib/db/queries/user'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await params
    const { searchParams } = new URL(request.url)

    // Parse and validate query parameters
    const limit = Number.parseInt(searchParams.get('limit') || '50', 10)
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10)
    const status = searchParams.get('status') as 'active' | 'closed' | null
    const minAmountParam = searchParams.get('minAmount')
    const searchQuery = searchParams.get('search')

    // Validate limit parameter
    const validatedLimit = Number.isNaN(limit) ? 50 : Math.min(Math.max(1, limit), 100)

    // Validate offset parameter
    const validatedOffset = Number.isNaN(offset) ? 0 : Math.max(0, offset)

    // Validate status parameter
    let validatedStatus: 'active' | 'closed' | undefined
    if (status !== null) {
      if (status === 'active' || status === 'closed') {
        validatedStatus = status
      }
      else {
        return NextResponse.json(
          { error: 'Invalid status parameter. Must be "active" or "closed".' },
          { status: 400 },
        )
      }
    }

    // Validate minAmount parameter
    let validatedMinAmount: number | undefined
    if (minAmountParam !== null) {
      const parsedMinAmount = Number.parseFloat(minAmountParam)
      if (!Number.isNaN(parsedMinAmount) && parsedMinAmount >= 0) {
        validatedMinAmount = parsedMinAmount
      }
      else {
        return NextResponse.json(
          { error: 'Invalid minAmount parameter. Must be a non-negative number.' },
          { status: 400 },
        )
      }
    }

    // Validate search parameter
    let validatedSearchQuery: string | undefined
    if (searchQuery !== null) {
      const trimmedSearch = searchQuery.trim()
      if (trimmedSearch.length > 0) {
        // Basic validation: ensure search query is not too long and contains valid characters
        if (trimmedSearch.length > 200) {
          return NextResponse.json(
            { error: 'Search query too long. Maximum 200 characters allowed.' },
            { status: 400 },
          )
        }
        validatedSearchQuery = trimmedSearch
      }
    }

    // Validate address parameter
    if (!address || address.trim().length === 0) {
      return NextResponse.json(
        { error: 'Address parameter is required.' },
        { status: 400 },
      )
    }

    // Call UserRepository method to get positions
    const result: QueryResult<{ data: UserPosition[], hasMore: boolean, total: number }>
      = await UserRepository.getUserPositions({
        address: address.trim(),
        limit: validatedLimit,
        offset: validatedOffset,
        status: validatedStatus,
        minAmount: validatedMinAmount,
        search: validatedSearchQuery,
      })

    if (result.error) {
      console.error('Error fetching user positions:', result.error)
      return NextResponse.json(
        { error: 'Failed to fetch user positions. Please try again later.' },
        { status: 500 },
      )
    }

    const response = result.data || { data: [], hasMore: false, total: 0 }
    return NextResponse.json(response)
  }
  catch (error) {
    console.error('Error in positions API:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 },
    )
  }
}
