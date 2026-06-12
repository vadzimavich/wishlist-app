import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-admin-bg flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-7xl mb-6">🎁</p>
        <h1 className="text-2xl font-bold text-admin-text mb-2">Страница не найдена</h1>
        <p className="text-admin-muted mb-8">Кажется, эта ссылка уже не работает</p>
        <Link href="/dashboard"
          className="px-6 py-3 bg-brand-purple hover:bg-brand-violet text-white rounded-xl
                     font-medium transition-colors">
          На главную
        </Link>
      </div>
    </div>
  )
}
