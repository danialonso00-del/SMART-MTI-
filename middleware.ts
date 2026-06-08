import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const isAuth = request.cookies.get('mti_auth')?.value === 'authenticated'
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
