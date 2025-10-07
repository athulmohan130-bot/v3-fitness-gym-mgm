import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This middleware is now disabled to prevent conflicts with client-side routing.
// The AuthProvider is the single source of truth for redirection.

export function middleware(request: NextRequest) {
  // Allow all requests to pass through to be handled by the client-side AuthGuard.
  return NextResponse.next();
}
 
export const config = {
  // We still match the routes to keep the middleware file active,
  // but it no longer performs any redirection logic.
  matcher: ['/dashboard/:path*', '/login'],
}
