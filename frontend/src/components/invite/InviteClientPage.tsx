'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { guestsApi } from '@/lib/api'
import { InvitePage, GuestPublic } from '@/types'
import { useWishlistStore } from '@/lib/store'
import { useWishlistRealtime } from '@/hooks/useWishlistRealtime'
import { InviteHero } from './InviteHero'
import { InviteDetails } from './InviteDetails'
import { InviteGuests } from './InviteGuests'
import { InviteWishlist } from './InviteWishlist'
import { InviteRsvpBar } from './InviteRsvpBar'

interface Props {
  initialData: InvitePage | null
  token: string
}

export function InviteClientPage({ initialData, token }: Props) {
  const { setItems } = useWishlistStore()
  const [guests, setGuests] = useState<GuestPublic[]>(initialData?.guests ?? [])
  const lenisRef = useRef<any>(null)

  // Fetch if no SSR data
  const { data: page, isLoading } = useQuery({
    queryKey: ['invite', token],
    queryFn: () => guestsApi.getInvitePage(token),
    initialData: initialData ?? undefined,
    staleTime: 15_000,
  })

  // Sync wishlist items into store for real-time updates
  useEffect(() => {
    if (page?.wishlistItems) {
      setItems(page.wishlistItems)
    }
  }, [page?.wishlistItems, setItems])

  // Real-time updates via SignalR
  useWishlistRealtime({
    eventId: page?.eventId,
    onGuestRsvpUpdated: (updatedGuest) => {
      setGuests(prev =>
        prev.map(g => g.id === updatedGuest.id ? updatedGuest : g)
      )
    },
  })

  // Lenis smooth scroll
  useEffect(() => {
    let lenis: any

    const initLenis = async () => {
      const { default: Lenis } = await import('@studio-freight/lenis')
      lenis = new Lenis({
        duration: 1.4,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
      })
      lenisRef.current = lenis

      const raf = (time: number) => {
        lenis.raf(time)
        requestAnimationFrame(raf)
      }
      requestAnimationFrame(raf)
    }

    initLenis()

    return () => {
      lenisRef.current?.destroy()
    }
  }, [])

  if (isLoading && !initialData) {
    return (
      <div className="min-h-screen bg-brand-midnight flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-2 border-brand-violet/30 border-t-brand-violet
                          animate-spin mx-auto mb-4" />
          <p className="text-brand-pearl/60 text-sm">Загружаем приглашение...</p>
        </div>
      </div>
    )
  }

  if (!page) return null

  return (
    <div className="min-h-screen bg-brand-midnight overflow-x-hidden">
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-midnight via-brand-deep to-brand-midnight" />
        <div className="orb orb-purple w-[600px] h-[600px] -top-40 -left-40 opacity-10" />
        <div className="orb orb-violet w-[500px] h-[500px] top-1/3 right-0 opacity-8" />
        <div className="orb orb-champagne w-[400px] h-[400px] bottom-20 left-1/4 opacity-6" />
      </div>

      {/* RSVP sticky bar (if not responded) */}
      {page.currentGuest.rsvpStatus === 'Pending' && (
        <InviteRsvpBar guest={page.currentGuest} eventId={page.eventId} />
      )}

      {/* Hero */}
      <InviteHero
        eventTitle={page.eventTitle}
        eventDate={page.eventDate}
        eventLocation={page.eventLocation}
        coverImageUrl={page.coverImageUrl}
        hostName={page.hostName}
        guestName={page.currentGuest.name}
        rsvpStatus={page.currentGuest.rsvpStatus}
      />

      {/* Details */}
      <InviteDetails
        date={page.eventDate}
        location={page.eventLocation}
        description={page.eventDescription}
      />

      {/* Guests */}
      <InviteGuests guests={guests} currentGuestId={page.currentGuest.id} />

      {/* Wishlist */}
      <InviteWishlist
        guestToken={token}
        eventId={page.eventId}
        currentGuestId={page.currentGuest.id}
      />

      {/* Footer */}
      <footer className="text-center py-12 px-4">
        <p className="text-brand-pearl/20 text-xs">
          Сделано с ❤️ в WishList
        </p>
      </footer>
    </div>
  )
}
