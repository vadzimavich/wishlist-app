'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useSprings, useSpring, animated } from '@react-spring/web'
import { GuestPublic } from '@/types'

interface Props {
  guests: GuestPublic[]
  currentGuestId: string
}

const MARGIN = 50
const GRID_SPACING_X = 160  // horizontal cell spacing (stretched)
const GRID_SPACING_Y = 100   // vertical cell spacing

function generateEdges(ids: string[], centerId?: string): [string, string][] {
  const sorted = [...ids].sort()
  const result: [string, string][] = []

  // Each guest connects to the next and skip-next in sorted order
  for (let i = 0; i < sorted.length; i++) {
    const next = (i + 1) % sorted.length
    if (next !== i) {
      result.push([sorted[i], sorted[next]])
    }
    // For larger groups, add a second edge (skip connection)
    if (sorted.length > 6) {
      const skip = (i + 2) % sorted.length
      if (skip !== i && skip !== next) {
        result.push([sorted[i], sorted[skip]])
      }
    }
  }

  // Connect center to first 3-4 guests (if center is in the list)
  if (centerId && sorted.includes(centerId)) {
    const centerIdx = sorted.indexOf(centerId)
    const others = sorted.filter(id => id !== centerId)
    for (let i = 0; i < Math.min(4, others.length); i++) {
      const target = others[i]
      // Check if edge already exists
      const exists = result.some(([a, b]) =>
        (a === sorted[centerIdx] && b === target) ||
        (a === target && b === sorted[centerIdx])
      )
      if (!exists) {
        result.push([sorted[centerIdx], target])
      }
    }
  }

  return result
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.15 } },
}
const nodeVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: 'spring', damping: 14, stiffness: 220 } },
}

