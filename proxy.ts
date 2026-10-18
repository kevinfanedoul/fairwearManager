import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function isProtectedPath(pathname: string) {
  return pathname === '/' || pathname.startsWith('/clients') || pathname.startsWith('/orders') || pathname.startsWith('/invoices') || pathname.startsWith('/todos')
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, search } = request.nextUrl
  const isLoginPage = pathname === '/login'

  if (!user && isProtectedPath(pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    if (pathname !== '/') {
      loginUrl.searchParams.set('next', `${pathname}${search}`)
    }
    return NextResponse.redirect(loginUrl)
  }

  if (user && isLoginPage) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/'
    dashboardUrl.search = ''
    return NextResponse.redirect(dashboardUrl)
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
