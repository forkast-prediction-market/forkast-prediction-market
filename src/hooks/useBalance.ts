import { useAppKitAccount, useAppKitBalance } from '@reown/appkit/react'
import { useEffect, useRef, useState } from 'react'

export function useBalance() {
  const { fetchBalance } = useAppKitBalance()
  const { isConnected } = useAppKitAccount()
  const [balance, setBalance] = useState<any>()
  const fetchBalanceRef = useRef(fetchBalance)

  useEffect(() => {
    if (!isConnected) {
      return
    }

    let active = true

    function load() {
      if (!active) {
        return
      }

      fetchBalanceRef.current().then(setBalance)
    }

    load()
    const interval = setInterval(load, 30000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [isConnected])

  return { balance }
}
