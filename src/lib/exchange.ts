import { createPublicClient, http } from 'viem'
import { defaultNetwork } from '@/lib/appkit'
import { CTF_EXCHANGE_ADDRESS, NEG_RISK_CTF_EXCHANGE_ADDRESS } from '@/lib/contracts'

const exchangeBaseFeeAbi = [
  {
    name: 'exchangeBaseFeeRate',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

const exchangeReferralAbi = [
  {
    name: 'referrals',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'maker', type: 'address' }],
    outputs: [
      { name: 'referrer', type: 'address' },
      { name: 'affiliate', type: 'address' },
      { name: 'affiliatePercentage', type: 'uint256' },
      { name: 'locked', type: 'bool' },
    ],
  },
] as const

let exchangeClient: ReturnType<typeof createPublicClient> | null = null

function getExchangeClient() {
  if (!exchangeClient) {
    exchangeClient = createPublicClient({
      chain: defaultNetwork,
      transport: http(defaultNetwork.rpcUrls.default.http[0]),
    })
  }
  return exchangeClient
}

async function fetchExchangeBaseFeeRate(address: `0x${string}`): Promise<number | null> {
  try {
    const result = await getExchangeClient().readContract({
      address,
      abi: exchangeBaseFeeAbi,
      functionName: 'exchangeBaseFeeRate',
    })
    return Number(result)
  }
  catch {
    return null
  }
}

export async function fetchMaxExchangeBaseFeeRate(): Promise<number | null> {
  const [ctfRate, negRiskRate] = await Promise.all([
    fetchExchangeBaseFeeRate(CTF_EXCHANGE_ADDRESS),
    fetchExchangeBaseFeeRate(NEG_RISK_CTF_EXCHANGE_ADDRESS),
  ])

  if (ctfRate === null && negRiskRate === null) {
    return null
  }

  return Math.max(ctfRate ?? 0, negRiskRate ?? 0)
}

export async function fetchReferralLocked(
  exchange: `0x${string}`,
  maker: `0x${string}`,
): Promise<boolean | null> {
  try {
    const result = await getExchangeClient().readContract({
      address: exchange,
      abi: exchangeReferralAbi,
      functionName: 'referrals',
      args: [maker],
    }) as readonly [`0x${string}`, `0x${string}`, bigint, boolean]
    return result[3]
  }
  catch {
    return null
  }
}
