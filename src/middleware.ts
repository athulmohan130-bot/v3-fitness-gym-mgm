import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Handle root path redirect
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard/overview', request.url));
  }

  // Allow all other requests to pass through to be handled by the client-side AuthProvider.
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/login'],
}
