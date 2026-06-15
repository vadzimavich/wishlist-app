'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
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

  const visibleGuests = useMemo(() => guests.filter(g => g.rsvpStatus !== 'NotAttending'), [guests])
  const attending = useMemo(() => guests.filter(g => g.rsvpStatus === 'Attending').length, [guests])
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
    if (count <= 1) return Array.from({ length: count }, () => ({ x: cx, y: cy }))

    // Build a grid large enough to hold all orbiting guests
    // Fill cells closest to center first in diamond pattern
    // Center guest floats independently on top — no cell is reserved

    const halfSize = Math.ceil(Math.sqrt(count)) + 2
    const cells: { col: number; row: number; distSq: number }[] = []

    for (let row = -halfSize; row <= halfSize; row++) {
      for (let col = -halfSize; col <= halfSize; col++) {
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

  return (
    <section className="relative z-10 overflow-hidden py-12 sm:py-16">
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
          {guests.length} приглашено · {attending} придут
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
                          <div className="grid grid-cols-6 gap-1 max-w-[220px]">
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
                                className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg
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

    </section>
  )
}
