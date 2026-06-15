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
// Triangular / hex-grid spacing — equilateral triangles
// Vertical: spacingY = spacingX * sqrt(3)/2  (≈ 0.866)
const GRID_SPACING_X = 160
const GRID_SPACING_Y = Math.round(GRID_SPACING_X * Math.sqrt(3) / 2) // 139

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

function buildCenteredRows(count: number, maxPerRow = 4): number[] {
  if (count <= 0) return []
  if (count <= maxPerRow) return [count]

  // Try symmetric 3-row [a, b, a] with middle peak
  for (let b = Math.min(maxPerRow, count - 2); b >= 3; b--) {
    const remaining = count - b
    if (remaining % 2 === 0) {
      const a = remaining / 2
      if (a >= 1 && a <= maxPerRow) {
        return [a, b, a]
      }
    }
  }

  // 2 rows: [ceil(n/2), floor(n/2)]
  if (count <= maxPerRow * 2) {
    return [Math.ceil(count / 2), Math.floor(count / 2)]
  }

  // 4+ rows: build centered pyramid from middle outward
  const numRows = Math.ceil(count / maxPerRow)
  const middleIdx = Math.floor(numRows / 2)
  const pattern: number[] = new Array(numRows).fill(0)
  pattern[middleIdx] = maxPerRow
  let remaining = count - maxPerRow
  let left = middleIdx - 1
  let right = middleIdx + 1

  while (remaining > 0) {
    if (right < numRows) {
      const add = Math.min(maxPerRow, remaining)
      pattern[right] = add
      remaining -= add
      right++
    }
    if (remaining > 0 && left >= 0) {
      const add = Math.min(maxPerRow, remaining)
      pattern[left] = add
      remaining -= add
      left--
    }
  }

  return pattern
}

