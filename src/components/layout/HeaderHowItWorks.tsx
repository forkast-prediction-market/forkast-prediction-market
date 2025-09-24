'use client'

import { useAppKit } from '@reown/appkit/react'
import confetti from 'canvas-confetti'
import { InfoIcon } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    title: '1. Choose a Market',
    description:
      'Buy ‘Yes’ or ‘No’ shares based on what you honestly think will happen. Prices move in real time as other traders trade.',
    image: '/images/how-it-works/1.webp',
    imageAlt: 'Illustration showing how to pick a Polymarket market',
    ctaLabel: 'Next',
  },
  {
    title: '2. Make Your Trade',
    description:
      'Add funds with crypto, card, or bank transfer—then choose your position. Trade on real-world events with full transparency.',
    image: '/images/how-it-works/2.webp',
    imageAlt: 'Illustration showing how to place a bet',
    ctaLabel: 'Next',
  },
  {
    title: '3. Cash Out 🤑',
    description:
      'Sell your ‘Yes’ or ‘No’ shares anytime, or wait until the market settles. Winning shares redeem for $1 each. Start trading in minutes.',
    image: '/images/how-it-works/3.png',
    imageAlt: 'Illustration showing how profits work',
    ctaLabel: 'Get Started',
  },
] as const

export default function HeaderHowItWorks() {
  const { open: openAuthModal } = useAppKit()
  const [isOpen, setIsOpen] = useState(false)
  const [activeStep, setActiveStep] = useState(0)

  const currentStep = STEPS[activeStep]
  const isLastStep = activeStep === STEPS.length - 1

  function handleOpenChange(nextOpen: boolean) {
    setIsOpen(nextOpen)
    setActiveStep(0)
  }

  function fireCelebration() {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.4 },
      decay: 0.92,
      scalar: 0.9,
      colors: ['#2563eb', '#1d4ed8', '#3b82f6', '#60a5fa'],
    })
  }

  function handleNext() {
    if (isLastStep) {
      fireCelebration()
      setIsOpen(false)
      setActiveStep(0)
      openAuthModal()
      return
    }

    setActiveStep(step => Math.min(step + 1, STEPS.length - 1))
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="flex-shrink-0 items-center gap-1.5"
        >
          <InfoIcon className="size-4" />
          How it works
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[95vh] gap-0 overflow-y-auto p-0 sm:max-w-md">
        <div className="overflow-hidden rounded-t-lg">
          <Image
            src={currentStep.image}
            alt={currentStep.imageAlt}
            width={448}
            height={252}
            className="h-auto w-full object-cover"
          />
        </div>

        <div className="flex flex-col gap-6 p-6">
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((step, index) => (
              <span
                key={step.title}
                className={cn(
                  'h-1.5 w-8 rounded-full bg-muted transition-colors',
                  index === activeStep && 'bg-primary',
                )}
              />
            ))}
          </div>

          <DialogHeader className="gap-2">
            <DialogTitle className="text-xl font-semibold">
              {currentStep.title}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {currentStep.description}
            </DialogDescription>
          </DialogHeader>

          <Button size="lg" className="h-11 w-full" onClick={handleNext}>
            {currentStep.ctaLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