export function InviteGuests({ guests, currentGuestId }: Props) {
  const graphRef = useRef<HTMLDivElement>(null)
  const [springParams, setSpringParams] = useState({ tension: 170, friction: 26, mass: 1, minDistance: 110 })
  const [initialized, setInitialized] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const draggedGuestIdRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)
  const homePositionsRef = useRef<{ x: number; y: number }[]>([])

  const visibleGuests = useMemo(() => guests.filter(g => g.rsvpStatus !== 'NotAttending'), [guests])
  const attending = useMemo(() => guests.filter(g => g.rsvpStatus === 'Attending').length, [guests])
  const orbitingGuests = useMemo(() => visibleGuests.filter(g => g.id !== currentGuestId), [visibleGuests, currentGuestId])
  const centerGuest = useMemo(() => visibleGuests.find(g => g.id === currentGuestId), [visibleGuests, currentGuestId])
  const orbitIds = useMemo(() => orbitingGuests.map(g => g.id), [orbitingGuests])
  const allIds = useMemo(() => (centerGuest ? [centerGuest.id, ...orbitIds] : orbitIds), [centerGuest, orbitIds])
  const edges = useMemo(() => generateEdges(allIds, centerGuest?.id), [allIds, centerGuest])

  const [springs, api] = useSprings(
    orbitingGuests.length,
    i => ({ x: 0, y: 0, config: { tension: springParams.tension, friction: springParams.friction, mass: springParams.mass } })
  )

  const [centerSpring, centerApi] = useSpring(() => ({
    x: 0,
    y: 0,
    config: { tension: 80, friction: 28, mass: 2 },
  }))

  const idToSpringIdx = useMemo(() => {
    const map = new Map<string, number>()
    orbitingGuests.forEach((g, i) => map.set(g.id, i))
    return map
  }, [orbitingGuests])

  function computeGridLayout(count: number, cx: number, cy: number): { x: number; y: number }[] {
    if (count <= 1) return Array.from({ length: count }, () => ({ x: cx, y: cy }))

    // Build a grid large enough to hold all orbiting guests
    // Center position (0,0) is reserved for the center guest
    // Fill cells closest to center first in diamond pattern

    const halfSize = Math.ceil(Math.sqrt(count)) + 2
    const cells: { col: number; row: number; distSq: number }[] = []

    for (let row = -halfSize; row <= halfSize; row++) {
      for (let col = -halfSize; col <= halfSize; col++) {
        if (col === 0 && row === 0) continue // skip center (reserved for center guest)
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
    isDraggingRef.current = true
    const el = graphRef.current
    if (el) {
      el.setPointerCapture(e.pointerId)
    }
  }, [orbitingGuests])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current || draggedGuestIdRef.current === null) return

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

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    const draggedIdx = draggedGuestIdRef.current
    draggedGuestIdRef.current = null
    try {
      const el = graphRef.current
      if (el) el.releasePointerCapture(e.pointerId)
    } catch { /* pointer may not be captured if no drag started */ }

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

  const Slider = useCallback(({ label, value, min, max, step, onChange }: {
    label: string; value: number; min: number; max: number; step: number
    onChange: (v: number) => void
  }) => (
    <div className="flex items-center gap-2 text-[10px] text-brand-pearl/60">
      <span className="w-14 shrink-0 text-left">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))} className="w-20 accent-brand-violet" />
      <span className="w-10 text-right font-mono tabular-nums">{value}</span>
    </div>
  ), [])

  if (guests.length === 0 || visibleGuests.length === 0) {
    return (
      <section className="relative z-10 overflow-hidden py-16">
        <div className="text-center px-4">
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight gradient-text">Гости</h2>
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
          className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl leading-tight tracking-tight gradient-text">
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
        onPointerUp={handlePointerUp}>
        {initialized && (
          <motion.div variants={containerVariants} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-40px' }} className="relative w-full h-full">
            <svg className="absolute inset-0 w-full h-full pointer-events-none select-none"
              style={{ zIndex: 0 }} aria-hidden="true">
              {edges.map(([aId, bId], i) => {
                const aIdx = idToSpringIdx.get(aId)
                const bIdx = idToSpringIdx.get(bId)
                if (aIdx === undefined && aId !== centerGuest?.id) return null
                if (bIdx === undefined && bId !== centerGuest?.id) return null

                const getSpring = (id: string, idx: number | undefined) => {
                  if (id === centerGuest?.id) return { x: centerSpring.x, y: centerSpring.y }
                  if (idx !== undefined) return { x: springs[idx].x, y: springs[idx].y }
                  return null
                }

                const aS = getSpring(aId, aIdx)
                const bS = getSpring(bId, bIdx)
                if (!aS || !bS) return null

                return (
                  <animated.line
                    key={`e${i}`}
                    x1={aS.x} y1={aS.y}
                    x2={bS.x} y2={bS.y}
                    stroke="rgba(155,89,245,0.08)"
                    strokeWidth={1.2}
                    strokeLinecap="round"
                  />
                )
              })}
            </svg>

            {orbitingGuests.map((guest, i) => {
              const spring = springs[i]
              const isAtt = guest.rsvpStatus === 'Attending'
              const bc = isAtt ? 'rgba(74,222,128,0.5)' : 'rgba(155,89,245,0.35)'
              const gl = isAtt ? 'rgba(74,222,128,0.15)' : 'rgba(155,89,245,0.08)'

              return (
                <motion.div key={guest.id} variants={nodeVariants}>
                  <animated.div
                    style={{
                      position: 'absolute',
                      left: spring.x.to(x => `${x - 27}px`),
                      top: spring.y.to(y => `${y - 27}px`),
                      touchAction: 'none',
                      cursor: 'grab',
                    }}
                    onPointerDown={(e: React.PointerEvent) => handlePointerDown(guest.id, e)}>
                    <div className="flex flex-col items-center gap-1.5 pointer-events-none select-none">
                      <div className="flex items-center justify-center rounded-full"
                        style={{
                          width: 54, height: 54,
                          background: isAtt ? 'linear-gradient(135deg,rgba(74,222,128,0.25),rgba(74,222,128,0.08))' : 'linear-gradient(135deg,rgba(107,47,224,0.3),rgba(155,89,245,0.12))',
                          border: `2px solid ${bc}`, boxShadow: `0 0 12px ${gl}`,
                        }}>
                        <span className="text-lg sm:text-xl leading-none select-none">{guest.emoji || '🙂'}</span>
                      </div>
                      <span className="text-[11px] sm:text-xs font-medium text-center leading-tight text-brand-pearl/60">{guest.name}</span>
                    </div>
                  </animated.div>
                </motion.div>
              )
            })}

            {centerGuest && (() => {
              const isAtt = centerGuest.rsvpStatus === 'Attending'
              const bc = isAtt ? 'rgba(74,222,128,0.55)' : 'rgba(155,89,245,0.5)'
              const gl = isAtt ? 'rgba(74,222,128,0.2)' : 'rgba(155,89,245,0.12)'
              return (
                <motion.div key={centerGuest.id} variants={nodeVariants}>
                  <animated.div style={{
                    position: 'absolute',
                    left: centerSpring.x.to(x => `${x - 35}px`),
                    top: centerSpring.y.to(y => `${y - 35}px`),
                    zIndex: 10,
                  }}>
                    <div className="flex flex-col items-center gap-2 select-none">
                      <div className="flex items-center justify-center rounded-full"
                        style={{
                          width: 70, height: 70,
                          background: isAtt ? 'linear-gradient(135deg,rgba(74,222,128,0.3),rgba(74,222,128,0.1))' : 'linear-gradient(135deg,rgba(107,47,224,0.35),rgba(155,89,245,0.15))',
                          border: `2px solid ${bc}`, boxShadow: `0 0 0 2px rgba(155,89,245,0.5), 0 0 24px ${gl}`,
                        }}>
                        <span className="text-2xl sm:text-3xl leading-none select-none">{centerGuest.emoji || '🙂'}</span>
                      </div>
                      <span className="text-sm sm:text-base font-semibold text-center leading-tight text-brand-pearl">
                        {centerGuest.name}<span className="text-brand-violet ml-1 text-[10px] font-normal">(ты)</span>
                      </span>
                    </div>
                  </animated.div>
                </motion.div>
              )
            })()}
          </motion.div>
        )}
      </div>

      <div className="mt-8 px-4 text-center">
        <button onClick={() => setShowDebug(p => !p)}
          className="text-[10px] text-brand-pearl/20 hover:text-brand-pearl/50 transition-colors">
          {showDebug ? 'Скрыть отладку' : 'Параметры физики (Spring)'}
        </button>
        {showDebug && (
          <div className="mx-auto mt-3 p-3 rounded-xl border border-brand-pearl/5 bg-brand-deep/80 max-w-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <Slider label="tension" value={springParams.tension} min={20} max={300} step={1} onChange={v => setSpringParams(p => ({ ...p, tension: v }))} />
              <Slider label="friction" value={springParams.friction} min={1} max={50} step={1} onChange={v => setSpringParams(p => ({ ...p, friction: v }))} />
              <Slider label="mass" value={springParams.mass} min={0.1} max={5} step={0.1} onChange={v => setSpringParams(p => ({ ...p, mass: v }))} />
              <Slider label="minDist" value={springParams.minDistance} min={20} max={200} step={1} onChange={v => setSpringParams(p => ({ ...p, minDistance: v }))} />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
