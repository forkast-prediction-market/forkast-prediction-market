import { NextResponse } from 'next/server'
import { loadEnabledLocales } from '@/i18n/locale-settings'

export async function GET() {
  try {
    const locales = await loadEnabledLocales()
    return NextResponse.json({ locales })
  }
  catch (error) {
    console.error('Failed to load locales', error)
    return NextResponse.json({ locales: [] }, { status: 500 })
  }
}
