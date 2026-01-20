interface UmaProposeSource {
  uma_request_tx_hash?: string | null
  uma_request_log_index?: number | null
  mirror_uma_request_tx_hash?: string | null
  mirror_uma_request_log_index?: number | null
}

const UMA_ORACLE_BASE_URL = 'https://oracle.uma.xyz'

export function buildUmaProposeUrl(source?: UmaProposeSource | null): string | null {
  if (!source) {
    return null
  }

  const mirrorTxHash = source.mirror_uma_request_tx_hash
  const mirrorLogIndex = source.mirror_uma_request_log_index
  const directTxHash = source.uma_request_tx_hash
  const directLogIndex = source.uma_request_log_index

  const txHash = mirrorTxHash && mirrorLogIndex != null ? mirrorTxHash : directTxHash
  const logIndex = mirrorTxHash && mirrorLogIndex != null ? mirrorLogIndex : directLogIndex

  if (!txHash || logIndex == null) {
    return null
  }

  const baseUrl = UMA_ORACLE_BASE_URL.replace(/\/$/, '')
  const project = process.env.NEXT_PUBLIC_SITE_NAME || 'Kuest'

  const params = new URLSearchParams()
  params.set('project', project)
  params.set('transactionHash', txHash)
  params.set('eventIndex', String(logIndex))

  return `${baseUrl}/propose?${params.toString()}`
}
