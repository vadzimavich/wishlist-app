'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSprings, useSpring, animated } from '@react-spring/web'
import { Phone, MessageCircle, Users, X } from 'lucide-react'
import { GuestPublic } from '@/types'
import { useContactStore } from '@/lib/stores/contactStore'
import { guestsApi } from '@/lib/api'

interface Props {
  guests: GuestPublic[]
  currentGuestId: string
  currentGuestCount: number
  guestToken: string
  onEmojiUpdate?: (guestId: string, emoji: string) => void
}

const MARGIN = 50
const GRID_SPACING_X = 160  // horizontal cell spacing (stretched)
const GRID_SPACING_Y = 100   // vertical cell spacing

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.15 } },
}
const nodeVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: 'spring', damping: 14, stiffness: 220 } },
}

const EMOJI_PRESETS = [
  '🎉', '🎂', '🎁', '🥳', '🥰', '😊', '🤗', '🦸‍♂️',
  '🎸', '🏄‍♂️', '🎨', '🧩', '🌟', '🔥', '💪', '🧙‍♂️',
  '🦊', '🐼', '🦄', '🌈', '🍀', '🏆', '🎪', '🚀',
]

export function InviteGuests({ guests, currentGuestId, currentGuestCount, guestToken, onEmojiUpdate }: Props) {
  const graphRef = useRef<HTMLDivElement>(null)
  const [springParams, setSpringParams] = useState({ tension: 170, friction: 26, mass: 1, minDistance: 110 })
  const [initialized, setInitialized] = useState(false)
  const draggedGuestIdRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)
  const hasMovedRef = useRef(false)
  const homePositionsRef = useRef<{ x: number; y: number }[]>([])
  const [contactPopupGuest, setContactPopupGuest] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const contactStore = useContactStore()
  const [isMobile, setIsMobile] = useState(false)
  const isMobileRef = useRef(false)

  const visibleGuests = useMemo(() => guests.filter(g => g.rsvpStatus !== 'NotAttending'), [guests])
  const totalInvited = useMemo(() => guests.reduce((sum, g) => sum + Math.max(1, g.guestCount), 0), [guests])
  const totalAttending = useMemo(
    () => guests.filter(g => g.rsvpStatus === 'Attending').reduce((sum, g) => sum + Math.max(1, g.guestCount), 0),
    [guests]
  )
  const orbitingGuests = useMemo(() => visibleGuests.filter(g => g.id !== currentGuestId), [visibleGuests, currentGuestId])
  const centerGuest = useMemo(() => visibleGuests.find(g => g.id === currentGuestId), [visibleGuests, currentGuestId])
  const orbitIds = useMemo(() => orbitingGuests.map(g => g.id), [orbitingGuests])
  const allIds = useMemo(() => (centerGuest ? [centerGuest.id, ...orbitIds] : orbitIds), [centerGuest, orbitIds])

  const [springs, api] = useSprings(
    orbitingGuests.length,
    i => ({ x: 0, y: 0, config: { tension: springParams.tension, friction: springParams.friction, mass: springParams.mass } })
  )

  const [centerSpring, centerApi] = useSpring(() => ({
    x: 0,
    y: 0,
    config: { tension: 80, friction: 28, mass: 2 },
  }))

  function computeGridLayout(count: number, cx: number, cy: number): { x: number; y: number }[] {
    if (count <= 0) return []

    // Build a grid large enough to hold all orbiting guests
    // Exclude the center cell (0,0) so orbiting guests don't overlap with the center guest

    const halfSize = Math.ceil(Math.sqrt(count + 1)) + 2
    const cells: { col: number; row: number; distSq: number }[] = []

    for (let row = -halfSize; row <= halfSize; row++) {
      for (let col = -halfSize; col <= halfSize; col++) {
        // Skip the center cell — it's reserved for the current guest
        if (col === 0 && row === 0) continue
        const distSq = col * col + row * row
        cells.push({ col, row, distSq })
      }
    }

    // Sort by distance from center (fill closest first!)
    cells.sort((a, b) => a.distSq - b.distSq)

    // Take only what we need
    const selected = cells.slice(0, count)

    // Convert to screen coordinates with rhombus row offset
    return selected.map(({ col, row }) => {
      const halfOffset = (row % 2) * (GRID_SPACING_X / 2) // odd rows shifted right
      return {
        x: cx + col * GRID_SPACING_X + halfOffset,
        y: cy + row * GRID_SPACING_Y,
      }
    })
  }

  useEffect(() => {
    const el = graphRef.current
    if (!el || allIds.length === 0) return

    const measure = () => {
      if (isMobileRef.current) return
      const w = el.offsetWidth || 800
      const h = 420
      const cx = w / 2, cy = h / 2

      if (orbitingGuests.length > 0) {
        const positions = computeGridLayout(orbitingGuests.length, cx, cy)
        homePositionsRef.current = positions
        api.start(i => ({
          x: positions[i].x,
          y: positions[i].y,
          immediate: true,
        }))
      }

      if (centerGuest) {
        centerApi.start({ x: cx, y: cy, immediate: true })
      }

      setInitialized(true)
    }

    measure()

    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  }, [allIds, orbitingGuests.length, centerGuest?.id])

  // Fetch shared contacts on mount
  useEffect(() => {
    contactStore.fetchSharedContacts(guestToken)
  }, [guestToken])

  // Detect mobile viewport
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      const matches = e.matches
      isMobileRef.current = matches
      setIsMobile(matches)
    }
    handler(mq)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Update spring config when debug sliders change
  useEffect(() => {
    api.start(i => ({
      config: {
        tension: springParams.tension,
        friction: springParams.friction,
        mass: springParams.mass,
      },
    }))
  }, [springParams.tension, springParams.friction, springParams.mass, api])

  const handlePointerDown = useCallback((guestId: string, e: React.PointerEvent) => {
    e.preventDefault()
    const idx = orbitingGuests.findIndex(g => g.id === guestId)
    if (idx === -1) return
    draggedGuestIdRef.current = idx
    isDraggingRef.current = false
    hasMovedRef.current = false
    const el = graphRef.current
    if (el) {
      el.setPointerCapture(e.pointerId)
    }
  }, [orbitingGuests])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current || draggedGuestIdRef.current === null) return
    hasMovedRef.current = true

    const draggedIdx = draggedGuestIdRef.current
    const container = graphRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()

    const rawX = e.clientX - rect.left
    const rawY = e.clientY - rect.top
    const clampedX = Math.max(MARGIN, Math.min(rect.width - MARGIN, rawX))
    const clampedY = Math.max(MARGIN, Math.min(rect.height - MARGIN, rawY))

    api.start(i => {
      const home = homePositionsRef.current[i]
      if (!home) return {}

      if (i === draggedIdx) {
        // Blend: 70% toward pointer, 30% toward home (rubber band feel)
        const targetX = clampedX * 0.7 + home.x * 0.3
        const targetY = clampedY * 0.7 + home.y * 0.3
        return {
          x: Math.max(MARGIN, Math.min(rect.width - MARGIN, targetX)),
          y: Math.max(MARGIN, Math.min(rect.height - MARGIN, targetY)),
          immediate: true,
        }
      }

      const ox = springs[i].x.get()
      const oy = springs[i].y.get()
      const dx = clampedX - ox
      const dy = clampedY - oy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const threshold = springParams.minDistance

      // Start with home position (return-to-orbit pull)
      let targetX = home.x
      let targetY = home.y

      if (dist < threshold && dist > 0.1) {
        // Collision push — push away from dragged guest
        const pushStr = (threshold - dist) / threshold * 0.5
        targetX = home.x - (dx / dist) * pushStr * threshold
        targetY = home.y - (dy / dist) * pushStr * threshold
      }

      return {
        x: Math.max(MARGIN, Math.min(rect.width - MARGIN, targetX)),
        y: Math.max(MARGIN, Math.min(rect.height - MARGIN, targetY)),
        config: { tension: 150, friction: 18, mass: 1.2 },
        immediate: false,
      }
    })
  }, [api, springs, springParams])

  const getSharedContact = (guestId: string) => {
    return contactStore.sharedContacts.find(sc => sc.guestId === guestId)
  }

  const handleContactClick = useCallback((guestId: string) => {
    if (hasMovedRef.current) return // was a drag, not a click
    const contact = getSharedContact(guestId)
    if (!contact) return
    setContactPopupGuest(prev => prev === guestId ? null : guestId)
  }, [contactStore.sharedContacts])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    const draggedIdx = draggedGuestIdRef.current
    draggedGuestIdRef.current = null
    const el = graphRef.current
    if (el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId)
    }

    // Spring ALL guests back to their home orbit positions
    api.start(i => {
      const home = homePositionsRef.current[i]
      if (!home) return {}
      return {
        x: home.x,
        y: home.y,
        config: { tension: 100, friction: 22, mass: 1.2 },
        immediate: false,
      }
    })
  }, [api])

  function renderMobileModals() {
    if (!isMobile) return null

    const contact = contactPopupGuest ? getSharedContact(contactPopupGuest) : null

    return (
      <>
        <AnimatePresence>
          {showEmojiPicker && centerGuest?.id === currentGuestId && (
            <motion.div
              key="emoji-picker-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40"
              onClick={() => setShowEmojiPicker(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-brand-deep/95 border border-brand-violet/20 rounded-xl p-3 shadow-2xl backdrop-blur-sm"
                onClick={e => e.stopPropagation()}
              >
                <div className="grid grid-cols-6 gap-1.5 max-w-[230px]">
                  {EMOJI_PRESETS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={async (e) => {
                        e.stopPropagation()
                        try {
                          await guestsApi.updateEmoji(guestToken, emoji)
                          onEmojiUpdate?.(centerGuest!.id, emoji)
                          setShowEmojiPicker(false)
                        } catch {
                          // Silently fail
                        }
                      }}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg text-xl
                        hover:bg-brand-violet/20 transition-colors
                        ${centerGuest?.emoji === emoji ? 'ring-2 ring-brand-violet' : ''}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {contact && (
            <motion.div
              key="contact-popup-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40"
              onClick={() => setContactPopupGuest(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-brand-deep/95 border border-brand-violet/20 rounded-xl p-4 shadow-2xl backdrop-blur-sm min-w-[180px]"
                onClick={e => e.stopPropagation()}
              >
                <p className="text-sm font-medium text-brand-pearl mb-2">{contact.name}</p>
                {contact.telegram && (
                  <div className="flex items-center gap-2 text-sm text-brand-pearl/70 mb-1">
                    <MessageCircle size={14} className="text-sky-400 shrink-0" />
                    {contact.telegram}
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm text-brand-pearl/70">
                    <Phone size={14} className="text-success shrink-0" />
                    {contact.phone}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )
  }

  if (guests.length === 0 || visibleGuests.length === 0) {
    return (
      <section className="relative z-10 overflow-hidden py-12">
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

  // === MOBILE VIEW ===
  if (isMobile) {
    const sortedGuests = [centerGuest, ...orbitingGuests].filter(Boolean) as GuestPublic[]

    return (
      <section className="relative z-10 overflow-hidden py-12 sm:py-16">
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
            {totalInvited} приглашено · {totalAttending} придут
          </motion.p>
        </div>

        <div className="px-4 mx-auto max-w-md space-y-3">
          {sortedGuests.map(guest => {
            const isCurrent = guest.id === currentGuestId
            const isAtt = guest.rsvpStatus === 'Attending'
            const hasContact = guest.isContactShared
            const circleSize = isCurrent ? 56 : 48
            const bgGrad = isAtt
              ? 'linear-gradient(135deg,rgba(74,222,128,0.25),rgba(74,222,128,0.08))'
              : 'linear-gradient(135deg,rgba(107,47,224,0.3),rgba(155,89,245,0.12))'
            const borderColor = isAtt ? 'rgba(74,222,128,0.5)' : 'rgba(155,89,245,0.35)'
            const glowColor = isAtt ? 'rgba(74,222,128,0.15)' : 'rgba(155,89,245,0.08)'

            return (
              <div
                key={guest.id}
                className="flex items-center gap-3 bg-brand-deep/50 rounded-xl p-3 border border-brand-violet/10
                           transition-colors hover:border-brand-violet/25"
                style={isAtt ? { borderColor: 'rgba(74,222,128,0.25)' } : undefined}
                onClick={() => { if (hasContact) handleContactClick(guest.id) }}
              >
                {/* Emoji circle */}
                <div
                  className="flex items-center justify-center rounded-full shrink-0 relative"
                  style={{
                    width: circleSize,
                    height: circleSize,
                    background: bgGrad,
                    border: `2px solid ${borderColor}`,
                    boxShadow: `0 0 12px ${glowColor}`,
                  }}
                  onClick={(e) => {
                    if (isCurrent) {
                      e.stopPropagation()
                      setShowEmojiPicker(prev => !prev)
                    }
                  }}
                >
                  <span className="text-lg leading-none select-none">{guest.emoji || '🙂'}</span>
                  {/* Contact icon */}
                  {hasContact && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-brand-violet/80
                                    flex items-center justify-center shadow-lg">
                      <Phone size={8} className="text-white" />
                    </div>
                  )}
                </div>

                {/* Name + RSVP */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium truncate ${isCurrent ? 'text-brand-pearl text-sm' : 'text-brand-pearl/70 text-sm'}`}>
                      {guest.name}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-normal text-brand-violet shrink-0">
                        ({currentGuestCount > 1 ? 'вы' : 'ты'})
                      </span>
                    )}
                  </div>
                  <span className={`text-xs ${isAtt ? 'text-success/70' : 'text-brand-pearl/30'}`}>
                    {isAtt ? 'Придёт' : 'Ожидается'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {renderMobileModals()}
      </section>
    )
  }

  return (
    <section className="relative z-10 overflow-hidden py-12">
      <div className="text-center px-4 mb-6 sm:mb-8">
        <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
          className="font-display font-bold text-3xl sm:text-4xl tracking-tight gradient-text-sweep flex items-center justify-center gap-3">
          <Users size={28} className="text-brand-violet shrink-0" />
          Гости
        </motion.h2>
        <motion.p initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.08 }}
          className="text-brand-pearl/40 text-xs sm:text-sm mt-2">
          {totalInvited} приглашено · {totalAttending} придут
        </motion.p>
      </div>

      <div ref={graphRef} className="relative mx-auto w-full"
        style={{ maxWidth: '660px', height: 420 }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={(e) => { if (e.target === graphRef.current) { setContactPopupGuest(null); setShowEmojiPicker(false) } }}>
        {initialized && (
          <motion.div variants={containerVariants} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-40px' }} className="relative w-full h-full">
            {orbitingGuests.map((guest, i) => {
              const spring = springs[i]
              const isAtt = guest.rsvpStatus === 'Attending'
              const bc = isAtt ? 'rgba(74,222,128,0.5)' : 'rgba(155,89,245,0.35)'
              const gl = isAtt ? 'rgba(74,222,128,0.15)' : 'rgba(155,89,245,0.08)'
              const hasContact = guest.isContactShared
              const isPopupOpen = contactPopupGuest === guest.id

              return (
                <motion.div key={guest.id} variants={nodeVariants}>
                  <animated.div
                    style={{
                      position: 'absolute',
                      left: spring.x.to(x => `${x}px`),
                      top: spring.y.to(y => `${y}px`),
                      transform: 'translate(-50%, -50%)',
                      touchAction: 'none',
                      cursor: hasContact ? 'pointer' : 'grab',
                    }}
                    onPointerDown={(e: React.PointerEvent) => handlePointerDown(guest.id, e)}
                    onClick={() => hasContact && handleContactClick(guest.id)}>
                    <div className="flex flex-col items-center gap-1.5 pointer-events-none select-none">
                      <div className="flex items-center justify-center rounded-full relative"
                        style={{
                          width: 54, height: 54,
                          background: isAtt ? 'linear-gradient(135deg,rgba(74,222,128,0.25),rgba(74,222,128,0.08))' : 'linear-gradient(135deg,rgba(107,47,224,0.3),rgba(155,89,245,0.12))',
                          border: `2px solid ${bc}`, boxShadow: `0 0 12px ${gl}`,
                        }}>
                        <span className="text-lg sm:text-xl leading-none select-none">{guest.emoji || '🙂'}</span>
                        {/* Contact indicator icon */}
                        {hasContact && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-violet/80
                                          flex items-center justify-center shadow-lg">
                            <Phone size={9} className="text-white" />
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] sm:text-xs font-medium text-center leading-tight text-brand-pearl/60">
                        {guest.name}
                      </span>
                      {/* Contact info popup inline */}
                      {isPopupOpen && (() => {
                        const contact = getSharedContact(guest.id)
                        if (!contact) return null
                        return (
                          <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="mt-1 px-2 py-1.5 rounded-lg bg-brand-deep/95 border border-brand-violet/20
                                       shadow-xl backdrop-blur-sm min-w-[120px]"
                            onClick={e => e.stopPropagation()}
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
                  </animated.div>
                </motion.div>
              )
            })}

            {centerGuest && (() => {
              const isAtt = centerGuest.rsvpStatus === 'Attending'
              const bc = isAtt ? 'rgba(74,222,128,0.55)' : 'rgba(155,89,245,0.5)'
              const gl = isAtt ? 'rgba(74,222,128,0.2)' : 'rgba(155,89,245,0.12)'
              const hasContact = centerGuest.isContactShared
              const isPopupOpen = contactPopupGuest === centerGuest.id
              return (
                <motion.div key={centerGuest.id} variants={nodeVariants}>
                  <animated.div style={{
                    position: 'absolute',
                    left: centerSpring.x.to(x => `${x}px`),
                    top: centerSpring.y.to(y => `${y}px`),
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                  }}
                    onClick={() => {
                      if (centerGuest.id === currentGuestId) {
                        setShowEmojiPicker(prev => !prev)
                      } else if (hasContact) {
                        handleContactClick(centerGuest.id)
                      }
                    }}>
                    <div className="flex flex-col items-center gap-2 select-none">
                      <div className="flex items-center justify-center rounded-full relative"
                        style={{
                          width: 70, height: 70,
                          background: isAtt ? 'linear-gradient(135deg,rgba(74,222,128,0.3),rgba(74,222,128,0.1))' : 'linear-gradient(135deg,rgba(107,47,224,0.35),rgba(155,89,245,0.15))',
                          border: `2px solid ${bc}`, boxShadow: `0 0 0 2px rgba(155,89,245,0.5), 0 0 24px ${gl}`,
                        }}>
                        <span className="text-2xl sm:text-3xl leading-none select-none">{centerGuest.emoji || '🙂'}</span>
                        {/* Contact indicator icon */}
                        {hasContact && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-brand-violet/80
                                          flex items-center justify-center shadow-lg">
                            <Phone size={10} className="text-white" />
                          </div>
                        )}
                      </div>
                      <span className="text-sm sm:text-base font-semibold text-center leading-tight text-brand-pearl">
                        {centerGuest.name}<span className="text-brand-violet ml-1 text-[10px] font-normal">{currentGuestCount > 1 ? '(вы)' : '(ты)'}</span>
                      </span>
                      {/* Contact info popup inline */}
                      {isPopupOpen && (() => {
                        const contact = getSharedContact(centerGuest.id)
                        if (!contact) return null
                        return (
                          <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="mt-1 px-2.5 py-1.5 rounded-lg bg-brand-deep/95 border border-brand-violet/20
                                       shadow-xl backdrop-blur-sm min-w-[130px]"
                            onClick={e => e.stopPropagation()}
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
                      {/* Emoji picker popover */}
                      {showEmojiPicker && centerGuest.id === currentGuestId && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2
                                     bg-brand-deep/95 border border-brand-violet/20 rounded-xl
                                     p-2 shadow-2xl backdrop-blur-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="grid grid-cols-6 gap-1.5 max-w-[260px]">
                            {EMOJI_PRESETS.map(emoji => (
                              <button
                                key={emoji}
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  try {
                                    await guestsApi.updateEmoji(guestToken, emoji)
                                    onEmojiUpdate?.(centerGuest.id, emoji)
                                    setShowEmojiPicker(false)
                                  } catch {
                                    // Silently fail — revert will happen on next fetch
                                  }
                                }}
                                className={`w-9 h-9 flex items-center justify-center rounded-lg text-xl
                                  hover:bg-brand-violet/20 transition-colors
                                  ${centerGuest.emoji === emoji ? 'ring-2 ring-brand-violet' : ''}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </animated.div>
                </motion.div>
              )
            })()}
          </motion.div>
        )}
      </div>

      {renderMobileModals()}
    </section>
  )
}
