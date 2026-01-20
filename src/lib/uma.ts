interface UmaProposeSource {
  uma_request_tx_hash?: string | null
  uma_request_log_index?: number | null
  mirror_uma_request_tx_hash?: string | null
  mirror_uma_request_log_index?: number | null
}

const UMA_ORACLE_BASE_URL = 'https://oracle.uma.xyz'

export interface UmaProposeTarget {
  url: string
  isMirror: boolean
}

export function resolveUmaProposeTarget(source?: UmaProposeSource | null): UmaProposeTarget | null {
  if (!source) {
    return null
  }

  const mirrorTxHash = source.mirror_uma_request_tx_hash
  const mirrorLogIndex = source.mirror_uma_request_log_index
  const directTxHash = source.uma_request_tx_hash
  const directLogIndex = source.uma_request_log_index

  const isMirror = Boolean(mirrorTxHash && mirrorLogIndex != null)
  const txHash = isMirror ? mirrorTxHash : directTxHash
  const logIndex = isMirror ? mirrorLogIndex : directLogIndex

  if (!txHash || logIndex == null) {
    return null
  }

  const baseUrl = UMA_ORACLE_BASE_URL.replace(/\/$/, '')
  const project = process.env.NEXT_PUBLIC_SITE_NAME!

  const params = new URLSearchParams()
  params.set('project', project)
  params.set('transactionHash', txHash)
  params.set('eventIndex', String(logIndex))

  return {
    url: `${baseUrl}/propose?${params.toString()}`,
    isMirror,
  }
}

export function buildUmaProposeUrl(source?: UmaProposeSource | null): string | null {
  return resolveUmaProposeTarget(source)?.url ?? null
}
