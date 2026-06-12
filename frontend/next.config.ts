import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { hostname: 'res.cloudinary.com' },
      { hostname: 'images.unsplash.com' },
      { hostname: '*.wildberries.ru' },
      { hostname: '*.ozon.ru' },
      { hostname: 'basket-*.wbbasket.ru' },
    ],
  },
  // Отключаем строгий режим в продакшене для GSAP
  reactStrictMode: process.env.NODE_ENV !== 'production',

  // Оптимизация для мобильных
  experimental: {
    optimizeCss: true,
  },
}

export default nextConfig
