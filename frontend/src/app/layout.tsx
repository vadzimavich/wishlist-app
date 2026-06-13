import type { Metadata } from 'next'
import { Inter, Unbounded } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

const unbounded = Unbounded({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '700', '800'],
  variable: '--font-unbounded',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'WishList — Персональный вишлист',
    template: '%s | WishList',
  },
  description: 'Создай вишлист и пригласи друзей на праздник. Гости выбирают подарки прямо в приглашении.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.variable} ${unbounded.variable} font-body antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
