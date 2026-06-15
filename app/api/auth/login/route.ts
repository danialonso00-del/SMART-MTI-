import { NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, SESSION_TTL_SECONDS, createSessionToken } from '@/lib/auth'
import { readJsonObject } from '@/lib/api-security'

function getExpectedCredentials() {
  const username = process.env.ADMIN_USERNAME || (process.env.NODE_ENV === 'production' ? undefined : 'admin')
  const password = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? undefined : 'admin123')
  if (!username || !password) {
    throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD must be configured')
  }
  return { username, password }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request)
    const username = typeof body.username === 'string' ? body.username : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const expected = getExpectedCredentials()

    if (username === expected.username && password === expected.password) {
      const response = NextResponse.json({ ok: true })
      response.cookies.set(AUTH_COOKIE_NAME, await createSessionToken(username), {
        httpOnly: true,
        maxAge: SESSION_TTL_SECONDS,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      })
      return response
    }

    return NextResponse.json(
      { error: 'Credenciales incorrectas' },
      { status: 401 }
    )
  } catch {
    return NextResponse.json(
      { error: 'Credenciales incorrectas' },
      { status: 401 }
    )
  }
}
