import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const accessToken = request.cookies.get('sb-access-token')?.value;
  if (!accessToken && request.nextUrl.pathname !== '/') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/crm', '/estimates', '/projects'],
};