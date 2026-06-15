'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { giftsApi } from '@/lib/api'
import { WishlistItem, ClaimType } from '@/types'
import { STATUS_ORDER } from '@/lib/wishlistStatus'
import { WishlistCard } from './WishlistCard'
import { WishlistClaimModal } from './WishlistClaimModal'

interface Props {
  guestToken: string
  eventId: string
  currentGuestId: string
  items: WishlistItem[]
}

export function InviteWishlist({ guestToken, eventId, currentGuestId, items }: Props) {
  // ─── Sorting ──────────────────────────────────────────────────────────────
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const orderA = STATUS_ORDER[a.status] ?? 99
      const orderB = STATUS_ORDER[b.status] ?? 99
      if (orderA !== orderB) return orderA - orderB
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [items])

  // ─── Refs & State ─────────────────────────────────────────────────────────
  const sectionRef = useRef<HTMLDivElement>(null)
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null)

  // ─── GSAP scroll animation ────────────────────────────────────────────────
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
            scrollTrigger: { trigger: sectionRef.current, start: 'top 75%' },
          }
        )
      }
    }
    initGsap()
  }, [items.length])

  // ─── Mutations ────────────────────────────────────────────────────────────
  const qc = useQueryClient()

  const claimMutation = useMutation({
    mutationFn: ({ itemId, type }: { itemId: string; type: ClaimType }) =>
      giftsApi.claimGift(guestToken, itemId, type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invite', guestToken] })
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg ?? 'Не удалось выбрать подарок')
      setSelectedItem(null)
    },
  })

  const joinMutation = useMutation({
    mutationFn: (claimId: string) => giftsApi.joinCollective(claimId, guestToken),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invite', guestToken] })
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg ?? 'Ошибка')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (claimId: string) => giftsApi.cancelClaim(claimId, guestToken),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invite', guestToken] })
      toast.success('Выбор отменён')
      setSelectedItem(null)
    },
  })

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const openItem = (item: WishlistItem) => {
    if (item.status === 'Purchased') return
    setSelectedItem(item)
  }

  // ─── Re-fetch for real-time correctness ──────────────────────────────────
  const selected = selectedItem
    ? items.find(i => i.id === selectedItem.id) ?? selectedItem
    : null

  // ─── Empty state ──────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <section className="relative z-10 px-4 py-20 max-w-2xl mx-auto text-center">
        <Sparkles size={32} className="text-brand-pearl/20 mx-auto mb-3" />
        <p className="text-brand-pearl/40 text-sm">Подарков пока нет</p>
      </section>
    )
  }

  return (
    <section ref={sectionRef} className="relative z-10 px-4 py-20 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight gradient-text-sweep flex items-center justify-center gap-3">
          <Sparkles size={28} className="text-brand-violet shrink-0" />
          Вишлист
        </h2>
        <p className="text-brand-pearl/40 text-sm mt-2">
          Нажми на товар, чтобы выбрать или открыть групповой сбор
        </p>
      </div>

      {/* Responsive: horizontal scroll on mobile, grid on sm+ */}
      <div
        className="flex gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory sm:overflow-visible sm:snap-none pb-4 sm:pb-0 -mx-4 sm:mx-0 px-4 sm:px-0"
        data-lenis-prevent
        style={{ touchAction: 'manipulation' }}
        role="region"
        aria-label="Список подарков"
      >
        {sortedItems.map(item => (
          <WishlistCard
            key={item.id}
            item={item}
            currentGuestId={currentGuestId}
            onOpen={openItem}
            className="shrink-0 w-[75vw] sm:w-auto snap-center"
          />
        ))}
      </div>

      {/* Modal */}
      {selected && (
        <WishlistClaimModal
          item={selected}
          currentGuestId={currentGuestId}
          onClose={() => setSelectedItem(null)}
          onClaim={(itemId, type) => claimMutation.mutate({ itemId, type })}
          onJoinCollective={(claimId) => joinMutation.mutate(claimId)}
          onCancel={(claimId) => cancelMutation.mutate(claimId)}
          isClaimPending={claimMutation.isPending}
          isJoinPending={joinMutation.isPending}
          isCancelPending={cancelMutation.isPending}
        />
      )}
    </section>
  )
}
