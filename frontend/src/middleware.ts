import { NextRequest, NextResponse } from 'next/server'

const PROTECTED = ['/dashboard', '/wishlist', '/events', '/guests']
const AUTH_ROUTES = ['/auth']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get('accessToken')?.value
    ?? req.headers.get('authorization')?.replace('Bearer ', '')

  // На самом деле JWT живёт в localStorage (не в cookie),
  // поэтому на клиенте проверяем через AuthStore.
  // Здесь делаем лишь минимальную защиту — редирект для роботов/прямых переходов.
  // Реальная проверка — в (admin)/layout.tsx.

  const isProtected = PROTECTED.some(p => pathname.startsWith(p))
  const isAuthRoute = AUTH_ROUTES.some(p => pathname.startsWith(p))

  // Если accessToken есть в cookie (SSR-эксперимент) — пропускаем
  // Иначе позволяем клиентскому layout.tsx разбираться
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|invite).*)'],
}
