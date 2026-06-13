'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Plus, Trash2, Pencil, Calendar, Users, X, Copy, Check } from 'lucide-react'
import { eventsApi, guestsApi } from '@/lib/api'
import { Event, CreateEventForm, CreateGuestForm, Guest } from '@/types'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

const EMPTY_EVENT: CreateEventForm = { title: '', date: '', location: '', description: '', coverImageUrl: '' }
const EMPTY_GUEST: CreateGuestForm = { name: '', phone: '', email: '' }

function useCopyToClipboard() {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    })
  }
  return { copied, copy }
}

const RSVP_LABELS = {
  Pending: { label: 'Ожидает', color: 'text-admin-muted' },
  Attending: { label: 'Придёт', color: 'text-success' },
  NotAttending: { label: 'Не придёт', color: 'text-danger' },
}

export default function EventsPage() {
  const qc = useQueryClient()
  const { copied, copy } = useCopyToClipboard()
  const [eventModal, setEventModal] = useState<'create' | 'edit' | null>(null)
  const [guestModal, setGuestModal] = useState<Event | null>(null)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [eventForm, setEventForm] = useState<CreateEventForm>(EMPTY_EVENT)
  const [guestForm, setGuestForm] = useState<CreateGuestForm>(EMPTY_GUEST)

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.getEvents,
  })

  const createEvent = useMutation({
    mutationFn: eventsApi.createEvent,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast.success('Событие создано!'); closeEventModal() },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Ошибка'),
  })

  const updateEvent = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateEventForm> }) => eventsApi.updateEvent(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast.success('Сохранено'); closeEventModal() },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Ошибка'),
  })

  const deleteEvent = useMutation({
    mutationFn: eventsApi.deleteEvent,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast.success('Событие удалено') },
  })

  const addGuest = useMutation({
    mutationFn: ({ eventId, form }: { eventId: string; form: CreateGuestForm }) =>
      guestsApi.addGuest(eventId, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast.success('Гость добавлен!'); setGuestForm(EMPTY_GUEST) },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Ошибка'),
  })

  const deleteGuest = useMutation({
    mutationFn: ({ eventId, guestId }: { eventId: string; guestId: string }) =>
      guestsApi.deleteGuest(eventId, guestId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast.success('Гость удалён') },
  })

  const openCreateEvent = () => { setEventForm(EMPTY_EVENT); setEditingEvent(null); setEventModal('create') }
  const openEditEvent = (ev: Event) => {
    setEditingEvent(ev)
    setEventForm({
      title: ev.title,
      date: format(new Date(ev.date), "yyyy-MM-dd'T'HH:mm"),
      location: ev.location ?? '',
      description: ev.description ?? '',
      coverImageUrl: ev.coverImageUrl ?? '',
    })
    setEventModal('edit')
  }
  const closeEventModal = () => { setEventModal(null); setEditingEvent(null) }

  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (eventModal === 'edit' && editingEvent) {
      updateEvent.mutate({ id: editingEvent.id, data: eventForm })
    } else {
      createEvent.mutate(eventForm)
    }
  }

  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestModal) return
    addGuest.mutate({ eventId: guestModal.id, form: guestForm })
  }

  const setEF = (k: keyof CreateEventForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setEventForm(p => ({ ...p, [k]: e.target.value }))

  const setGF = (k: keyof CreateGuestForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setGuestForm(p => ({ ...p, [k]: e.target.value }))

  // Свежие данные гостей из кеша
  const currentGuestEvent = events.find(e => e.id === guestModal?.id) ?? guestModal

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold font-display text-admin-text">События</h1>
          <p className="text-admin-muted text-sm mt-0.5">{events.length} событий</p>
        </div>
        <button onClick={openCreateEvent}
          className="flex items-center gap-2 px-4 py-2 bg-brand-purple hover:bg-brand-violet
                     text-white text-sm font-medium rounded-xl transition-all hover:shadow-lg
                     hover:shadow-brand-purple/25 active:scale-95">
          <Plus size={16} /> Создать событие
        </button>
      </div>

      {/* Events list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-admin-surface border border-admin-border rounded-xl shimmer" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20">
          <Calendar size={48} className="text-admin-muted mx-auto mb-4 opacity-30" />
          <p className="text-admin-text font-medium">Нет событий</p>
          <p className="text-admin-muted text-sm mt-1">Создай первое событие и пригласи гостей</p>
          <button onClick={openCreateEvent}
            className="mt-4 px-5 py-2 bg-brand-purple hover:bg-brand-violet text-white text-sm rounded-xl transition-colors">
            Создать событие
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {events.map(ev => {
              const attending = ev.guests.filter(g => g.rsvpStatus === 'Attending').length
              const past = new Date(ev.date) < new Date()
              return (
                <motion.div
                  key={ev.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="bg-admin-surface border border-admin-border rounded-xl p-5
                             hover:border-admin-muted/30 transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    {/* Cover */}
                    <div className="w-14 h-14 rounded-xl bg-admin-elevated overflow-hidden shrink-0">
                      {ev.coverImageUrl ? (
                        <img src={ev.coverImageUrl} alt={ev.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🎉</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-admin-text">{ev.title}</p>
                          <p className="text-sm text-admin-muted mt-0.5">
                            {format(new Date(ev.date), "d MMMM yyyy, HH:mm", { locale: ru })}
                            {past && <span className="ml-2 text-xs opacity-60">(прошло)</span>}
                          </p>
                          {ev.location && (
                            <p className="text-xs text-admin-muted mt-0.5">📍 {ev.location}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => openEditEvent(ev)}
                            className="p-1.5 rounded-lg text-admin-muted hover:text-admin-text hover:bg-admin-elevated transition-all">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => deleteEvent.mutate(ev.id)}
                            className="p-1.5 rounded-lg text-admin-muted hover:text-danger hover:bg-danger/10 transition-all">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3">
                        <button
                          onClick={() => setGuestModal(ev)}
                          className="flex items-center gap-1.5 text-xs text-admin-muted hover:text-admin-text transition-colors"
                        >
                          <Users size={13} />
                          {ev.guests.length} гостей · {attending} придут
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── Event Modal ── */}
      <AnimatePresence>
        {eventModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={closeEventModal} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] max-w-lg
                         bg-admin-surface border border-admin-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-admin-border">
                <h2 className="font-semibold text-admin-text">
                  {eventModal === 'create' ? 'Новое событие' : 'Редактировать событие'}
                </h2>
                <button onClick={closeEventModal} className="text-admin-muted hover:text-admin-text"><X size={18} /></button>
              </div>

              <form onSubmit={handleEventSubmit} className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
                <div>
                  <label className="block text-xs text-admin-muted mb-1.5">Название *</label>
                  <input className="admin-input" placeholder="День рождения, Новый год..." value={eventForm.title}
                    onChange={setEF('title')} required maxLength={200} />
                </div>
                <div>
                  <label className="block text-xs text-admin-muted mb-1.5">Дата и время *</label>
                  <input type="datetime-local" className="admin-input" value={eventForm.date}
                    onChange={setEF('date')} required />
                </div>
                <div>
                  <label className="block text-xs text-admin-muted mb-1.5">Место</label>
                  <input className="admin-input" placeholder="Адрес или место встречи" value={eventForm.location}
                    onChange={setEF('location')} />
                </div>
                <div>
                  <label className="block text-xs text-admin-muted mb-1.5">Описание</label>
                  <textarea className="admin-input resize-none" rows={3} value={eventForm.description}
                    onChange={setEF('description')} placeholder="Детали события..." />
                </div>
                <div>
                  <label className="block text-xs text-admin-muted mb-1.5">Обложка (URL)</label>
                  <input className="admin-input" placeholder="https://..." value={eventForm.coverImageUrl}
                    onChange={setEF('coverImageUrl')} />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeEventModal}
                    className="flex-1 py-2.5 rounded-xl border border-admin-border text-admin-muted
                               hover:text-admin-text text-sm transition-all">
                    Отмена
                  </button>
                  <button type="submit" disabled={createEvent.isPending || updateEvent.isPending}
                    className="flex-1 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-violet text-white
                               font-semibold text-sm transition-all disabled:opacity-50">
                    {createEvent.isPending || updateEvent.isPending ? '...' :
                      eventModal === 'create' ? 'Создать' : 'Сохранить'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Guest Management Modal ── */}
      <AnimatePresence>
        {guestModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setGuestModal(null)} />
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm
                         bg-admin-surface border-l border-admin-border shadow-2xl overflow-y-auto"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-admin-border sticky top-0 bg-admin-surface">
                <div>
                  <h2 className="font-semibold text-admin-text text-sm">{currentGuestEvent?.title}</h2>
                  <p className="text-xs text-admin-muted mt-0.5">Управление гостями</p>
                </div>
                <button onClick={() => setGuestModal(null)} className="text-admin-muted hover:text-admin-text"><X size={18} /></button>
              </div>

              {/* Add guest form */}
              <form onSubmit={handleAddGuest} className="px-5 py-4 border-b border-admin-border space-y-3">
                <p className="text-xs font-medium text-admin-muted uppercase tracking-wide">Добавить гостя</p>
                <input className="admin-input text-sm" placeholder="Имя *" value={guestForm.name}
                  onChange={setGF('name')} required />
                <input className="admin-input text-sm" placeholder="Телефон" value={guestForm.phone}
                  onChange={setGF('phone')} type="tel" />
                <input className="admin-input text-sm" placeholder="Email" value={guestForm.email}
                  onChange={setGF('email')} type="email" />
                <button type="submit" disabled={addGuest.isPending}
                  className="w-full py-2 bg-brand-purple hover:bg-brand-violet text-white text-sm rounded-xl
                             transition-all disabled:opacity-50">
                  {addGuest.isPending ? '...' : 'Добавить гостя'}
                </button>
              </form>

              {/* Guests list */}
              <div className="px-5 py-4 space-y-2">
                <p className="text-xs font-medium text-admin-muted uppercase tracking-wide mb-3">
                  Список гостей ({currentGuestEvent?.guests.length ?? 0})
                </p>
                {(currentGuestEvent?.guests ?? []).map((guest) => (
                  <div key={guest.id}
                    className="flex items-center gap-3 py-3 border-b border-admin-border last:border-0">
                    <div className="w-8 h-8 rounded-full bg-brand-purple/20 flex items-center justify-center text-xs font-bold text-brand-violet">
                      {guest.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-admin-text truncate">{guest.name}</p>
                      <p className={`text-xs ${RSVP_LABELS[guest.rsvpStatus].color}`}>
                        {RSVP_LABELS[guest.rsvpStatus].label}
                      </p>
                    </div>

                    {/* Copy invite link */}
                    <button
                      onClick={() => copy(
                        `${window.location.origin}/invite/${guest.token}`,
                        guest.id
                      )}
                      title="Скопировать ссылку"
                      className="p-1.5 rounded-lg text-admin-muted hover:text-brand-violet hover:bg-brand-purple/10 transition-all"
                    >
                      {copied === guest.id ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    </button>

                    <button
                      onClick={() => deleteGuest.mutate({ eventId: guestModal.id, guestId: guest.id })}
                      className="p-1.5 rounded-lg text-admin-muted hover:text-danger hover:bg-danger/10 transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
