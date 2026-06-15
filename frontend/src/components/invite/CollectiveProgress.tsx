import { GiftClaim } from '@/types'
import { cn } from '@/lib/utils'

interface CollectiveProgressProps {
  claim: GiftClaim
  maxAvatars?: number
}

export function CollectiveProgress({ claim, maxAvatars = 4 }: CollectiveProgressProps) {
  const participants = claim.participants
  const totalTarget = Math.max(claim.claimer.guestCount || 0, 5)
  const ratio = Math.min(participants.length / totalTarget, 1)
  const percent = ratio * 100

  const barColor =
    ratio < 0.4 ? 'bg-info' : ratio < 0.8 ? 'bg-warning' : 'bg-success'

  /* ── Zero participants — minimal rendering ── */
  if (participants.length === 0) {
    return (
      <div className="space-y-2">
        <div className="h-1.5 rounded-full bg-brand-deep/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-info transition-all duration-500"
            style={{ width: '0%' }}
          />
        </div>
        <p className="text-xs text-brand-pearl/40">Сбор открыт · 0 участников</p>
      </div>
    )
  }

  const visibleAvatars = participants.slice(0, maxAvatars)
  const overflowCount = participants.length - maxAvatars

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-brand-deep/50 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Info row: count + avatars */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-brand-pearl/40">Сбор · {participants.length} участников</p>

        {/* Avatar stack */}
        <div className="flex items-center">
          {visibleAvatars.map((guest, i) => (
            <div
              key={guest.id}
              className={cn(
                'w-7 h-7 rounded-full border-2 border-brand-deep flex items-center justify-center bg-admin-surface text-xs leading-none',
                i === 0 ? '-ml-2' : '-ml-3',
              )}
            >
              {guest.emoji}
            </div>
          ))}
          {overflowCount > 0 && (
            <div className="w-7 h-7 rounded-full border-2 border-brand-deep flex items-center justify-center bg-admin-surface text-xs leading-none -ml-3 font-medium text-brand-pearl/40">
              +{overflowCount}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
