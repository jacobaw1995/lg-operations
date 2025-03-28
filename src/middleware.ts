import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('sb-access-token')?.value;
  console.log("Middleware - Path:", request.nextUrl.pathname);
  console.log("Middleware - Access Token:", accessToken || "Not found");
  if (!accessToken && request.nextUrl.pathname !== '/') {
    console.log("Middleware - Redirecting to /");
    return NextResponse.redirect(new URL('/', request.url));
  }
  console.log("Middleware - Proceeding");
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/crm', '/estimates', '/projects'],
};