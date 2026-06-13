/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { hostname: 'images.unsplash.com' },
      { hostname: '*.wildberries.ru' },
      { hostname: '*.wbbasket.ru' },
      { hostname: '*.ozon.ru' },
      { hostname: '*.aliexpress.com' },
      { hostname: '*.mvideo.ru' },
      { hostname: '*.dns-shop.ru' },
      { hostname: '*.megamarket.ru' },
      { hostname: '*.lamoda.ru' },
      { hostname: '*.entry.ru' },
    ],
  },
  reactStrictMode: process.env.NODE_ENV !== 'production',
  experimental: {
    optimizeCss: true,
  },
}

export default nextConfig
