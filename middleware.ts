import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const isAuth = await verifySessionToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  const { pathname } = request.nextUrl
  const isLoginPage = pathname === '/login'
  const isAuthApi   = pathname.startsWith('/api/auth')
  if (isAuthApi) return NextResponse.next()
  if (!isAuth && !isLoginPage) return NextResponse.redirect(new URL('/login', request.url))
  if (isAuth && isLoginPage)   return NextResponse.redirect(new URL('/dashboard', request.url))
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
