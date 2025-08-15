import { Magic } from '@magic-sdk/admin'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
) {
  const authHeader = request.headers.get('authorization') ?? ''
  if (authHeader === '') {
    return NextResponse.json(
      { error: 'Missing authorization header' },
      { status: 401 },
    )
  }

  try {
    const magic = new Magic(process.env.MAGIC_SECRET_KEY as string)
    const didToken = magic.utils.parseAuthorizationHeader(authHeader)

    if (!didToken) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 },
      )
    }

    magic.token.validate(didToken)

    const { email, publicAddress, issuer } = await magic.users.getMetadataByToken(didToken)

    return NextResponse.json({
      email,
      publicAddress,
      issuer,
    })
  }
  catch {
    return NextResponse.json(
      { error: 'Failed to authenticate user' },
      { status: 401 },
    )
  }
}
