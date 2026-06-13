import os
content = """'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { GuestPublic } from '@/types'

interface Props {
  guests: GuestPublic[]
  currentGuestId: string
}

const MARGIN = 50

const OBSIDIAN_DEFAULTS = {
  centerStrength: 0.5,
  repelStrength: 10,
  linkStrength: 1.0,
  linkDistance: 250,
  alphaDecay: 0.01,
  velocityDecay: 0.4,
  distanceMin: 30,
  alphaMin: 0.001,
}

interface SimNode {
  id: string
  x: number; y: number
  vx: number; vy: number
  fixed: boolean
}
interface SimLink {
  sourceIdx: number; targetIdx: number
  distance: number; strength: number; bias: number
}

function generateEdges(ids: string[], centerId?: string): [string, string][] {
  if (ids.length < 2) return []
  const seen = new Set<string>()
  const result: [string, string][] = []
  for (const id of ids) {
    if (id === centerId) continue
    const target = 1 + Math.floor(Math.random() * 2)
    let added = 0, tries = 0
    while (added < target && tries < 40) {
      tries++; const other = ids[Math.floor(Math.random() * ids.length)]
      if (other === id || other === centerId) continue
      const key = id < other ? `${id}|${other}` : `${other}|${id}`
      if (seen.has(key)) continue
      seen.add(key); result.push([id, other]); added++
    }
  }
  if (centerId) {
    for (const id of ids) {
      if (id === centerId) continue
      const key = centerId < id ? `${centerId}|${id}` : `${id}|${centerId}`
      if (!seen.has(key)) { seen.add(key); result.push([centerId, id]) }
    }
  }
  return result
}

function simulateTick(
  nodes: SimNode[], links: SimLink[],
  cx: number, cy: number,
  alpha: number,
  p: typeof OBSIDIAN_DEFAULTS,
) {
  const dm2 = p.distanceMin * p.distanceMin
  const vd = 1 - p.velocityDecay

  for (const ln of links) {
    const s = nodes[ln.sourceIdx], t = nodes[ln.targetIdx]
    let x = (t.x + t.vx - s.x - s.vx) || 0.001
    let y = (t.y + t.vy - s.y - s.vy) || 0.001
    let l = Math.sqrt(x * x + y * y)
    l = (l - ln.distance) / l * alpha * ln.strength
    x *= l; y *= l
    t.vx -= x * ln.bias
    t.vy -= y * ln.bias
    s.vx += x * (1 - ln.bias)
    s.vy += y * (1 - ln.bias)
  }

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j]
      if (a.fixed && b.fixed) continue
      let x = a.x - b.x, y = a.y - b.y
      let l2 = x * x + y * y
      if (l2 < 0.01) { x = 0.1; y = 0.1; l2 = 0.02 }
      if (l2 < dm2) l2 = Math.sqrt(dm2 * l2)
      const force = (-p.repelStrength * 30) * alpha / l2
      if (!a.fixed) { a.vx += x * force; a.vy += y * force }
      if (!b.fixed) { b.vx -= x * force; b.vy -= y * force }
    }
  }

  for (const node of nodes) {
    if (node.fixed) continue
    node.vx += (cx - node.x) * p.centerStrength * alpha
    node.vy += (cy - node.y) * p.centerStrength * alpha
  }

  for (const node of nodes) {
    if (node.fixed) continue
    node.vx *= vd
    node.vy *= vd
    node.x += node.vx
    node.y += node.vy
  }
}

function runSimulation(
  nodes: SimNode[], links: SimLink[],
  cx: number, cy: number,
  params: typeof OBSIDIAN_DEFAULTS,
  alphaStart = 1, alphaTarget = 0,
  maxIter = 500,
) {
  let alpha = alphaStart
  for (let i = 0; i < maxIter; i++) {
    alpha += (alphaTarget - alpha) * params.alphaDecay
    if (alpha < params.alphaMin) break
    simulateTick(nodes, links, cx, cy, alpha, params)
  }
}

function buildNodesLinks(
  allIds: string[], centerId: string | undefined,
  edges: [string, string][],
  pos: Record<string, { x: number; y: number }>,
  params: typeof OBSIDIAN_DEFAULTS,
): { nodes: SimNode[]; links: SimLink[] } {
  const nodeMap = new Map<string, SimNode>()
  allIds.forEach((id) => {
    const p = pos[id]
    if (!p) return
    nodeMap.set(id, { id, x: p.x, y: p.y, vx: 0, vy: 0, fixed: id === centerId })
  })
  const degree = new Map<string, number>()
  allIds.forEach(id => degree.set(id, 0))
  for (const [a, b] of edges) {
    degree.set(a, (degree.get(a) ?? 0) + 1)
    degree.set(b, (degree.get(b) ?? 0) + 1)
  }
  const idToIdx = new Map<string, number>()
  const nodes: SimNode[] = allIds.map((id, i) => { idToIdx.set(id, i); return nodeMap.get(id)! }).filter(Boolean)
  const links: SimLink[] = []
  for (const [a, b] of edges) {
    const si = idToIdx.get(a), ti = idToIdx.get(b)
    if (si === undefined || ti === undefined) continue
    const dS = degree.get(a) ?? 1, dT = degree.get(b) ?? 1
    links.push({ sourceIdx: si, targetIdx: ti, distance: params.linkDistance, strength: params.linkStrength / Math.min(dS, dT), bias: dS / (dS + dT) })
  }
  return { nodes, links }
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
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }> | null>(null)
  const [graphSize, setGraphSize] = useState({ w: 800, h: 420 })
  const [params, setParams] = useState({ ...OBSIDIAN_DEFAULTS })
  const [showDebug, setShowDebug] = useState(false)

  const visibleGuests = useMemo(() => guests.filter(g => g.rsvpStatus !== 'NotAttending'), [guests])
  const attending = useMemo(() => guests.filter(g => g.rsvpStatus === 'Attending').length, [guests])
  const orbitingGuests = useMemo(() => visibleGuests.filter(g => g.id !== currentGuestId), [visibleGuests, currentGuestId])
  const centerGuest = useMemo(() => visibleGuests.find(g => g.id === currentGuestId), [visibleGuests, currentGuestId])
  const orbitIds = useMemo(() => orbitingGuests.map(g => g.id), [orbitingGuests])
  const allIds = useMemo(() => (centerGuest ? [centerGuest.id, ...orbitIds] : orbitIds), [centerGuest, orbitIds])
  const edges = useMemo(() => generateEdges(allIds, centerGuest?.id), [allIds, centerGuest])

  const buildAndRun = useCallback(
    (w: number, h: number, alphaStart = 1, alphaTarget = 0) => {
      const cx = w / 2, cy = h / 2
      const seed: Record<string, { x: number; y: number }> = {}
      if (centerGuest) seed[centerGuest.id] = { x: cx, y: cy }
      orbitingGuests.forEach((g, i) => {
        const a = (i / orbitingGuests.length) * Math.PI * 2 - Math.PI / 2
        const r = 10 + Math.random() * 25
        seed[g.id] = { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }
      })
      const { nodes, links } = buildNodesLinks(allIds, centerGuest?.id, edges, seed, params)
      const ci = allIds.indexOf(centerGuest?.id ?? '')
      if (ci !== -1) { nodes[ci].x = cx; nodes[ci].y = cy }
      runSimulation(nodes, links, cx, cy, params, alphaStart, alphaTarget)
      if (ci !== -1) { nodes[ci].x = cx; nodes[ci].y = cy }
      const result: Record<string, { x: number; y: number }> = {}
      for (const node of nodes) {
        result[node.id] = {
          x: Math.max(MARGIN, Math.min(w - MARGIN, node.x)),
          y: Math.max(MARGIN, Math.min(h - MARGIN, node.y)),
        }
      }
      return result
    },
    [orbitingGuests, centerGuest, allIds, edges, params],
  )

  useEffect(() => {
    const el = graphRef.current
    if (!el || allIds.length === 0) return
    const measure = () => {
      const w = el.offsetWidth || 800
      const h = 420
      setGraphSize({ w, h })
      setPositions(buildAndRun(w, h))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [allIds, buildAndRun])

  const handleDrag = useCallback(
    (guestId: string, _: any, info: { delta: { x: number; y: number } }) => {
      if (!centerGuest) return
      setPositions(prev => {
        if (!prev) return prev
        const w = graphSize.w, h = graphSize.h, cx = w / 2, cy = h / 2
        const cur = prev[guestId]
        if (!cur) return prev
        const seed = {
          ...prev,
          [guestId]: {
            x: Math.max(MARGIN, Math.min(w - MARGIN, cur.x + info.delta.x)),
            y: Math.max(MARGIN, Math.min(h - MARGIN, cur.y + info.delta.y)),
          },
        }
        if (centerGuest) seed[centerGuest.id] = { x: cx, y: cy }
        const { nodes, links } = buildNodesLinks(allIds, centerGuest.id, edges, seed, params)
        let alpha = 0.3
        for (let i = 0; i < 8; i++) {
          alpha += (0 - alpha) * params.alphaDecay
          if (alpha < 0.001) break
          simulateTick(nodes, links, cx, cy, alpha, params)
        }
        const ci = nodes.findIndex(n => n.id === centerGuest.id)
        if (ci !== -1) { nodes[ci].x = cx; nodes[ci].y = cy }
        const next: Record<string, { x: number; y: number }> = {}
        for (const node of nodes) {
          next[node.id] = {
            x: Math.max(MARGIN, Math.min(w - MARGIN, node.x)),
            y: Math.max(MARGIN, Math.min(h - MARGIN, node.y)),
          }
        }
        return next
      })
    },
    [allIds, edges, params, graphSize, centerGuest],
  )

  const handleDragEnd = useCallback(() => {
    if (!centerGuest) return
    setPositions(prev => {
      if (!prev) return prev
      const w = graphSize.w, h = graphSize.h, cx = w / 2, cy = h / 2
      const seed = { ...prev }
      if (centerGuest) seed[centerGuest.id] = { x: cx, y: cy }
      const { nodes, links } = buildNodesLinks(allIds, centerGuest.id, edges, seed, params)
      const ci = nodes.findIndex(n => n.id === centerGuest.id)
      if (ci !== -1) { nodes[ci].x = cx; nodes[ci].y = cy }
      runSimulation(nodes, links, cx, cy, params, 0.3, 0)
      if (ci !== -1) { nodes[ci].x = cx; nodes[ci].y = cy }
      const next: Record<string, { x: number; y: number }> = {}
      for (const node of nodes) {
        next[node.id] = {
          x: Math.max(MARGIN, Math.min(w - MARGIN, node.x)),
          y: Math.max(MARGIN, Math.min(h - MARGIN, node.y)),
        }
      }
      return next
    })
  }, [allIds, edges, params, graphSize, centerGuest])

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

  const ready = positions !== null

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
        style={{ maxWidth: '660px', height: ready ? graphSize.h : 420 }}>
        {ready && (
          <motion.div variants={containerVariants} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-40px' }} className="relative w-full h-full">
            <svg className="absolute inset-0 w-full h-full pointer-events-none select-none"
              style={{ zIndex: 0 }} aria-hidden="true">
              {edges.map(([a, b], i) => {
                const pa = positions[a], pb = positions[b]
                if (!pa || !pb) return null
                return <line key={`e${i}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                  stroke="rgba(155,89,245,0.08)" strokeWidth={1.2} strokeLinecap="round" />
              })}
            </svg>
            {orbitingGuests.map(guest => {
              const pos = positions[guest.id]; if (!pos) return null
              const isAtt = guest.rsvpStatus === 'Attending'
              const bc = isAtt ? 'rgba(74,222,128,0.5)' : 'rgba(155,89,245,0.35)'
              const gl = isAtt ? 'rgba(74,222,128,0.15)' : 'rgba(155,89,245,0.08)'
              return (
                <motion.div key={guest.id} variants={nodeVariants} layout drag dragElastic={0.03}
                  dragConstraints={graphRef} onDrag={(e, info) => handleDrag(guest.id, e, info)}
                  onDragEnd={handleDragEnd}
                  className="absolute cursor-grab active:cursor-grabbing"
                  style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)', touchAction: 'none' }}
                  whileDrag={{ scale: 1.12, zIndex: 50, transition: { duration: 0.15 } }}>
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
                </motion.div>
              )
            })}
            {centerGuest && (() => {
              const pos = positions[centerGuest.id]; if (!pos) return null
              const isAtt = centerGuest.rsvpStatus === 'Attending'
              const bc = isAtt ? 'rgba(74,222,128,0.55)' : 'rgba(155,89,245,0.5)'
              const gl = isAtt ? 'rgba(74,222,128,0.2)' : 'rgba(155,89,245,0.12)'
              return (
                <motion.div key={centerGuest.id} variants={nodeVariants}
                  className="absolute pointer-events-none"
                  style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)', zIndex: 10 }}>
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
                </motion.div>
              )
            })()}
          </motion.div>
        )}
      </div>

      <div className="mt-8 px-4 text-center">
        <button onClick={() => setShowDebug(p => !p)}
          className="text-[10px] text-brand-pearl/20 hover:text-brand-pearl/50 transition-colors">
          {showDebug ? 'Скрыть отладку' : 'Параметры физики (Obsidian)'}
        </button>
        {showDebug && (
          <div className="mx-auto mt-3 p-3 rounded-xl border border-brand-pearl/5 bg-brand-deep/80 max-w-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <Slider label="centerStr" value={params.centerStrength} min={0} max={2} step={0.01} onChange={v => setParams(p => ({ ...p, centerStrength: v }))} />
              <Slider label="repelStr" value={params.repelStrength} min={0} max={20} step={0.1} onChange={v => setParams(p => ({ ...p, repelStrength: v }))} />
              <Slider label="linkStr" value={params.linkStrength} min={0} max={2} step={0.01} onChange={v => setParams(p => ({ ...p, linkStrength: v }))} />
              <Slider label="linkDist" value={params.linkDistance} min={20} max={300} step={1} onChange={v => setParams(p => ({ ...p, linkDistance: v }))} />
              <Slider label="alphaDecay" value={params.alphaDecay} min={0.001} max={0.1} step={0.001} onChange={v => setParams(p => ({ ...p, alphaDecay: v }))} />
              <Slider label="velDecay" value={params.velocityDecay} min={0.1} max={0.9} step={0.01} onChange={v => setParams(p => ({ ...p, velocityDecay: v }))} />
              <Slider label="distMin" value={params.distanceMin} min={5} max={100} step={1} onChange={v => setParams(p => ({ ...p, distanceMin: v }))} />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
"""

filepath = r'C:\Users\Admin\Desktop\wishlist-app\frontend\src\components\invite\InviteGuests.tsx'
with open(filepath, 'w', newline='') as f:
    f.write(content)
print(f'Written {len(content)} chars to {filepath}')
