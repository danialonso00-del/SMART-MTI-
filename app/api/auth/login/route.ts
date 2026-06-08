import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (username === 'admin' && password === 'admin123') {
      const response = NextResponse.json({ ok: true })
      response.cookies.set('mti_auth', 'authenticated', {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax',
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