function idBasedJitter(id: string, amplitude = 5): { dx: number; dy: number } {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash |= 0
  }
  const angle = (hash % 360) * (Math.PI / 180)
  const dist = (Math.abs(hash >> 8) % 100) / 100 * amplitude
  return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist }
}

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

  const centerGuest = useMemo((): GuestPublic | undefined => {
    return visibleGuests.find(g => g.id === currentGuestId)
  }, [visibleGuests, currentGuestId])

  const orbitingGuests = useMemo(() => {
    return visibleGuests.filter(g => g.id !== currentGuestId)
  }, [visibleGuests, currentGuestId])

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

  function computeGridLayout(
    count: number,
    cx: number,
    cy: number,
    spacingX: number = GRID_SPACING_X,
    spacingY: number = GRID_SPACING_Y
  ): { x: number; y: number }[] {
    if (count <= 0) return []

    // Generate hex-ring cells up to a bounding radius, then sort by
    // visual distance (primary) and angle (secondary). This guarantees
    // a symmetric figure for ANY count — complete rings → hexagons,
    // partial rings → evenly-spread around the center.
    const maxRing = Math.ceil((-3 + Math.sqrt(9 + 12 * count)) / 6) + 1
    const allCells: { x: number; y: number; distSq: number; angle: number }[] = []

    // Hex axial → pixel
    const toX = (q: number, r: number) => spacingX * (q + r / 2)
    const toY = (q: number, r: number) => spacingY * r

    // Clockwise direction vectors for hex ring walk
    const dirs: [number, number][] = [[0, -1], [-1, 0], [-1, 1], [0, 1], [1, 0], [1, -1]]

    for (let ring = 1; ring <= maxRing; ring++) {
      let q = ring, r = 0
      for (let side = 0; side < 6; side++) {
        const [dq, dr] = dirs[side]
        for (let step = 0; step < ring; step++) {
          const x = toX(q, r)
          const y = toY(q, r)
          allCells.push({ x, y, distSq: x * x + y * y, angle: Math.atan2(y, x) })
          q += dq
          r += dr
        }
      }
    }

    // Sort by visual distance, then by angle for equal-distance cells
    allCells.sort((a, b) => a.distSq - b.distSq || a.angle - b.angle)

    const selected = allCells.slice(0, count)

    // Small pseudo-random jitter (±5px) so nodes aren't perfectly aligned
    const JITTER = 5
    return selected.map((p, i) => ({
      x: cx + p.x + Math.sin(i * 137.5 + 42) * JITTER,
      y: cy + p.y + Math.cos(i * 97.3 + 13) * JITTER,
    }))
  }

  function computeAdaptiveSpacing(
    count: number,
    containerW: number,
    containerH: number,
    padding: number
  ): { spacingX: number; spacingY: number } {
    // Compute how many hex rings are needed to hold `count` orbiting cells
    // Hex rings complete: ring 1 = 6, ring 2 = 18, ring 3 = 36, ... ring N = 3*N*(N+1)
    const rings = Math.ceil((-3 + Math.sqrt(9 + 12 * count)) / 6)

    // The furthest cell from center is at axial distance = `rings`
    // x-extent: spacingX * rings  (at position (rings, 0))
    // y-extent: spacingY * rings  (at position (0, rings))
    const availW = containerW - padding * 2
    const availH = containerH - padding * 2

    // Clamp spacing so the grid fits in both dimensions
    const maxSpacingX = rings > 0 ? Math.min(availW / (2 * rings), availH / (2 * rings * (Math.sqrt(3) / 2))) : GRID_SPACING_X
    const spacingX = Math.max(100, Math.min(GRID_SPACING_X, maxSpacingX))

    // Y spacing follows equilateral ratio
    const spacingY = Math.max(85, Math.min(GRID_SPACING_Y, spacingX * Math.sqrt(3) / 2))

    return { spacingX, spacingY }
  }

  useEffect(() => {
    const el = graphRef.current
    if (!el || allIds.length === 0) return

    const measure = () => {
      if (isMobileRef.current) return
      const w = el.offsetWidth || 800
      const h = 420
      const cx = w / 2, cy = h / 2
      const padding = 40

      if (orbitingGuests.length > 0) {
        // Adaptive spacing so the grid fills the container without overflowing
        const { spacingX, spacingY } = computeAdaptiveSpacing(
          orbitingGuests.length, w, h, padding
        )
        const positions = computeGridLayout(orbitingGuests.length, cx, cy, spacingX, spacingY)

        // Verify positions fit and scale down if needed (double-check)
        let maxRx = 0, maxRy = 0
        for (const p of positions) {
          maxRx = Math.max(maxRx, Math.abs(p.x - cx))
          maxRy = Math.max(maxRy, Math.abs(p.y - cy))
        }
        const maxAllowedX = cx - padding
        const maxAllowedY = (h / 2) - padding
        const scaleX = maxRx > 0 ? Math.min(1, maxAllowedX / maxRx) : 1
        const scaleY = maxRy > 0 ? Math.min(1, maxAllowedY / maxRy) : 1
        const scale = Math.min(scaleX, scaleY)

        if (scale < 1) {
          // Recompute with scaled spacing
          const scaled = computeGridLayout(
            orbitingGuests.length, cx, cy,
            spacingX * scale, spacingY * scale
          )
          homePositionsRef.current = scaled
          api.start(i => ({
            x: scaled[i].x, y: scaled[i].y, immediate: true,
          }))
        } else {
          homePositionsRef.current = positions
          api.start(i => ({
            x: positions[i].x, y: positions[i].y, immediate: true,
          }))
        }
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
  }, [allIds, orbitingGuests.length, centerGuest?.id, isMobile])

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

  function renderModals() {
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

  // ── Mobile: простая сетка 4 колонки ─────────────────────────────────
  //   Центральный гость сверху, остальные — в grid-cols-4
  //
  const MOBILE_NODE_SIZE = 50
  const MOBILE_CENTER_SIZE = 60

  function renderMobileNode(guest: GuestPublic, isCurrent: boolean, nodeSize: number) {
    const isAtt = guest.rsvpStatus === 'Attending'
    const hasContact = guest.isContactShared
    const bgGrad = isAtt
      ? 'linear-gradient(135deg,rgba(74,222,128,0.25),rgba(74,222,128,0.08))'
      : 'linear-gradient(135deg,rgba(107,47,224,0.3),rgba(155,89,245,0.12))'
    const borderColor = isAtt ? 'rgba(74,222,128,0.5)' : 'rgba(155,89,245,0.35)'
    const glowColor = isAtt ? 'rgba(74,222,128,0.15)' : 'rgba(155,89,245,0.08)'

    return (
      <div className="flex flex-col items-center gap-1">
        <div
          className="flex items-center justify-center rounded-full relative cursor-pointer transition-transform active:scale-95"
          style={{
            width: nodeSize,
            height: nodeSize,
            background: bgGrad,
            border: `2px solid ${borderColor}`,
            boxShadow: `0 0 12px ${glowColor}${isCurrent ? `, 0 0 28px ${glowColor}` : ''}`,
          }}
          onClick={(e) => {
            if (isCurrent) {
              e.stopPropagation()
              setShowEmojiPicker(prev => !prev)
            } else if (hasContact) {
              handleContactClick(guest.id)
            }
          }}
        >
          <span className={`leading-none select-none ${isCurrent ? 'text-2xl' : 'text-xl'}`}>
            {guest.emoji || '🙂'}
          </span>
          {hasContact && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-brand-violet/80
                            flex items-center justify-center shadow-lg ring-1 ring-brand-deep">
              <Phone size={8} className="text-white" />
            </div>
          )}
        </div>
        <div className="text-center">
          <span className={`block font-medium leading-tight ${isCurrent ? 'text-sm text-brand-pearl' : 'text-xs text-brand-pearl/60'}`}>
            {guest.name}
          </span>
          {isCurrent && (
            <span className="text-[10px] text-brand-violet font-normal">
              {currentGuestCount > 1 ? '(вы)' : '(ты)'}
            </span>
          )}
          {!isCurrent && (
            <span className={`block text-[10px] mt-0.5 ${isAtt ? 'text-success/60' : 'text-brand-pearl/20'}`}>
              {isAtt ? 'Придёт' : 'Ожидается'}
            </span>
          )}
        </div>
      </div>
    )
  }


  if (isMobile) {
    const orbiting = centerGuest ? orbitingGuests : visibleGuests
    const center = centerGuest

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

        <div className="px-4 mx-auto max-w-sm">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="flex flex-col items-center gap-3"
          >
            {/* ── Center node ── */}
            {center && (
              <motion.div key={`c-${center.id}`} variants={nodeVariants}>
                {renderMobileNode(center, center.id === currentGuestId, MOBILE_CENTER_SIZE)}
              </motion.div>
            )}

            {/* ── Orbiting nodes in centered rows ── */}
            {orbiting.length > 0 && (() => {
              const rows = buildCenteredRows(orbiting.length)
              const rowWraps: React.ReactNode[] = []
              let offset = 0
              for (let ri = 0; ri < rows.length; ri++) {
                const rowGuests = orbiting.slice(offset, offset + rows[ri])
                offset += rows[ri]
                rowWraps.push(
                  <div key={ri} className="flex gap-3 justify-center flex-wrap">
                    {rowGuests.map(guest => (
                      <motion.div key={guest.id} variants={nodeVariants}>
                        {renderMobileNode(guest, false, MOBILE_NODE_SIZE)}
                      </motion.div>
                    ))}
                  </div>
                )
              }
              return <div className="flex flex-col items-center gap-3 w-full">{rowWraps}</div>
            })()}
          </motion.div>
        </div>

        {renderModals()}
      </section>
    )
  }

  // ── Desktop: no center guest → row-based centered grid ──
  if (!centerGuest) {
    const rows = buildCenteredRows(visibleGuests.length)
    const rowWraps: React.ReactNode[] = []
    let offset = 0
    for (let ri = 0; ri < rows.length; ri++) {
      const rowGuests = visibleGuests.slice(offset, offset + rows[ri])
      offset += rows[ri]
      rowWraps.push(
        <div key={ri} className="flex gap-3 justify-center flex-wrap">
          {rowGuests.map(guest => (
            <div key={guest.id} className="flex flex-col items-center gap-1.5">
              <div
                className="flex items-center justify-center rounded-full relative cursor-pointer"
                style={{
                  width: guest.id === currentGuestId ? 70 : 54,
                  height: guest.id === currentGuestId ? 70 : 54,
                  background: guest.rsvpStatus === 'Attending'
                    ? 'linear-gradient(135deg,rgba(74,222,128,0.25),rgba(74,222,128,0.08))'
                    : 'linear-gradient(135deg,rgba(107,47,224,0.3),rgba(155,89,245,0.12))',
                  border: `2px solid ${guest.rsvpStatus === 'Attending' ? 'rgba(74,222,128,0.5)' : 'rgba(155,89,245,0.35)'}`,
                  boxShadow: `0 0 12px ${guest.rsvpStatus === 'Attending' ? 'rgba(74,222,128,0.15)' : 'rgba(155,89,245,0.08)'}`,
                }}
                onClick={() => {
                  if (guest.id === currentGuestId) {
                    setShowEmojiPicker(prev => !prev)
                  }
                }}
              >
                <span className={`leading-none select-none ${guest.id === currentGuestId ? 'text-2xl' : 'text-xl'}`}>
                  {guest.emoji || '🙂'}
                </span>
              </div>
              <span className={`text-center leading-tight ${guest.id === currentGuestId ? 'text-sm font-semibold text-brand-pearl' : 'text-xs font-medium text-brand-pearl/60'}`}>
                {guest.name}
                {guest.id === currentGuestId && (
                  <span className="text-brand-violet ml-1 text-[10px] font-normal">{currentGuestCount > 1 ? '(вы)' : '(ты)'}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )
    }

    return (
      <section className="relative z-10 overflow-hidden py-12">
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
        <div className="px-4 mx-auto max-w-2xl">
          <div className="flex flex-col items-center gap-3">
            {rowWraps}
          </div>
        </div>
        {renderModals()}
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
                    </div>
                  </animated.div>
                </motion.div>
              )
            })()}
          </motion.div>
        )}
      </div>

      {renderModals()}
    </section>
  )
}
