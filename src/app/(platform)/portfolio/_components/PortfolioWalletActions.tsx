'use client'

import { ArrowDownToLine, ArrowUpToLine } from 'lucide-react'
import { useTradingOnboarding } from '@/app/(platform)/_providers/TradingOnboardingProvider'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PortfolioWalletActionsProps {
  className?: string
}

export default function PortfolioWalletActions({ className }: PortfolioWalletActionsProps) {
  const { startDepositFlow, startWithdrawFlow } = useTradingOnboarding()

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row', className)}>
      <Button className="h-11 flex-1" onClick={startDepositFlow}>
        <ArrowDownToLine className="size-4" />
        Deposit
      </Button>
      <Button variant="outline" className="h-11 flex-1" onClick={startWithdrawFlow}>
        <ArrowUpToLine className="size-4" />
        Withdraw
      </Button>
    </div>
  )
}
