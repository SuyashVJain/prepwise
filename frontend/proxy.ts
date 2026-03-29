import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = pathname === '/login' || pathname === '/signup'
  const isOnboarding = pathname === '/onboarding'
  const isProtected = ['/dashboard', '/interview', '/study', '/onboarding'].some(p => pathname.startsWith(p))

  // 1. Not logged in → only public routes allowed
  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Logged in → no reason to be on login/signup
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 3. Logged in → check onboarding status
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', user.id)
      .single()

    const onboardingComplete = profile?.onboarding_complete ?? false

    // Not onboarded + not already on onboarding → force to onboarding
    if (!onboardingComplete && !isOnboarding) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // Already onboarded + trying to revisit onboarding → send to dashboard
    if (onboardingComplete && isOnboarding) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}