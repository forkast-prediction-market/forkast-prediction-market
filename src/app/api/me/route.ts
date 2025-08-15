import { Magic } from '@magic-sdk/admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()

  const didToken = cookieStore.get('session')?.value
  if (!didToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const magic = new Magic(process.env.MAGIC_SECRET_KEY as string)
    magic.token.validate(didToken)
    const { email, publicAddress, issuer } = await magic.users.getMetadataByToken(didToken)

    return NextResponse.json({ email, publicAddress, issuer })
  }
  catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
}
