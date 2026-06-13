'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gift, Calendar, Users, LayoutDashboard, LogOut, Menu, X, ChevronRight
} from 'lucide-react'
import { useAuthStore, useUIStore } from '@/lib/store'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Обзор' },
  { href: '/wishlist',  icon: Gift,            label: 'Вишлист' },
  { href: '/events',   icon: Calendar,         label: 'События' },
  { href: '/guests',   icon: Users,            label: 'Гости' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace('/auth')
    }
  }, [mounted, isAuthenticated, router])

  if (!mounted || !isAuthenticated) return null

  const handleLogout = async () => {
    await logout()
    router.push('/auth')
  }

  return (
    <div className="flex h-screen bg-admin-bg overflow-hidden">
      {/* ── Mobile overlay ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar (desktop: always visible, mobile: animated) ── */}
      <aside
        className={`fixed md:static z-50 flex flex-col w-60 h-full
                    bg-admin-surface border-r border-admin-border shrink-0
                    transition-transform duration-300 ease-in-out
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-admin-border">
          <div className="w-8 h-8 rounded-lg bg-brand-purple/20 border border-brand-purple/30 flex items-center justify-center">
            <span className="text-sm">🎁</span>
          </div>
          <span className="font-semibold font-display text-admin-text">WishList</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto md:hidden text-admin-muted hover:text-admin-text transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* User */}
        <div className="px-4 py-4 border-b border-admin-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-purple/30 flex items-center justify-center text-sm font-bold text-brand-violet">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-admin-text truncate">{user?.name}</p>
              <p className="text-xs text-admin-muted truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                            transition-all duration-150 group ${
                  active
                    ? 'bg-brand-purple/15 text-brand-violet'
                    : 'text-admin-muted hover:text-admin-text hover:bg-admin-elevated'
                }`}
              >
                <Icon size={16} className={active ? 'text-brand-violet' : 'text-admin-muted group-hover:text-admin-text'} />
                {label}
                {active && <ChevronRight size={14} className="ml-auto text-brand-violet/60" />}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-admin-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-admin-muted
                       hover:text-danger hover:bg-danger/5 transition-all duration-150"
          >
            <LogOut size={16} />
            Выйти
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="flex md:hidden items-center gap-3 px-4 py-3 bg-admin-surface border-b border-admin-border">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-admin-muted hover:text-admin-text transition-colors"
          >
            <Menu size={20} />
          </button>
          <span className="text-admin-text font-semibold font-display">WishList</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
