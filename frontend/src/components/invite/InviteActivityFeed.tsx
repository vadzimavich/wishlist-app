'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Bell } from 'lucide-react'
import { ActivityEvent, GuestPublic } from '@/types'
import { useActivityFeed } from '@/hooks/useActivityFeed'

interface Props {
  eventId: string
  guests: GuestPublic[]
}

// ── Action display config ────────────────────────────────────────────────────

type ActionConfig = {
  emoji: string
  getText: (name?: string) => string
}

const ACTION_CONFIG: Record<string, ActionConfig> = {
  RSVPAttending: { emoji: '🎉', getText: (name) => (name ? `${name} будет!` : 'Кто-то будет!') },
  GiftClaimed: { emoji: '🎁', getText: (name) => (name ? `${name} выбрал(а) подарок` : 'Выбран подарок') },
  CollectiveJoined: { emoji: '🤝', getText: (name) => (name ? `${name} присоединился к сбору` : 'Присоединились к сбору') },
  GiftPurchased: { emoji: '✅', getText: () => 'Подарок куплен!' },
}

const EXCLUDED_TYPES = new Set(['RSVPNotAttending', 'MessageSent'])

// ── Display pagination ───────────────────────────────────────────────────────

const INITIAL_SHOW = 5
const LOAD_MORE_INCREMENT = 10

// ── Framer Motion variants ───────────────────────────────────────────────────

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] } },
}

// ── Skeleton shimmer ─────────────────────────────────────────────────────────

function SkeletonLine({ className }: { className?: string }) {
  return <div className={`shimmer rounded-lg ${className ?? ''}`} />
}

