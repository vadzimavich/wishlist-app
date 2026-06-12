'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error: any) => {
              if (error?.response?.status === 401) return false
              return failureCount < 2
            },
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#1E1E2A',
            color: '#E4E4EF',
            border: '1px solid #2A2A3A',
            borderRadius: '10px',
            fontSize: '0.875rem',
          },
          success: {
            iconTheme: { primary: '#4ADE80', secondary: '#1E1E2A' },
          },
          error: {
            iconTheme: { primary: '#F87171', secondary: '#1E1E2A' },
          },
        }}
      />
    </QueryClientProvider>
  )
}
