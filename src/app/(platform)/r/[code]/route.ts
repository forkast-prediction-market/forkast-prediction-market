import { NextResponse } from 'next/server'
import { AffiliateModel } from '@/lib/db/affiliates'

const AFFILIATE_COOKIE_NAME = 'platform_affiliate'
const AFFILIATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params
  const { data: affiliate } = await AffiliateModel.getAffiliateByCode(code)

  if (!affiliate) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const cookieValue = JSON.stringify({
    code: affiliate.affiliate_code,
    affiliateUserId: affiliate.id,
    timestamp: Date.now(),
  })

  const response = NextResponse.redirect(new URL('/', request.url))
  response.cookies.set({
    name: AFFILIATE_COOKIE_NAME,
    value: cookieValue,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: AFFILIATE_COOKIE_MAX_AGE,
  })

  return response
}
