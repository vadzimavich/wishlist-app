'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Phone, MessageCircle, Users } from 'lucide-react'
import { GuestPublic } from '@/types'
import { useContactStore } from '@/lib/stores/contactStore'

interface Props {
  guests: GuestPublic[]
  currentGuestId: string
  currentGuestCount: number
  guestToken: string
}

export function InviteGuests({ guests, currentGuestId, currentGuestCount, guestToken }: Props) {
  const [contactPopupGuest, setContactPopupGuest] = useState<string | null>(null)
  const contactStore = useContactStore()

  const visibleGuests = useMemo(() => guests.filter(g => g.rsvpStatus !== 'NotAttending'), [guests])
  const attending = useMemo(() => guests.filter(g => g.rsvpStatus === 'Attending').length, [guests])
  const orbitingGuests = useMemo(() => visibleGuests.filter(g => g.id !== currentGuestId), [visibleGuests, currentGuestId])
  const centerGuest = useMemo(() => visibleGuests.find(g => g.id === currentGuestId), [visibleGuests, currentGuestId])

  // Fetch shared contacts on mount
  useEffect(() => {
    contactStore.fetchSharedContacts(guestToken)
  }, [guestToken])

  const getSharedContact = (guestId: string) => {
    return contactStore.sharedContacts.find(sc => sc.guestId === guestId)
  }

  const handleContactClick = useCallback((guestId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const contact = getSharedContact(guestId)
    if (!contact) return
    setContactPopupGuest(prev => prev === guestId ? null : guestId)
  }, [contactStore.sharedContacts])

  // ── Empty state ──────────────────────────────────────────────
  if (guests.length === 0 || visibleGuests.length === 0) {
    return (
      <section className="relative z-10 overflow-hidden py-16">
        <div className="text-center px-4">
          <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight gradient-text-sweep flex items-center justify-center gap-3">
            <Users size={28} className="text-brand-violet shrink-0" />
            Гости
          </h2>
          <p className="text-brand-pearl/30 text-sm mt-3">
            {guests.length === 0 ? 'Пока нет приглашённых' : 'Никто не подтвердил'}
          </p>
        </div>
      </section>
    )
  }

  // ── Normal render ────────────────────────────────────────────
  return (
    <section className="relative z-10 overflow-hidden py-12 sm:py-16">
      {/* Header */}
      <div className="text-center px-4 mb-6 sm:mb-8">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
          className="font-display font-bold text-3xl sm:text-4xl tracking-tight gradient-text-sweep flex items-center justify-center gap-3"
        >
          <Users size={28} className="text-brand-violet shrink-0" />
          Гости
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="text-brand-pearl/40 text-xs sm:text-sm mt-2"
        >
          {guests.length} приглашено · {attending} придут
        </motion.p>
      </div>

      {/* Guest grid — flex-wrap */}
      <div
        className="flex flex-wrap justify-center gap-3 sm:gap-4 py-6 overflow-visible max-w-lg mx-auto"
        onClick={() => setContactPopupGuest(null)}
      >
        {/* ── Current guest (larger, "(ты)" label) ── */}
        {centerGuest && (() => {
          const isAtt = centerGuest.rsvpStatus === 'Attending'
          const bc = isAtt ? 'rgba(74,222,128,0.55)' : 'rgba(155,89,245,0.5)'
          const gl = isAtt ? 'rgba(74,222,128,0.2)' : 'rgba(155,89,245,0.12)'
          const hasContact = centerGuest.isContactShared
          const isPopupOpen = contactPopupGuest === centerGuest.id

          return (
            <motion.div
              key={centerGuest.id}
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', damping: 14, stiffness: 220, delay: 0.15 }}
            >
              <div
                className="flex flex-col items-center gap-2 select-none"
                onClick={(e) => { if (hasContact) handleContactClick(centerGuest.id, e) }}
              >
                {/* Avatar */}
                <div
                  className="flex items-center justify-center rounded-full relative"
                  style={{
                    width: 70,
                    height: 70,
                    background: isAtt
                      ? 'linear-gradient(135deg,rgba(74,222,128,0.3),rgba(74,222,128,0.1))'
                      : 'linear-gradient(135deg,rgba(107,47,224,0.35),rgba(155,89,245,0.15))',
                    border: `2px solid ${bc}`,
                    boxShadow: `0 0 0 2px rgba(155,89,245,0.5), 0 0 24px ${gl}`,
                  }}
                >
                  <span className="text-xl sm:text-2xl leading-none select-none">{centerGuest.emoji || '🙂'}</span>
                  {/* Contact indicator */}
                  {hasContact && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-brand-violet/80 flex items-center justify-center shadow-lg">
                      <Phone size={10} className="text-white" />
                    </div>
                  )}
                </div>

                {/* Name + (ты) label */}
                <span className="text-sm sm:text-base font-semibold text-center leading-tight text-brand-pearl">
                  {centerGuest.name}
                  <span className="text-brand-violet ml-1 text-[10px] font-normal">
                    {currentGuestCount > 1 ? '(вы)' : '(ты)'}
                  </span>
                </span>

                {/* Contact popup */}
                {isPopupOpen && (() => {
                  const contact = getSharedContact(centerGuest.id)
                  if (!contact) return null
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="mt-1 px-2.5 py-1.5 rounded-lg bg-brand-deep/95 border border-brand-violet/20 shadow-xl backdrop-blur-sm min-w-[130px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {contact.telegram && (
                        <div className="flex items-center gap-1.5 text-[11px] text-brand-pearl/70">
                          <MessageCircle size={11} className="text-sky-400" />
                          {contact.telegram}
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1.5 text-[11px] text-brand-pearl/70 mt-0.5">
                          <Phone size={11} className="text-success" />
                          {contact.phone}
                        </div>
                      )}
                    </motion.div>
                  )
                })()}
              </div>
            </motion.div>
          )
        })()}

        {/* ── Orbiting guests ── */}
        {orbitingGuests.map((guest, i) => {
          const isAtt = guest.rsvpStatus === 'Attending'
          const bc = isAtt ? 'rgba(74,222,128,0.5)' : 'rgba(155,89,245,0.35)'
          const gl = isAtt ? 'rgba(74,222,128,0.15)' : 'rgba(155,89,245,0.08)'
          const hasContact = guest.isContactShared
          const isPopupOpen = contactPopupGuest === guest.id

          return (
            <motion.div
              key={guest.id}
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', damping: 14, stiffness: 220, delay: 0.15 + i * 0.04 }}
            >
              <div
                className="flex flex-col items-center gap-1.5 select-none"
                onClick={(e) => { if (hasContact) handleContactClick(guest.id, e) }}
              >
                {/* Avatar */}
                <div
                  className="flex items-center justify-center rounded-full relative"
                  style={{
                    width: 54,
                    height: 54,
                    background: isAtt
                      ? 'linear-gradient(135deg,rgba(74,222,128,0.25),rgba(74,222,128,0.08))'
                      : 'linear-gradient(135deg,rgba(107,47,224,0.3),rgba(155,89,245,0.12))',
                    border: `2px solid ${bc}`,
                    boxShadow: `0 0 12px ${gl}`,
                  }}
                >
                  <span className="text-base sm:text-lg leading-none select-none">{guest.emoji || '🙂'}</span>
                  {/* Contact indicator */}
                  {hasContact && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-violet/80 flex items-center justify-center shadow-lg">
                      <Phone size={9} className="text-white" />
                    </div>
                  )}
                </div>

                {/* Name */}
                <span className="text-[11px] sm:text-xs font-medium text-center leading-tight text-brand-pearl/60">
                  {guest.name}
                </span>

                {/* Contact popup */}
                {isPopupOpen && (() => {
                  const contact = getSharedContact(guest.id)
                  if (!contact) return null
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="mt-1 px-2 py-1.5 rounded-lg bg-brand-deep/95 border border-brand-violet/20 shadow-xl backdrop-blur-sm min-w-[120px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {contact.telegram && (
                        <div className="flex items-center gap-1.5 text-[10px] text-brand-pearl/70">
                          <MessageCircle size={10} className="text-sky-400" />
                          {contact.telegram}
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1.5 text-[10px] text-brand-pearl/70 mt-0.5">
                          <Phone size={10} className="text-success" />
                          {contact.phone}
                        </div>
                      )}
                    </motion.div>
                  )
                })()}
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
