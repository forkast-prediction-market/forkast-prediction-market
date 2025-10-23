import type { ClassValue } from 'clsx'
import confetti from 'canvas-confetti'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const NEW_MARKET_MAX_AGE_DAYS = 7
const MS_IN_DAY = 86_400_000

export function isMarketNew(createdAt: string, thresholdDays: number = NEW_MARKET_MAX_AGE_DAYS) {
  const createdDate = new Date(createdAt)
  if (Number.isNaN(createdDate.getTime())) {
    return false
  }

  const diffInMs = Date.now() - createdDate.getTime()
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

export function formatTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`
  }

  if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m ago`
  }

  if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h ago`
  }

  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

export function truncateAddress(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-6)}`
}

export function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(1)}M`
  }
  else if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(0)}k`
  }
  return `$${volume.toFixed(0)}`
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatPercent(value: number) {
  return `${value.toFixed(2)}%`
}

export function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`
}

export function formatPosition(amount: number): string {
  if (amount < 1000) {
    return amount.toString()
  }

  if (amount < 1000000) {
    return amount.toLocaleString('en-US')
  }

  const millions = amount / 1000000
  return `${millions.toFixed(1)}M`
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