function SkeletonBlock() {
  return (
    <div className="flex items-center gap-4">
      <SkeletonLine className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonLine className="h-4 w-3/5" />
        <SkeletonLine className="h-3 w-1/4" />
      </div>
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export function InviteActivityFeed({ eventId, guests }: Props) {
  const { activities, loading, hasMore, loadMore } = useActivityFeed(eventId)

  const [displayCount, setDisplayCount] = useState(INITIAL_SHOW)

  // ── Guest name lookup ──────────────────────────────────────────────────
  const guestMap = useMemo(() => {
    const map = new Map<string, string>()
    guests.forEach((g) => map.set(g.id, g.name))
    return map
  }, [guests])

  const getGuestName = (guestId?: string | null): string | undefined => {
    if (!guestId) return undefined
    return guestMap.get(guestId)
  }

  // ── Filter out excluded action types ───────────────────────────────────
  const filteredActivities = useMemo(
    () => activities.filter((a) => !EXCLUDED_TYPES.has(a.actionType)),
    [activities],
  )

  // ── Display pagination ────────────────────────────────────────────────
  const visibleActivities = filteredActivities.slice(0, displayCount)
  const hasMoreToShow = displayCount < filteredActivities.length || hasMore

  const handleLoadMore = () => {
    const nextCount = displayCount + LOAD_MORE_INCREMENT
    // Fetch more from backend before we exhaust locally shown data
    if (nextCount >= filteredActivities.length && hasMore && !loading) {
      loadMore()
    }
    setDisplayCount(nextCount)
  }

  // ── Get activity config ───────────────────────────────────────────────
  const getConfig = (actionType: string): ActionConfig =>
    ACTION_CONFIG[actionType] ?? { emoji: '📌', getText: () => 'Новое действие' }

  // ── Error state: hide section gracefully ──────────────────────────────
  // If activities failed to load and we have nothing, the hook just returns empty.
  // We hide the entire section if there's no data after loading.
  if (!loading && filteredActivities.length === 0) {
    return null
  }

  return (
    <section className="relative z-10 px-4 py-16 max-w-2xl mx-auto">
      {/* ── Section title ────────────────────────────────────────────── */}
      <div className="text-center mb-10">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
          className="font-display font-bold text-3xl sm:text-4xl tracking-tight gradient-text-sweep flex items-center justify-center gap-3"
        >
          <Bell size={28} className="text-brand-violet shrink-0" />
          Лента активности
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="text-brand-pearl/40 text-xs sm:text-sm mt-2"
        >
          Последние действия гостей
        </motion.p>
      </div>

      {/* ── Loading state: skeleton ──────────────────────────────────── */}
      {loading && filteredActivities.length === 0 && (
        <div className="space-y-5">
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────── */}
      {!loading && filteredActivities.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16"
        >
          <div className="text-5xl mb-4 opacity-30">📬</div>
          <p className="text-brand-pearl/30 text-sm">Пока нет активности</p>
        </motion.div>
      )}

      {/* ── Timeline ─────────────────────────────────────────────────── */}
      {filteredActivities.length > 0 && (
        <div className="relative">
          {/* Central timeline line (desktop) */}
          <div
            className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px
                        bg-gradient-to-b from-brand-violet/30 via-brand-violet/10 to-transparent"
          />

          {/* Mobile timeline line */}
          <div
            className="md:hidden absolute left-5 top-0 bottom-0 w-px
                        bg-gradient-to-b from-brand-violet/30 via-brand-violet/10 to-transparent"
          />

          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
          >
            <AnimatePresence mode="popLayout">
              {visibleActivities.map((activity, index) => {
                const config = getConfig(activity.actionType)
                const name = getGuestName(activity.guestId)
                const isLeft = index % 2 === 0

                return (
                  <motion.div
                    key={activity.id}
                    layout
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    className={`relative mb-6 md:mb-8 ${
                      isLeft
                        ? 'md:pr-[calc(50%+1.5rem)] md:text-right'
                        : 'md:pl-[calc(50%+1.5rem)] md:text-left'
                    }`}
                  >
                    {/* ── Timeline dot ────────────────────────────────── */}
                    {/* Desktop: centered on the line */}
                    <div
                      className={`hidden md:flex absolute top-1/2 -translate-y-1/2 z-10
                                  w-5 h-5 rounded-full items-center justify-center
                                  border-2 border-brand-violet/40 bg-brand-deep
                                  ${isLeft ? 'right-0 translate-x-1/2' : 'left-0 -translate-x-1/2'}`}
                    >
                      <div className="w-2 h-2 rounded-full bg-brand-violet/60" />
                    </div>

                    {/* Mobile: dot on the left line */}
                    <div
                      className="md:hidden absolute left-5 top-6 -translate-x-1/2 z-10
                                  w-4 h-4 rounded-full border-2 border-brand-violet/40
                                  bg-brand-deep flex items-center justify-center"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-violet/60" />
                    </div>

                    {/* ── Activity card ───────────────────────────────── */}
                    {/* Mobile: indent to the right of the line */}
                    <div className="md:ml-0 ml-10">
                      <div className="liquid-glass p-4 sm:p-5 inline-block max-w-full text-left">
                        <div className="flex items-start gap-3 sm:gap-4">
                          {/* Emoji circle */}
                          <div
                            className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full
                                        flex items-center justify-center text-lg sm:text-xl
                                        bg-brand-violet/10 border border-brand-violet/20"
                          >
                            {config.emoji}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-brand-pearl text-sm sm:text-base font-medium leading-snug">
                              {config.getText(name)}
                            </p>
                            <p className="text-brand-pearl/30 text-xs mt-1.5">
                              {formatDistanceToNow(new Date(activity.createdAt), {
                                addSuffix: true,
                                locale: ru,
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.div>

          {/* ── Load more button ──────────────────────────────────────── */}
          {(hasMoreToShow || loading) && (
            <div className="text-center mt-8">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full
                           border border-brand-violet/20 text-brand-violet text-sm font-medium
                           hover:bg-brand-violet/10 hover:border-brand-violet/40
                           transition-all duration-300 disabled:opacity-40
                           active:scale-95"
              >
                {loading ? (
                  <>
                    <div
                      className="w-4 h-4 rounded-full border-2 border-brand-violet/30 
                                  border-t-brand-violet animate-spin"
                    />
                    Загрузка...
                  </>
                ) : (
                  'Показать ещё'
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
