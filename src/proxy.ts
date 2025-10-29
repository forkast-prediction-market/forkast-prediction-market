import type { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function proxy(request: NextRequest) {
  if (request.headers.get('purpose') === 'prefetch') {
    return NextResponse.next()
  }

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    const url = new URL(request.url)
    if (url.pathname.startsWith('/admin')) {
      if (!session.user?.is_admin) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    return NextResponse.next()
  }
  catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/settings/:path*', '/portfolio/:path*', '/admin/:path*'],
}
