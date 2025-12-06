import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase server client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Get current session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes that don't require auth
  const publicRoutes = ['/', '/login'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // If not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If authenticated and trying to access login page, redirect to dashboard
  if (user && pathname === '/login') {
    // Get user role from database
    const { data: dbUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = dbUser?.role || user.user_metadata?.role || 'student';

    const dashboardUrl = role === 'company' ? '/company/dashboard' : '/student/dashboard';
    return NextResponse.redirect(new URL(dashboardUrl, request.url));
  }

  // Role-based route protection
  if (user) {
    const { data: dbUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = dbUser?.role || user.user_metadata?.role || 'student';

    // Restrict company routes to company users
    if (pathname.startsWith('/company')) {
      if (role !== 'company') {
        return NextResponse.redirect(new URL('/student/dashboard', request.url));
      }
    }

    // Restrict student routes to student users (except public profile views)
    if (pathname.startsWith('/student') && !pathname.startsWith('/students/')) {
      if (role !== 'student') {
        return NextResponse.redirect(new URL('/company/dashboard', request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
