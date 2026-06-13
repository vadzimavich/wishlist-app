'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Plus, Trash2, Pencil, Gift, Link2, X, Image } from 'lucide-react'
import { wishlistApi } from '@/lib/api'
import { WishlistItem, CreateWishlistItemForm } from '@/types'

const EMPTY_FORM: CreateWishlistItemForm = {
  name: '', price: '', currency: 'RUB', photoUrl: '', sourceUrl: '', description: '',
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  Available: { label: 'Свободен', cls: 'badge-available' },
  Reserved: { label: 'Выбран', cls: 'badge-reserved' },
  Collective: { label: 'Сбор', cls: 'badge-collective' },
  Purchased: { label: 'Куплен', cls: 'badge-reserved' },
}

export default function WishlistPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<WishlistItem | null>(null)
  const [form, setForm] = useState<CreateWishlistItemForm>(EMPTY_FORM)
  const [urlImporting, setUrlImporting] = useState(false)
  const [importUrl, setImportUrl] = useState('')

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: wishlistApi.getItems,
  })

  const createMutation = useMutation({
    mutationFn: wishlistApi.createItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlist'] })
      toast.success('Товар добавлен!')
      closeModal()
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Ошибка'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateWishlistItemForm> }) =>
      wishlistApi.updateItem(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlist'] })
      toast.success('Сохранено')
      closeModal()
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Ошибка'),
  })

  const deleteMutation = useMutation({
    mutationFn: wishlistApi.deleteItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlist'] })
      toast.success('Товар удалён')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Ошибка'),
  })

  const importMutation = useMutation({
    mutationFn: wishlistApi.parseUrl,
    onSuccess: (data) => {
      setForm(prev => ({
        ...prev,
        name: data.name ?? prev.name,
        price: data.price?.toString() ?? prev.price,
        photoUrl: data.imageUrl ?? prev.photoUrl,
        sourceUrl: data.sourceUrl,
        description: data.description ?? prev.description,
      }))
      setUrlImporting(false)
      toast.success('Данные загружены')
    },
    onError: () => toast.error('Не удалось получить данные по ссылке'),
  })

  const openCreate = () => { setForm(EMPTY_FORM); setEditing(null); setModal('create') }
  const openEdit = (item: WishlistItem) => {
    setEditing(item)
    setForm({
      name: item.name, price: item.price?.toString() ?? '', currency: item.currency ?? 'RUB',
      photoUrl: item.photoUrl ?? '', sourceUrl: item.sourceUrl ?? '',
      description: item.description ?? '',
    })
    setModal('edit')
  }
  const closeModal = () => { setModal(null); setEditing(null); setImportUrl('') }
  const setField = (k: keyof CreateWishlistItemForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (modal === 'edit' && editing) {
      updateMutation.mutate({ id: editing.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold font-display text-admin-text">Вишлист</h1>
          <p className="text-admin-muted text-sm mt-0.5">{items.length} товаров</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-purple hover:bg-brand-violet
                     text-white text-sm font-medium rounded-xl transition-all duration-200
                     hover:shadow-lg hover:shadow-brand-purple/25 active:scale-95">
          <Plus size={16} /> Добавить
        </button>
      </div>

      {/* Items */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-admin-surface border border-admin-border rounded-xl shimmer" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <Gift size={48} className="text-admin-muted mx-auto mb-4 opacity-30" />
          <p className="text-admin-text font-medium">Вишлист пустой</p>
          <p className="text-admin-muted text-sm mt-1">Добавь первый товар — подарки сами себя не купят</p>
          <button onClick={openCreate}
            className="mt-4 px-5 py-2 bg-brand-purple hover:bg-brand-violet text-white text-sm rounded-xl transition-colors">
            Добавить товар
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="flex items-center gap-4 bg-admin-surface border border-admin-border
                           rounded-xl px-4 py-3 hover:border-admin-muted/30 transition-colors group"
              >
                {/* Photo */}
                <div className="w-12 h-12 rounded-lg bg-admin-elevated overflow-hidden shrink-0">
                  {item.photoUrl ? (
                    <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Gift size={18} className="text-admin-muted" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-admin-text truncate">{item.name}</p>
                    {item.sourceUrl && (
                      <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
                        className="text-admin-muted hover:text-brand-violet transition-colors shrink-0">
                        <Link2 size={12} />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {item.price && (
                      <span className="text-xs text-admin-muted">
                        {item.price.toLocaleString('ru')} ₽
                      </span>
                    )}
                    {item.activeClaim && (
                      <span className="text-xs text-admin-muted">
                        → {item.activeClaim.claimer.name}
                        {item.activeClaim.participants.length > 0 &&
                          ` +${item.activeClaim.participants.length}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status */}
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0
                                  ${STATUS_LABELS[item.status]?.cls ?? 'badge-available'}`}>
                  {STATUS_LABELS[item.status]?.label ?? item.status}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(item)}
                    className="p-1.5 rounded-lg text-admin-muted hover:text-admin-text hover:bg-admin-elevated transition-all">
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Удалить «${item.name}»?`)) deleteMutation.mutate(item.id)
                    }}
                    className="p-1.5 rounded-lg text-admin-muted hover:text-danger hover:bg-danger/10 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Modal ── */}
      <AnimatePresence>
        {modal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={closeModal}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-2xl bg-admin-surface border border-admin-border rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
              >
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-admin-border">
                  <h2 className="font-semibold font-display text-admin-text">
                    {modal === 'create' ? 'Добавить товар' : 'Редактировать товар'}
                  </h2>
                  <button onClick={closeModal} className="text-admin-muted hover:text-admin-text transition-colors">
                    <X size={18} />
                  </button>
                </div>

                {/* URL import */}
                <div className="px-6 pt-4">
                  <div className="flex gap-2 mb-4">
                    <input
                      className="admin-input text-xs"
                      placeholder="Вставь ссылку с маркетплейса для автозаполнения..."
                      value={importUrl}
                      onChange={e => setImportUrl(e.target.value)}
                    />
                    <button
                      onClick={() => importMutation.mutate(importUrl)}
                      disabled={!importUrl || importMutation.isPending}
                      className="shrink-0 px-3 py-2 bg-admin-elevated border border-admin-border rounded-lg
                                 text-admin-muted hover:text-admin-text text-xs transition-all
                                 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {importMutation.isPending ? '...' : 'Загрузить'}
                    </button>
                  </div>
                </div>

                {/* Form — two columns on desktop */}
                <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs text-admin-muted mb-1.5">Название *</label>
                      <input className="admin-input" placeholder="Что хочешь получить?" value={form.name}
                        onChange={setField('name')} required maxLength={200} />
                    </div>

                    <div>
                      <label className="block text-xs text-admin-muted mb-1.5">Цена</label>
                      <input type="number" className="admin-input" placeholder="0"
                        value={form.price} onChange={setField('price')} min={0} step="0.01" />
                    </div>

                    <div>
                      <label className="block text-xs text-admin-muted mb-1.5">Валюта</label>
                      <select className="admin-input" value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                        <option value="RUB">₽ Рубль</option>
                        <option value="BYN">Br Бел. рубль</option>
                        <option value="USD">$ Доллар</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-admin-muted mb-1.5">Фото (URL)</label>
                      <div className="flex gap-2 items-start">
                        <input className="admin-input" placeholder="https://..." value={form.photoUrl}
                          onChange={setField('photoUrl')} />
                        {form.photoUrl && (
                          <img src={form.photoUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-admin-border" />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-admin-muted mb-1.5">Ссылка на товар</label>
                      <input className="admin-input" placeholder="https://wildberries.ru/..." value={form.sourceUrl}
                        onChange={setField('sourceUrl')} />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs text-admin-muted mb-1.5">Описание</label>
                      <textarea className="admin-input resize-none" rows={2} placeholder="Дополнительные пожелания..."
                        value={form.description} onChange={setField('description')} maxLength={1000} />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={closeModal}
                      className="flex-1 py-2.5 rounded-xl border border-admin-border text-admin-muted
                                 hover:text-admin-text hover:border-admin-muted transition-all text-sm">
                      Отмена
                    </button>
                    <button type="submit" disabled={isPending}
                      className="flex-1 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-violet text-white
                                 font-semibold transition-all text-sm disabled:opacity-50">
                      {isPending ? 'Сохранение...' : modal === 'create' ? 'Добавить' : 'Сохранить'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
