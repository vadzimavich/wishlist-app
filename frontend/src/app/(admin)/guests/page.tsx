'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, Copy, Check, ExternalLink } from 'lucide-react'
import { eventsApi } from '@/lib/api'
import { useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'

const RSVP_LABELS: Record<string, { label: string; cls: string }> = {
  Pending:      { label: 'Ожидает',    cls: 'text-admin-muted bg-admin-muted/10 border-admin-muted/20' },
  Attending:    { label: 'Придёт',     cls: 'text-success  bg-success/10        border-success/20' },
  NotAttending: { label: 'Не придёт',  cls: 'text-danger   bg-danger/10         border-danger/20' },
}

export default function GuestsPage() {
  const [copied, setCopied] = useState<string | null>(null)
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.getEvents,
  })

  const allGuests = events.flatMap(ev =>
    ev.guests.map(g => ({ ...g, eventTitle: ev.title, eventId: ev.id }))
  )

  const copyLink = (token: string, id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const stats = {
    total: allGuests.length,
    attending: allGuests.filter(g => g.rsvpStatus === 'Attending').length,
    notAttending: allGuests.filter(g => g.rsvpStatus === 'NotAttending').length,
    pending: allGuests.filter(g => g.rsvpStatus === 'Pending').length,
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold font-display text-admin-text">Гости</h1>
        <p className="text-admin-muted text-sm mt-0.5">Все гости по всем событиям</p>
      </div>

      {/* Stats */}
      {allGuests.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Всего', value: stats.total, color: 'text-brand-violet' },
            { label: 'Придут', value: stats.attending, color: 'text-success' },
            { label: 'Не придут', value: stats.notAttending, color: 'text-danger' },
            { label: 'Ожидает', value: stats.pending, color: 'text-admin-muted' },
          ].map(s => (
            <div key={s.label} className="bg-admin-surface border border-admin-border rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-admin-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Guests grouped by event */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-admin-surface border border-admin-border rounded-xl shimmer" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20">
          <Users size={48} className="text-admin-muted mx-auto mb-4 opacity-30" />
          <p className="text-admin-text font-medium">Нет событий</p>
          <p className="text-admin-muted text-sm mt-1">Сначала создай событие, потом добавь гостей</p>
          <Link href="/events"
            className="mt-4 inline-block px-5 py-2 bg-brand-purple hover:bg-brand-violet text-white text-sm rounded-xl transition-colors">
            Создать событие
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {events.filter(ev => ev.guests.length > 0).map(ev => (
            <div key={ev.id}>
              {/* Event header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-admin-text">{ev.title}</h2>
                  <span className="text-xs text-admin-muted">
                    {format(new Date(ev.date), 'd MMM', { locale: ru })}
                  </span>
                </div>
                <Link href="/events" className="text-xs text-brand-violet hover:underline flex items-center gap-1">
                  Управление <ExternalLink size={11} />
                </Link>
              </div>

              {/* Guest list */}
              <div className="space-y-2">
                {ev.guests.map(guest => {
                  const cfg = RSVP_LABELS[guest.rsvpStatus] ?? { label: guest.rsvpStatus, cls: 'text-admin-muted bg-admin-muted/10 border-admin-muted/20' }
                  return (
                    <motion.div
                      key={guest.id}
                      layout
                      className="flex items-center gap-3 bg-admin-surface border border-admin-border
                                 rounded-xl px-4 py-3 hover:border-admin-muted/30 transition-colors group"
                    >
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-brand-purple/20 border border-brand-purple/15
                                      flex items-center justify-center text-base shrink-0">
                        {guest.emoji || '🙂'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-admin-text">{guest.name}</p>
                        {guest.rsvpNote && (
                          <p className="text-xs text-admin-muted truncate mt-0.5">"{guest.rsvpNote}"</p>
                        )}
                      </div>

                      {/* RSVP status */}
                      <span className={`text-xs px-2.5 py-1 rounded-full border shrink-0 ${cfg.cls}`}>
                        {cfg.label}
                      </span>

                      {/* Copy invite link */}
                      <button
                        onClick={() => copyLink(guest.token, guest.id)}
                        title="Скопировать ссылку-приглашение"
                        className="p-1.5 rounded-lg text-admin-muted hover:text-brand-violet
                                   hover:bg-brand-purple/10 transition-all opacity-0 group-hover:opacity-100"
                      >
                        {copied === guest.id
                          ? <Check size={14} className="text-success" />
                          : <Copy size={14} />}
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))}

          {events.every(ev => ev.guests.length === 0) && (
            <div className="text-center py-20">
              <Users size={48} className="text-admin-muted mx-auto mb-4 opacity-30" />
              <p className="text-admin-text font-medium">Гостей ещё нет</p>
              <p className="text-admin-muted text-sm mt-1">Добавь гостей через управление событиями</p>
              <Link href="/events"
                className="mt-4 inline-block px-5 py-2 bg-brand-purple hover:bg-brand-violet text-white text-sm rounded-xl transition-colors">
                К событиям
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
