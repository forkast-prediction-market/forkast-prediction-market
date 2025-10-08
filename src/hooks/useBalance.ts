import { polygonAmoy } from '@reown/appkit/networks'
import { useAppKitAccount } from '@reown/appkit/react'
import { Contract, JsonRpcProvider } from 'ethers'
import { useEffect, useMemo, useState } from 'react'
import { useUser } from '@/stores/useUser'

interface Balance {
  raw: number
  text: string
  symbol: string
}

const USDC_ADDRESS = '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582' // Polygon Amoy USDC
const USDC_DECIMALS = 6
const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
]
const INITIAL_STATE: Balance = {
  raw: 0.00,
  text: '0.00',
  symbol: 'USDC',
}

export function useBalance() {
  const { address, isConnected } = useAppKitAccount()
  const user = useUser()
  const [balance, setBalance] = useState<Balance>(INITIAL_STATE)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  const rpcUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC_URL
      || polygonAmoy.rpcUrls.default.http[0]
  }, [])

  const rpcProvider = useMemo(() => new JsonRpcProvider(rpcUrl), [rpcUrl])

  const usdcContract = useMemo(
    () => new Contract(USDC_ADDRESS, ERC20_ABI, rpcProvider),
    [rpcProvider],
  )

  const walletAddress = isConnected ? address : user?.address

  useEffect(() => {
    if (!walletAddress || !isConnected) {
      queueMicrotask(() => {
        setBalance(INITIAL_STATE)
        setIsLoadingBalance(false)
        setIsInitialLoad(true)
      })
      return
    }

    let active = true

    async function fetchUSDCBalance() {
      if (!active) {
        return
      }

      if (isInitialLoad) {
        setIsLoadingBalance(true)
      }

      try {
        const balanceRaw = await usdcContract.balanceOf(walletAddress)
        const balanceNumber = Number(balanceRaw) / (10 ** USDC_DECIMALS)

        const newBalance = {
          raw: balanceNumber,
          text: balanceNumber.toFixed(2),
          symbol: 'USDC',
        }

        if (active) {
          setBalance(newBalance)
          setIsLoadingBalance(false)
          setIsInitialLoad(false)
        }
      }
      catch {
        if (active) {
          setBalance(INITIAL_STATE)
          setIsLoadingBalance(false)
          setIsInitialLoad(false)
        }
      }
    }

    queueMicrotask(() => fetchUSDCBalance())
    const interval = setInterval(fetchUSDCBalance, 30000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [isConnected, walletAddress, usdcContract, isInitialLoad])

  return { balance, isLoadingBalance }
}
