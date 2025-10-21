import type { QueryResult } from '@/types'

export async function runQuery<T>(queryFn: () => Promise<QueryResult<T>>) {
  try {
    const data = await queryFn()
    return { data, error: null }
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
