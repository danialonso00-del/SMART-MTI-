import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set('mti_auth', '', {
    httpOnly: true,
    maxAge: 0,
    sameSite: 'lax',
    path: '/',
  })
  return response
}
