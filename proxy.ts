import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isPublicPath = path === '/login'

  const adminSession = request.cookies.get('hp-admin')

  // Protect all routes except login
  if (!isPublicPath && !adminSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect to billing if already logged in
  if (isPublicPath && adminSession) {
    return NextResponse.redirect(new URL('/billing', request.url))
  }

  // Root redirect to billing
  if (path === '/') {
    return NextResponse.redirect(new URL('/billing', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next|favicon.ico).*)',
  ],
}
