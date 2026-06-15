'use client'

import { useQuery } from '@tanstack/react-query'
import { Gift, Calendar, Users, TrendingUp, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { eventsApi, wishlistApi } from '@/lib/api'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { WishlistItemStatus } from '@/types'
import { formatPrice } from '@/lib/utils'

const statusLabel: Record<WishlistItemStatus, string> = {
  Available: 'Свободен',
  Reserved: 'Выбран',
  Collective: 'Сбор открыт',
  Purchased: 'Куплен',
}

export default function DashboardPage() {
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: eventsApi.getEvents })
  const { data: items = [] } = useQuery({ queryKey: ['wishlist'], queryFn: wishlistApi.getItems })

  const totalGuests = events.reduce((acc, e) => acc + e.guests.reduce((s, g) => s + Math.max(1, g.guestCount), 0), 0)
  const claimedItems = items.filter(i => i.status !== 'Available').length
  const upcomingEvents = events.filter(e => new Date(e.date) > new Date())

  const stats = [
    { label: 'Товаров в вишлисте', value: items.length, icon: Gift, color: 'text-brand-violet', bg: 'bg-brand-purple/10' },
    { label: 'Событий', value: events.length, icon: Calendar, color: 'text-info', bg: 'bg-info/10' },
    { label: 'Гостей всего', value: totalGuests, icon: Users, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Подарков выбрано', value: claimedItems, icon: TrendingUp, color: 'text-warning', bg: 'bg-warning/10' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold font-display text-admin-text">Обзор</h1>
        <p className="text-admin-muted text-sm mt-0.5">Добро пожаловать в панель управления</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-admin-surface border border-admin-border rounded-xl p-4">
            <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-bold text-admin-text">{value}</p>
            <p className="text-xs text-admin-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming events */}
        <div className="bg-admin-surface border border-admin-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-admin-text text-sm">Ближайшие события</h2>
            <Link href="/events" className="text-xs text-brand-violet hover:underline">Все →</Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={32} className="text-admin-muted mx-auto mb-2 opacity-40" />
              <p className="text-admin-muted text-sm">Нет предстоящих событий</p>
              <Link href="/events" className="text-brand-violet text-sm hover:underline mt-1 inline-block">
                Создать событие
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.slice(0, 4).map(event => (
                <div key={event.id} className="flex items-center justify-between py-2.5 border-b border-admin-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-admin-text">{event.title}</p>
                    <p className="text-xs text-admin-muted">
                      {format(new Date(event.date), 'd MMM yyyy', { locale: ru })}
                      {event.location && ` · ${event.location}`}
                    </p>
                  </div>
                  <span className="text-xs text-admin-muted bg-admin-elevated px-2 py-1 rounded-full">
                    {event.guests.reduce((s, g) => s + Math.max(1, g.guestCount), 0)} гостей
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Wishlist status */}
        <div className="bg-admin-surface border border-admin-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-admin-text text-sm">Статусы подарков</h2>
            <Link href="/wishlist" className="text-xs text-brand-violet hover:underline">Всё →</Link>
          </div>
          {items.length === 0 ? (
            <div className="text-center py-8">
              <Gift size={32} className="text-admin-muted mx-auto mb-2 opacity-40" />
              <p className="text-admin-muted text-sm">Вишлист пуст</p>
              <Link href="/wishlist" className="text-brand-violet text-sm hover:underline mt-1 inline-block">
                Добавить товар
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  {item.photoUrl ? (
                    <img src={item.photoUrl} alt={item.name}
                      className="w-9 h-9 rounded-lg object-cover bg-admin-elevated" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-admin-elevated flex items-center justify-center">
                      <Gift size={14} className="text-admin-muted" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-admin-text truncate">{item.name}</p>
                    {item.price != null && (
                      <p className="text-xs text-admin-muted">{formatPrice(item.price, item.currency)}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                    item.status === 'Available' ? 'badge-available' :
                    item.status === 'Collective' ? 'badge-collective' :
                    'badge-reserved'
                  }`}>
                    {statusLabel[item.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
