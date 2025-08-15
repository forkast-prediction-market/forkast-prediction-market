import { Magic } from '@magic-sdk/admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { provider, token } = await request.json()
  const cookieStore = await cookies()

  let userData: any

  try {
    switch (provider) {
      case 'magic': {
        const magic = new Magic(process.env.MAGIC_SECRET_KEY!)
        magic.token.validate(token)
        const { email, publicAddress } = await magic.users.getMetadataByToken(token)
        userData = { email, publicAddress, walletType: 'magic' }
        break
      }
      case 'metamask': {
        const { address } = JSON.parse(token)
        // validate signature on backend
        userData = { address, walletType: 'metamask' }
        break
      }
      case 'google':
        // validate Google ID token
        break
      case 'coinbase':
        // validate Coinbase OAuth token
        break
      default:
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    cookieStore.set({
      name: 'session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    return NextResponse.json(userData)
  }
  catch {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
  }
}
