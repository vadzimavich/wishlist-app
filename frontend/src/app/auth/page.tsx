'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/lib/store'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const { login, register, isLoading } = useAuthStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
      } else {
        await register(form.email, form.password, form.name)
      }
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Произошла ошибка')
    }
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="min-h-screen flex items-center justify-center bg-admin-bg px-4">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="orb orb-purple w-96 h-96 -top-20 -left-20" />
        <div className="orb orb-violet w-80 h-80 bottom-20 right-10" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-purple/20 border border-brand-purple/30 mb-4">
            <span className="text-2xl">🎁</span>
          </div>
          <h1 className="text-2xl font-bold text-admin-text">WishList</h1>
          <p className="text-admin-muted text-sm mt-1">Персональный вишлист с умными приглашениями</p>
        </div>

        {/* Card */}
        <div className="glass p-8 rounded-2xl">
          {/* Tab switcher */}
          <div className="flex rounded-xl bg-admin-bg p-1 mb-6">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mode === m
                    ? 'bg-brand-purple text-white'
                    : 'text-admin-muted hover:text-admin-text'
                }`}
              >
                {m === 'login' ? 'Войти' : 'Регистрация'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {mode === 'register' && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="block text-sm text-admin-muted mb-1.5">Имя</label>
                  <input
                    className="admin-input"
                    placeholder="Как тебя зовут?"
                    value={form.name}
                    onChange={set('name')}
                    required={mode === 'register'}
                    autoComplete="name"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-sm text-admin-muted mb-1.5">Email</label>
              <input
                type="email"
                className="admin-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={set('email')}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm text-admin-muted mb-1.5">Пароль</label>
              <input
                type="password"
                className="admin-input"
                placeholder={mode === 'register' ? 'Минимум 8 символов' : '••••••••'}
                value={form.password}
                onChange={set('password')}
                required
                minLength={mode === 'register' ? 8 : 1}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-brand-purple hover:bg-brand-violet text-white font-semibold
                         transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                         hover:shadow-lg hover:shadow-brand-purple/25 active:scale-[0.98] mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Загрузка...
                </span>
              ) : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
