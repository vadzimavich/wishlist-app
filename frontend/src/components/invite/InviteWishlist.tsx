'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Gift, ExternalLink, Users, Sparkles, X, Check, UserPlus } from 'lucide-react'
import { useWishlistStore } from '@/lib/store'
import { giftsApi } from '@/lib/api'
import { WishlistItem, ClaimType } from '@/types'

interface Props {
  guestToken: string
  eventId: string
  currentGuestId: string
}

const STATUS_CONFIG = {
  Available: {
    label: 'Свободен',
    cls: 'text-success bg-success/10 border-success/20',
  },
  Reserved: {
    label: 'Выбран',
    cls: 'text-warning bg-warning/10 border-warning/20',
  },
  Collective: {
    label: 'Открыт сбор',
    cls: 'text-info bg-info/10 border-info/20',
  },
  Purchased: {
    label: 'Куплен',
    cls: 'text-admin-muted bg-admin-muted/10 border-admin-muted/20',
  },
}

export function InviteWishlist({ guestToken, eventId, currentGuestId }: Props) {
  const { items } = useWishlistStore()
  const sectionRef = useRef<HTMLDivElement>(null)
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null)
  const [modalStep, setModalStep] = useState<'choose' | 'confirm' | 'success'>('choose')

  // GSAP scroll-in animation
  useEffect(() => {
    const initGsap = async () => {
      const { gsap } = await import('gsap')
      const { ScrollTrigger } = await import('gsap/ScrollTrigger')
      gsap.registerPlugin(ScrollTrigger)

      if (sectionRef.current) {
        gsap.fromTo(
          sectionRef.current.querySelectorAll('.wish-card'),
          { y: 60, opacity: 0 },
          {
            y: 0, opacity: 1,
            stagger: 0.1,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 75%',
            },
          }
        )
      }
    }
    initGsap()
  }, [items.length])

  const qc = useQueryClient()

  const claimMutation = useMutation({
    mutationFn: ({ itemId, type }: { itemId: string; type: ClaimType }) =>
      giftsApi.claimGift(guestToken, itemId, type),
    onSuccess: (updatedItem) => {
      qc.invalidateQueries({ queryKey: ['invite', guestToken] })
      setModalStep('success')
      setTimeout(() => {
        setSelectedItem(null)
        setModalStep('choose')
      }, 2000)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.error ?? 'Не удалось выбрать подарок')
      setSelectedItem(null)
    },
  })

  const joinMutation = useMutation({
    mutationFn: (claimId: string) => giftsApi.joinCollective(claimId, guestToken),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invite', guestToken] })
      toast.success('Ты присоединился к сбору! 🎉')
      setSelectedItem(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Ошибка'),
  })

  const cancelMutation = useMutation({
    mutationFn: (claimId: string) => giftsApi.cancelClaim(claimId, guestToken),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invite', guestToken] })
      toast.success('Выбор отменён')
      setSelectedItem(null)
    },
  })

  const openItem = (item: WishlistItem) => {
    if (item.status === 'Purchased') return
    setSelectedItem(item)
    setModalStep('choose')
  }

  const isMyClaim = (item: WishlistItem) =>
    item.activeClaim?.claimer.id === currentGuestId

  const isInMyCollective = (item: WishlistItem) =>
    item.activeClaim?.participants.some(p => p.id === currentGuestId) ?? false

  const selected = selectedItem
    ? items.find(i => i.id === selectedItem.id) ?? selectedItem
    : null

  if (items.length === 0) return null

  return (
    <section ref={sectionRef} className="relative z-10 px-4 py-8 max-w-2xl mx-auto">
      {/* Section header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-4">
          <Sparkles size={14} className="text-brand-champagne" />
          <span className="text-brand-pearl/60 text-sm">Вишлист</span>
        </div>
        <h2 className="font-display font-bold text-3xl md:text-4xl text-brand-pearl">
          Выбери подарок
        </h2>
        <p className="text-brand-pearl/40 text-sm mt-2">
          Нажми на товар, чтобы выбрать или открыть групповой сбор
        </p>
      </div>

      {/* Items grid */}
      <div className="space-y-3">
        {items.map(item => {
          const status = STATUS_CONFIG[item.status]
          const myItem = isMyClaim(item)
          const inCollective = isInMyCollective(item)
          const canJoin = item.status === 'Collective' && !myItem && !inCollective

          return (
            <motion.div
              key={item.id}
              layout
              className={`wish-card liquid-glass p-4 flex items-start gap-4 cursor-pointer
                          transition-all duration-300
                          ${item.status === 'Available' || canJoin
                            ? 'hover:border-brand-violet/40 hover:-translate-y-0.5'
                            : ''
                          }`}
              onClick={() => openItem(item)}
              whileHover={item.status === 'Available' || canJoin ? { scale: 1.01 } : {}}
              whileTap={item.status === 'Available' || canJoin ? { scale: 0.99 } : {}}
            >
              {/* Photo */}
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden shrink-0
                              bg-brand-deep border border-brand-pearl/5">
                {item.photoUrl ? (
                  <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Gift size={24} className="text-brand-pearl/20" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-brand-pearl font-medium text-sm md:text-base leading-tight">
                      {item.name}
                    </p>
                    {item.price && (
                      <p className="gradient-text-gold text-sm font-semibold mt-0.5">
                        {item.price.toLocaleString('ru')} ₽
                      </p>
                    )}
                  </div>

                  {/* Status badge */}
                  <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium ${status.cls}`}>
                    {status.label}
                  </span>
                </div>

                {/* Claim info */}
                {item.activeClaim && (
                  <div className="mt-2">
                    {myItem ? (
                      <p className="text-xs text-brand-violet">✓ Твой выбор</p>
                    ) : inCollective ? (
                      <p className="text-xs text-info">✓ Ты в сборе</p>
                    ) : (
                      <p className="text-xs text-brand-pearl/40">
                        {item.activeClaim.claimer.name}
                        {item.activeClaim.participants.length > 0 &&
                          ` + ${item.activeClaim.participants.length} чел.`}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 mt-2">
                  {canJoin && (
                    <span className="text-xs text-info flex items-center gap-1">
                      <UserPlus size={12} />
                      Присоединиться к сбору
                    </span>
                  )}
                  {item.sourceUrl && (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-brand-pearl/30 hover:text-brand-pearl/60
                                 flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink size={11} />
                      Посмотреть товар
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* ── Gift Modal ── */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
              onClick={() => { setSelectedItem(null); setModalStep('choose') }}
            />

            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed inset-x-4 bottom-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2
                         md:bottom-auto md:top-1/2 md:-translate-y-1/2 z-50 w-full md:max-w-md"
            >
              <div className="liquid-glass p-6 shadow-2xl">
                {/* Close */}
                <button
                  onClick={() => { setSelectedItem(null); setModalStep('choose') }}
                  className="absolute top-4 right-4 text-brand-pearl/40 hover:text-brand-pearl transition-colors"
                >
                  <X size={18} />
                </button>

                {/* Item preview */}
                <div className="flex gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-brand-deep shrink-0">
                    {selected.photoUrl ? (
                      <img src={selected.photoUrl} alt={selected.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Gift size={24} className="text-brand-pearl/20" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-brand-pearl font-medium">{selected.name}</p>
                    {selected.price && (
                      <p className="gradient-text-gold font-bold text-lg">
                        {selected.price.toLocaleString('ru')} ₽
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Step: choose type ── */}
                <AnimatePresence mode="popLayout">
                  {modalStep === 'choose' && (
                    <motion.div
                      key="choose"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      {/* Available: buy solo or collective */}
                      {selected.status === 'Available' && (
                        <>
                          <p className="text-brand-pearl/60 text-sm mb-4 text-center">
                            Как хочешь подарить?
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => claimMutation.mutate({ itemId: selected.id, type: 'Solo' })}
                              disabled={claimMutation.isPending}
                              className="group flex flex-col items-center gap-2 p-4 rounded-xl
                                         border border-brand-pearl/10 hover:border-brand-violet/40
                                         hover:bg-brand-violet/10 transition-all disabled:opacity-50"
                            >
                              <span className="text-2xl">🎁</span>
                              <span className="text-brand-pearl text-sm font-medium">Куплю сам</span>
                              <span className="text-brand-pearl/40 text-xs text-center">
                                Подарок только от тебя
                              </span>
                            </button>

                            <button
                              onClick={() => claimMutation.mutate({ itemId: selected.id, type: 'Collective' })}
                              disabled={claimMutation.isPending}
                              className="group flex flex-col items-center gap-2 p-4 rounded-xl
                                         border border-brand-pearl/10 hover:border-brand-champagne/40
                                         hover:bg-brand-champagne/5 transition-all disabled:opacity-50"
                            >
                              <span className="text-2xl">🤝</span>
                              <span className="text-brand-pearl text-sm font-medium">Открыть сбор</span>
                              <span className="text-brand-pearl/40 text-xs text-center">
                                Другие могут скинуться
                              </span>
                            </button>
                          </div>
                        </>
                      )}

                      {/* Collective: join */}
                      {selected.status === 'Collective' &&
                        !isMyClaim(selected) &&
                        !isInMyCollective(selected) && (
                          <>
                            <p className="text-brand-pearl/60 text-sm mb-2 text-center">
                              Открыт групповой сбор
                            </p>
                            <p className="text-brand-pearl/40 text-xs text-center mb-4">
                              Начал: {selected.activeClaim!.claimer.name}
                              {selected.activeClaim!.participants.length > 0 &&
                                ` · ещё ${selected.activeClaim!.participants.length} чел.`}
                            </p>
                            <button
                              onClick={() => joinMutation.mutate(selected.activeClaim!.id)}
                              disabled={joinMutation.isPending}
                              className="w-full py-3 rounded-xl bg-info/20 border border-info/30
                                         text-info font-semibold hover:bg-info/30 transition-all
                                         disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              <UserPlus size={16} />
                              {joinMutation.isPending ? 'Присоединяемся...' : 'Присоединиться к сбору'}
                            </button>
                          </>
                        )}

                      {/* My claim: cancel */}
                      {isMyClaim(selected) && (
                        <>
                          <p className="text-brand-pearl/60 text-sm text-center mb-4">
                            Ты выбрал этот подарок
                          </p>
                          <button
                            onClick={() => cancelMutation.mutate(selected.activeClaim!.id)}
                            disabled={cancelMutation.isPending}
                            className="w-full py-3 rounded-xl border border-danger/20 text-danger
                                       hover:bg-danger/10 transition-all disabled:opacity-50 text-sm"
                          >
                            {cancelMutation.isPending ? '...' : 'Отменить выбор'}
                          </button>
                        </>
                      )}

                      {/* In collective: leave */}
                      {isInMyCollective(selected) && !isMyClaim(selected) && (
                        <>
                          <p className="text-info text-sm text-center mb-4">
                            Ты участвуешь в сборе ✓
                          </p>
                          <button
                            onClick={() => cancelMutation.mutate(selected.activeClaim!.id)}
                            className="w-full py-3 rounded-xl border border-danger/20 text-danger
                                       hover:bg-danger/10 transition-all text-sm"
                          >
                            Выйти из сбора
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}

                  {/* ── Success ── */}
                  {modalStep === 'success' && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-4"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.1, damping: 12 }}
                        className="w-16 h-16 rounded-full bg-success/20 border border-success/30
                                   flex items-center justify-center mx-auto mb-4"
                      >
                        <Check size={28} className="text-success" />
                      </motion.div>
                      <p className="text-brand-pearl font-semibold text-lg">Отлично!</p>
                      <p className="text-brand-pearl/60 text-sm mt-1">
                        Подарок выбран
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  )
}
