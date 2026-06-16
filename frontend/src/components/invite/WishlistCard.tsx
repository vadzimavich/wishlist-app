'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Gift, ExternalLink } from 'lucide-react'
import type { WishlistItem } from '@/types'
import { cn, formatPrice } from '@/lib/utils'
import { getCardStatus, STATUS_CONFIG } from '@/lib/wishlistStatus'
import { CollectiveProgress } from './CollectiveProgress'

// ─── Props ────────────────────────────────────────────────────────────────────

interface WishlistCardProps {
  item: WishlistItem
  currentGuestId: string
  onOpen: (item: WishlistItem) => void
  className?: string
}

// ─── Strip color map (matches gradient border primary colors) ────────────────

const STRIP_COLORS: Record<string, string> = {
  available: '#34D399',
  collective: '#38BDF8',
  mine: '#9B59F5',
  reserved: '#7A7A9A',
  purchased: '#4ADE80',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WishlistCard({ item, currentGuestId, onOpen, className }: WishlistCardProps) {
  const [imgError, setImgError] = useState(false)
  const visual = getCardStatus(item, currentGuestId)
  const statusCfg = STATUS_CONFIG[item.status]
  const isInteractive = visual.interactive

  return (
    <motion.div
      className={cn(
        // GSAP targets `.wish-card` — do not remove
        'wish-card liquid-glass group relative overflow-hidden transition-all duration-300',
        isInteractive
          ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-violet focus-visible:ring-offset-2 focus-visible:ring-offset-brand-deep'
          : 'opacity-60 cursor-default',
        className,
      )}
      onClick={isInteractive ? () => onOpen(item) : undefined}
      onKeyDown={isInteractive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(item)
        }
      } : undefined}
      whileHover={isInteractive ? { scale: 1.01 } : undefined}
      whileTap={isInteractive ? { scale: 0.99 } : undefined}
      role={isInteractive ? 'button' : 'article'}
      tabIndex={isInteractive ? 0 : -1}
      aria-label={isInteractive ? `${item.name}. ${visual.ctaLabel}` : item.name}
      aria-disabled={!isInteractive}
    >
      {/* ── Photo container (aspect 4:3) ──────────────────────────────── */}
      <div className="relative w-full aspect-[4/3] overflow-hidden rounded-t-2xl bg-brand-deep">
        {item.photoUrl && !imgError ? (
          <img
            src={item.photoUrl}
            alt={item.name}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gift size={48} className="text-brand-pearl/20" />
          </div>
        )}

        {/* Status badge — top-right corner */}
        {statusCfg && (
          <span
            className={cn(
              'absolute top-3 right-3 z-10 text-sm px-3 py-1.5 rounded-full border font-medium',
              'bg-black/50 backdrop-blur-sm',
              statusCfg.cls,
            )}
          >
            {statusCfg.label}
          </span>
        )}

        {/* Source link — top-left corner (optional) */}
        {item.sourceUrl && (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                         bg-black/50 backdrop-blur-sm text-white/90 hover:text-white hover:bg-black/60 transition-all"
            title="Открыть на сайте"
          >
            <ExternalLink size={18} />
            <span>Сайт</span>
          </a>
        )}

        {/* Status gradient strip — 3px at bottom of photo */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[3px]"
          style={{ backgroundColor: STRIP_COLORS[visual.layoutHint] ?? '#34D399' }}
        />
      </div>

      {/* ── Content body ──────────────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <p
          className="text-base font-medium text-brand-pearl line-clamp-2 leading-tight"
          title={item.name}
        >
          {item.name}
        </p>

        {/* Price */}
        {item.price != null && (
          <p className="gradient-text-gold text-lg font-semibold">
            {formatPrice(item.price, item.currency)}
          </p>
        )}

        {/* Collective progress (only for Collective items with activeClaim) */}
        {item.status === 'Collective' && item.activeClaim && (
          <CollectiveProgress claim={item.activeClaim} />
        )}

        {/* ── CTA button (state-aware, full-width) ────────────────────── */}
        {visual.ctaVariant === 'disabled' ? (
          <button
            disabled
            className="w-full py-3 rounded-xl bg-brand-deep/50 opacity-40 cursor-default text-center text-sm font-medium text-brand-pearl/60"
          >
            {visual.ctaLabel}
          </button>
        ) : visual.ctaVariant === 'primary' ? (
          <button
            onClick={() => onOpen(item)}
            className="w-full py-3 rounded-xl bg-brand-violet hover:bg-brand-purple active:bg-brand-purple/80 text-white font-semibold text-sm transition-colors duration-200"
          >
            {visual.ctaLabel}
          </button>
        ) : visual.ctaVariant === 'info' ? (
          <button
            onClick={() => onOpen(item)}
            className="w-full py-3 rounded-xl bg-info/20 border border-info/30 text-info font-semibold text-sm hover:bg-info/30 transition-colors duration-200"
          >
            {visual.ctaLabel}
          </button>
        ) : (
          /* secondary variant — catches 'secondary' and any fallback */
          <button
            onClick={() => onOpen(item)}
            className="w-full py-3 rounded-xl border border-brand-violet/30 text-brand-violet font-medium text-sm hover:bg-brand-violet/5 transition-colors duration-200"
          >
            {visual.ctaLabel}
          </button>
        )}
      </div>
    </motion.div>
  )
}
