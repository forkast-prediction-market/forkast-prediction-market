import type { QueryResult } from '@/types'

export async function runQuery<T>(queryFn: () => Promise<QueryResult<T>>): Promise<QueryResult<T>> {
  try {
    return await queryFn()
  }
  catch (err) {
    // @ts-expect-error err is of unknow type
    console.error('Query failed:', err.cause ?? err)
    return {
      data: null,
      error: 'Internal server error',
    }
  }
}
