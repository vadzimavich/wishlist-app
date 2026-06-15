'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Plus, Trash2, Pencil, Calendar, Users, X, Copy, Check, Eye, MapPin, MessageCircle } from 'lucide-react'
import { eventsApi, guestsApi } from '@/lib/api'
import { Event, CreateEventForm, CreateGuestForm, UpdateGuestForm, Guest } from '@/types'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

const EMOJI_OPTIONS = [
  '🙂','😎','🥳','🎉','💝','🎀','🌸','✨','🦄','🐱','🐶','🌟',
  '🦊','🐼','🐨','🦁','🐸','🦋','🐙','🦖','🌺','🍀','🌈','⭐',
  '🔥','💎','🎸','🏄','🚀','🎪','🧩','🏆','👑','🎭','🍕','🧁',
]

const EMPTY_EVENT: CreateEventForm = { title: '', date: '', location: '', latitude: '', longitude: '', description: '', coverImageUrl: '' }
const EMPTY_GUEST: CreateGuestForm = { name: '', emoji: '🙂' }

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

const RSVP_LABELS: Record<string, { label: string; color: string }> = {
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
  const [editingGuest, setEditingGuest] = useState<{ guest: Guest; eventId: string } | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [editGuestCount, setEditGuestCount] = useState(1)

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

  const updateGuest = useMutation({
    mutationFn: ({ eventId, guestId, form }: { eventId: string; guestId: string; form: UpdateGuestForm }) =>
      guestsApi.updateGuest(eventId, guestId, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast.success('Сохранено'); setEditingGuest(null) },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Ошибка'),
  })

  const openCreateEvent = () => { setEventForm(EMPTY_EVENT); setEditingEvent(null); setEventModal('create') }
  const openEditEvent = (ev: Event) => {
    setEditingEvent(ev)
    setEventForm({
      title: ev.title,
      date: format(new Date(ev.date), "yyyy-MM-dd'T'HH:mm"),
      location: ev.location ?? '',
      latitude: ev.latitude?.toString() ?? '',
      longitude: ev.longitude?.toString() ?? '',
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
              const totalGuests = ev.guests.reduce((s, g) => s + Math.max(1, g.guestCount), 0)
              const attending = ev.guests.filter(g => g.rsvpStatus === 'Attending').reduce((s, g) => s + Math.max(1, g.guestCount), 0)
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
                          {totalGuests} гостей · {attending} придут
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-2xl bg-admin-surface border border-admin-border rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-admin-border">
                  <h2 className="font-semibold font-display text-admin-text">
                    {eventModal === 'create' ? 'Новое событие' : 'Редактировать событие'}
                  </h2>
                  <button onClick={closeEventModal} className="text-admin-muted hover:text-admin-text"><X size={18} /></button>
                </div>

                <form onSubmit={handleEventSubmit} className="px-6 py-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
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
                      <label className="block text-xs text-admin-muted mb-1.5">Обложка (URL)</label>
                      <input className="admin-input" placeholder="https://..." value={eventForm.coverImageUrl}
                        onChange={setEF('coverImageUrl')} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-admin-muted mb-1.5">Описание</label>
                      <textarea className="admin-input resize-none" rows={2} value={eventForm.description}
                        onChange={setEF('description')} placeholder="Детали события..." />
                    </div>
                  </div>

                  {/* Секция адреса на карте */}
                  <div className="border border-admin-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-admin-muted" />
                      <p className="text-xs font-medium text-admin-muted uppercase tracking-wide">Место проведения</p>
                    </div>
                    <input className="admin-input" placeholder="Введите адрес или название места..." value={eventForm.location}
                      onChange={setEF('location')} />
                    <EventMapPicker
                      address={eventForm.location}
                      latitude={eventForm.latitude}
                      longitude={eventForm.longitude}
                      onPick={(lat, lng) => setEventForm(p => ({ ...p, latitude: lat.toString(), longitude: lng.toString() }))}
                      onClear={() => setEventForm(p => ({ ...p, latitude: '', longitude: '' }))}
                    />
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
            </div>
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
                <div className="flex gap-3 items-end">
                  <div>
                    <label className="block text-xs text-admin-muted mb-1.5">Аватар</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {EMOJI_OPTIONS.map(e => (
                        <button key={e} type="button" onClick={() => setGuestForm(p => ({ ...p, emoji: e }))}
                          className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all
                            ${guestForm.emoji === e
                              ? 'bg-brand-purple/20 border border-brand-violet/40 scale-110'
                              : 'bg-admin-elevated border border-admin-border hover:border-admin-muted'
                            }`}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <input className="admin-input text-sm" placeholder="Имя *" value={guestForm.name}
                  onChange={setGF('name')} required />
                <button type="submit" disabled={addGuest.isPending}
                  className="w-full py-2 bg-brand-purple hover:bg-brand-violet text-white text-sm rounded-xl
                             transition-all disabled:opacity-50">
                  {addGuest.isPending ? '...' : 'Добавить гостя'}
                </button>
              </form>

              {/* Guests list */}
              <div className="px-5 py-4 space-y-2">
                <p className="text-xs font-medium text-admin-muted uppercase tracking-wide mb-3">
                   Список гостей ({currentGuestEvent?.guests.reduce((s, g) => s + Math.max(1, g.guestCount), 0) ?? 0})
                </p>
                {(currentGuestEvent?.guests ?? []).map((guest) =>
                  editingGuest?.guest.id === guest.id ? (
                    /* ── Inline Edit Form ── */
                    <div key={guest.id} className="flex flex-col gap-2 py-3 border-b border-admin-border last:border-0">
                      {/* Emoji picker */}
                      <div>
                        <label className="block text-xs text-admin-muted mb-1">Аватар</label>
                        <div className="flex gap-1.5 flex-wrap">
                          {EMOJI_OPTIONS.map(e => (
                            <button key={e} type="button" onClick={() => setEditEmoji(e)}
                              className={`w-7 h-7 rounded-lg text-base flex items-center justify-center transition-all
                                ${editEmoji === e
                                  ? 'bg-brand-purple/20 border border-brand-violet/40 scale-110'
                                  : 'bg-admin-elevated border border-admin-border hover:border-admin-muted'
                                }`}>
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Name */}
                      <input className="admin-input text-sm" placeholder="Имя *" value={editName}
                        onChange={e => setEditName(e.target.value)} required />
                      {/* Guest count */}
                      <div>
                        <label className="block text-xs text-admin-muted mb-1">Количество гостей</label>
                        <input type="number" className="admin-input text-sm" min={1} value={editGuestCount}
                          onChange={e => setEditGuestCount(parseInt(e.target.value) || 1)} />
                      </div>
                      {/* Actions */}
                      <div className="flex gap-2 mt-1">
                        <button type="button" onClick={() => setEditingGuest(null)}
                          className="flex-1 py-1.5 rounded-lg border border-admin-border text-admin-muted
                                     hover:text-admin-text text-xs transition-all">
                          Отмена
                        </button>
                        <button type="button"
                          onClick={() => updateGuest.mutate({
                            eventId: guestModal.id,
                            guestId: guest.id,
                            form: { name: editName, emoji: editEmoji, guestCount: editGuestCount }
                          })}
                          disabled={updateGuest.isPending || !editName.trim()}
                          className="flex-1 py-1.5 rounded-lg bg-brand-purple hover:bg-brand-violet text-white
                                     text-xs font-medium transition-all disabled:opacity-50">
                          {updateGuest.isPending ? '...' : 'Сохранить'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={guest.id}
                      className="flex items-center gap-3 py-3 border-b border-admin-border last:border-0">
                      <div className="w-8 h-8 rounded-full bg-brand-purple/20 flex items-center justify-center text-base">
                        {guest.emoji || '🙂'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-admin-text truncate">{guest.name}</p>
                        <p className={`text-xs ${RSVP_LABELS[guest.rsvpStatus]?.color ?? 'text-admin-muted'}`}>
                          {RSVP_LABELS[guest.rsvpStatus]?.label ?? guest.rsvpStatus}
                        </p>
                      </div>

                      {/* Edit button */}
                      <button
                        onClick={() => {
                          setEditingGuest({ guest, eventId: guestModal.id })
                          setEditName(guest.name)
                          setEditEmoji(guest.emoji || '🙂')
                          setEditGuestCount(guest.guestCount || 1)
                        }}
                        title="Редактировать"
                        className="p-1.5 rounded-lg text-admin-muted hover:text-brand-violet hover:bg-brand-purple/10 transition-all"
                      >
                        <Pencil size={14} />
                      </button>

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

                      {/* Preview invite */}
                      <a
                        href={`/invite/${guest.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Просмотреть как гость"
                        className="p-1.5 rounded-lg text-admin-muted hover:text-brand-violet hover:bg-brand-purple/10 transition-all"
                      >
                        <Eye size={14} />
                      </a>

                      {/* Chat */}
                      <a
                        href={`/invite/${guest.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Чат события"
                        className="p-1.5 rounded-lg text-admin-muted hover:text-sky-400 hover:bg-sky-400/10 transition-all"
                      >
                        <MessageCircle size={14} />
                      </a>

                      <button
                        onClick={() => deleteGuest.mutate({ eventId: guestModal.id, guestId: guest.id })}
                        className="p-1.5 rounded-lg text-admin-muted hover:text-danger hover:bg-danger/10 transition-all"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Map Picker Component ────────────────────────────────────────────────────

interface MapPickerProps {
  address: string
  latitude: string
  longitude: string
  onPick: (lat: number, lng: number) => void
  onClear: () => void
}

declare global {
  interface Window {
    ymaps: any
  }
}

function EventMapPicker({ address, latitude, longitude, onPick, onClear }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const placemarkRef = useRef<any>(null)
  const [mapReady, setMapReady] = useState(false)

  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY

  // Load Yandex Maps API
  useEffect(() => {
    if (!apiKey || window.ymaps) {
      if (window.ymaps) setMapReady(true)
      return
    }

    const script = document.createElement('script')
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`
    script.async = true
    script.onload = () => {
      const check = () => {
        if (window.ymaps?.Map) setMapReady(true)
        else setTimeout(check, 100)
      }
      check()
    }
    document.head.appendChild(script)
  }, [apiKey])

  // Initialize map
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return

    const center = latitude && longitude
      ? [parseFloat(latitude), parseFloat(longitude)]
      : [55.751574, 37.573856]

    const map = new window.ymaps.Map(mapRef.current, {
      center,
      zoom: latitude && longitude ? 16 : 12,
      controls: ['zoomControl'],
    })

    // Click handler to place pin
    map.events.add('click', (e: any) => {
      const coords = e.get('coords')
      onPick(coords[0], coords[1])
    })

    mapInstanceRef.current = map

    // Place existing pin if coordinates exist
    if (latitude && longitude) {
      const lat = parseFloat(latitude)
      const lng = parseFloat(longitude)
      const pm = new window.ymaps.Placemark([lat, lng], {}, {
        preset: 'islands#violetDotIcon',
        iconColor: '#8b5cf6',
      })
      map.geoObjects.add(pm)
      placemarkRef.current = pm
    }
  }, [mapReady])

  // Update placemark when coordinates change
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const map = mapInstanceRef.current

    // Remove old placemark
    if (placemarkRef.current) {
      map.geoObjects.remove(placemarkRef.current)
      placemarkRef.current = null
    }

    if (latitude && longitude) {
      const lat = parseFloat(latitude)
      const lng = parseFloat(longitude)
      const pm = new window.ymaps.Placemark([lat, lng], {}, {
        preset: 'islands#violetDotIcon',
        iconColor: '#8b5cf6',
      })
      map.geoObjects.add(pm)
      placemarkRef.current = pm
      map.setCenter([lat, lng], 16)
    }
  }, [latitude, longitude])

  // Geocode address when it changes (if no manual pin)
  useEffect(() => {
    if (!mapInstanceRef.current || !address || (latitude && longitude)) return

    const timer = setTimeout(() => {
      window.ymaps.geocode(address).then((res: any) => {
        const first = res.geoObjects.get(0)
        if (first) {
          const coords = first.geometry.getCoordinates()
          mapInstanceRef.current.setCenter(coords, 14)
        }
      }).catch(() => {})
    }, 800)

    return () => clearTimeout(timer)
  }, [address, latitude, longitude])

  if (!apiKey) {
    return (
      <p className="text-xs text-admin-muted">
        Для отображения карты добавьте <code>NEXT_PUBLIC_YANDEX_MAPS_API_KEY</code> в .env.local
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div
        ref={mapRef}
        className="w-full h-[250px] rounded-xl bg-admin-elevated border border-admin-border cursor-crosshair"
      />
      {latitude && longitude ? (
        <div className="flex items-center justify-between">
          <p className="text-xs text-admin-muted">
            📍 {parseFloat(latitude).toFixed(5)}, {parseFloat(longitude).toFixed(5)}
          </p>
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-danger hover:underline"
          >
            Убрать точку
          </button>
        </div>
      ) : (
        <p className="text-xs text-admin-muted">
          Нажмите на карту, чтобы поставить точку
        </p>
      )}
    </div>
  )
}
