import type { ClassValue } from 'clsx'
import confetti from 'canvas-confetti'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const NEW_MARKET_MAX_AGE_DAYS = 7
const MS_IN_DAY = 86_400_000

export function isMarketNew(createdAt: string, thresholdDays: number = NEW_MARKET_MAX_AGE_DAYS, currentTime?: number) {
  const createdDate = new Date(createdAt)
  if (Number.isNaN(createdDate.getTime())) {
    return false
  }

  const now = currentTime ?? Date.now()
  const diffInMs = now - createdDate.getTime()
  return diffInMs <= thresholdDays * MS_IN_DAY
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeSvg(svg: string) {
  return svg
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/on\w+='[^']*'/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
}

export function triggerConfetti(color: 'primary' | 'yes' | 'no', event?: any) {
  let origin: { x?: number, y: number } = { y: 0.6 }

  if (event && event.clientX && event.clientY) {
    const x = event.clientX / window.innerWidth
    const y = event.clientY / window.innerHeight
    origin = { x, y }
  }

  const colors = {
    yes: ['#10b981', '#059669', '#047857', '#065f46'],
    no: ['#ef4444', '#dc2626', '#b91c1c', '#991b1b'],
    primary: ['#2563eb', '#1d4ed8', '#3b82f6', '#60a5fa'],
  }[color ?? 'primary']

  confetti({
    particleCount: 120,
    spread: 70,
    decay: 0.92,
    scalar: 0.9,
    origin,
    colors,
  })
}

export function calculateWinnings(amount: number, price: number): number {
  return amount / price - amount
}
