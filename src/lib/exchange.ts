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
