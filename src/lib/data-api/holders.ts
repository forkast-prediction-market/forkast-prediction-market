const DATA_API_URL = process.env.DATA_URL!

interface DataApiHolder {
  proxyWallet: string
  amount: number
  outcomeIndex: number
  pseudonym?: string | null
  name?: string | null
  profileImage?: string | null
  profileImageOptimized?: string | null
}

interface DataApiHoldersResponse {
  token: string
  holders: DataApiHolder[]
}

function getAvatar(address: string, holder: DataApiHolder) {
  return holder.profileImageOptimized
    || holder.profileImage
    || `https://avatar.vercel.sh/${address}.png`
}

export interface TopHoldersResult {
  yesHolders: {
    user: {
      id: string
      username: string
      address: string
      proxy_wallet_address?: string | null
      image: string
    }
    net_position: string
    outcome_index: number
    outcome_text: string
  }[]
  noHolders: {
    user: {
      id: string
      username: string
      address: string
      proxy_wallet_address?: string | null
      image: string
    }
    net_position: string
    outcome_index: number
    outcome_text: string
  }[]
}

function mapHolder(holder: DataApiHolder) {
  const address = holder.proxyWallet
  const outcomeIndex = holder.outcomeIndex
  const amount = Number.isFinite(holder.amount) ? Number(holder.amount) : 0

  return {
    user: {
      id: address,
      username: holder.pseudonym || holder.name || address,
      address,
      proxy_wallet_address: address,
      image: getAvatar(address, holder),
    },
    net_position: amount.toString(),
    outcome_index: outcomeIndex,
    outcome_text: outcomeIndex === 0 ? 'Yes' : 'No',
  }
}

export async function fetchTopHolders(conditionId: string, limit = 50): Promise<TopHoldersResult> {
  if (!conditionId) {
    throw new Error('conditionId is required')
  }

  if (!DATA_API_URL) {
    throw new Error('DATA_URL environment variable is not configured.')
  }

  const params = new URLSearchParams({
    market: conditionId,
    limit: String(Math.min(Math.max(limit, 1), 500)),
  })

  const response = await fetch(`${DATA_API_URL}/holders?${params.toString()}`)

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    const errorMessage = errorBody?.error || 'Failed to load top holders'
    throw new Error(errorMessage)
  }

  const result: DataApiHoldersResponse[] = await response.json()

  const yesHolders: TopHoldersResult['yesHolders'] = []
  const noHolders: TopHoldersResult['noHolders'] = []

  result.forEach((entry) => {
    entry.holders.forEach((holder) => {
      const mapped = mapHolder(holder)
      if (mapped.outcome_index === 0) {
        yesHolders.push(mapped)
      }
      else {
        noHolders.push(mapped)
      }
    })
  })

  return { yesHolders, noHolders }
}
