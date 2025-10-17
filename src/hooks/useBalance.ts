import { useAppKitAccount } from '@reown/appkit/react'
import { useEffect, useMemo, useState } from 'react'
import { createPublicClient, getContract, http } from 'viem'
import { defaultNetwork } from '@/lib/appkit'
import { useUser } from '@/stores/useUser'

interface Balance {
  raw: number
  text: string
  symbol: string
}

const USDC_ADDRESS = '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582'
const USDC_DECIMALS = 6
const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
]
const INITIAL_STATE: Balance = {
  raw: 0.0,
  text: '0.00',
  symbol: 'USDC',
}

export function useBalance() {
  const { address, isConnected } = useAppKitAccount()
  const user = useUser()
  const [balance, setBalance] = useState<Balance>(INITIAL_STATE)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  const rpcUrl = useMemo(
    () => defaultNetwork.rpcUrls.default.http[0],
    [],
  )

  const client = useMemo(
    () =>
      createPublicClient({
        chain: defaultNetwork,
        transport: http(rpcUrl),
      }),
    [rpcUrl],
  )

  const contract = useMemo(
    () =>
      getContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        client,
      }),
    [client],
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
        const balanceRaw = await contract.read.balanceOf([walletAddress])
        const balanceNumber = Number(balanceRaw) / 10 ** USDC_DECIMALS

        if (active) {
          setBalance({
            raw: balanceNumber,
            text: balanceNumber.toFixed(2),
            symbol: 'USDC',
          })
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

    queueMicrotask(fetchUSDCBalance)
    const interval = setInterval(fetchUSDCBalance, 30000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [isConnected, walletAddress, contract, isInitialLoad])

  return { balance, isLoadingBalance }
}
