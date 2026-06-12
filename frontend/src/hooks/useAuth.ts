'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

/**
 * Возвращает текущего пользователя.
 * Если не авторизован — редиректит на /auth.
 */
export function useAuth(redirectIfUnauthenticated = true) {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuthStore()

  useEffect(() => {
    if (!isLoading && !isAuthenticated && redirectIfUnauthenticated) {
      router.replace('/auth')
    }
  }, [isLoading, isAuthenticated, redirectIfUnauthenticated, router])

  return { user, isAuthenticated, isLoading }
}
