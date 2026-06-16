import type { WishlistItem } from '@/types'

// ─── Constants ──────────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  Available: { label: 'Свободен', cls: 'text-success border-success/40' },
  Reserved: { label: 'Выбран', cls: 'text-warning border-warning/40' },
  Collective: { label: 'Открыт сбор', cls: 'text-info border-info/40' },
  Purchased: { label: 'Куплен', cls: 'text-admin-muted border-admin-muted/40' },
}

export const DEFAULT_STATUS = { label: '', cls: 'text-admin-muted border-admin-muted/20' }

export const STATUS_ORDER: Record<string, number> = {
  Available: 0,
  Collective: 1,
  Reserved: 2,
  Purchased: 3,
}

// ─── Utilities ──────────────────────────────────────────────────────────────────

/** Returns the human-readable label for a given wishlist item status key. */
export function getStatusLabel(status: string): string {
  return STATUS_CONFIG[status]?.label ?? DEFAULT_STATUS.label
}

/** Returns the Tailwind class string for a given wishlist item status badge. */
export function getStatusClass(status: string): string {
  return STATUS_CONFIG[status]?.cls ?? DEFAULT_STATUS.cls
}

// ─── Card Visual State ──────────────────────────────────────────────────────────

export interface CardStatusVisual {
  /** CSS class for the gradient card border. */
  borderClass: string
  /** Button label text (emoji prefix included where applicable). */
  ctaLabel: string
  /** UI button variant token. */
  ctaVariant: 'primary' | 'info' | 'secondary' | 'disabled'
  /** Semantic action identifier for click handlers. */
  ctaAction: 'open-claim' | 'open-info' | 'none'
  /** Whether the CTA button is clickable. */
  interactive: boolean
  /** Layout hint to position elements differently per state. */
  layoutHint: 'available' | 'collective' | 'mine' | 'reserved' | 'purchased'
}

// ─── 7-State CTA Matrix ─────────────────────────────────────────────────────────
//
// | Status      | User State         | ctaLabel              | ctaVariant  | interactive | borderClass                         | layoutHint  |
// |-------------|--------------------|-----------------------|-------------|-------------|--------------------------------------|-------------|
// | Available   | anyone             | 🎁 Хочу подарить     | primary     | true        | card-gradient-border-available       | available   |
// | Collective  | can join           | 🤝 Присоединиться    | info        | true        | card-gradient-border-collective      | collective  |
// | Collective  | in, not creator    | ✓ Ты в сборе          | secondary   | true        | card-gradient-border-collective      | collective  |
// | Collective  | in, creator        | Ты открыл сбор       | secondary   | true        | card-gradient-border-collective-mine | mine        |
// | Reserved    | not me             | 🔒 Уже выбрано       | disabled    | false       | card-gradient-border-reserved        | reserved    |
// | Reserved    | me                 | ✓ Твой выбор          | secondary   | true        | card-gradient-border-collective-mine | mine        |
// | Purchased   | anyone             | ✨ Куплено            | disabled    | false       | card-gradient-border-purchased       | purchased   |
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Pure function that determines the card visual state based on the item status,
 * the current guest's relationship to any active claim, and participants.
 *
 * Handles all 7 states of the CTA matrix (see above table).
 * Nullish `activeClaim` is handled gracefully via optional chaining.
 */
export function getCardStatus(item: WishlistItem, currentGuestId: string): CardStatusVisual {
  const { status, activeClaim } = item
  const isMyClaim = activeClaim?.claimer.id === currentGuestId
  const isInParticipants = activeClaim?.participants.some(p => p.id === currentGuestId) ?? false

  switch (status) {
    case 'Available':
      return {
        borderClass: 'card-gradient-border-available',
        ctaLabel: '🎁 Хочу подарить',
        ctaVariant: 'primary',
        ctaAction: 'open-claim',
        interactive: true,
        layoutHint: 'available',
      }

    case 'Collective':
      if (isMyClaim) {
        return {
          borderClass: 'card-gradient-border-collective-mine',
          ctaLabel: 'Сбор открыт тобой',
          ctaVariant: 'secondary',
          ctaAction: 'open-info',
          interactive: true,
          layoutHint: 'mine',
        }
      }
      if (isInParticipants) {
        return {
          borderClass: 'card-gradient-border-collective',
          ctaLabel: '✓ Ты в сборе',
          ctaVariant: 'secondary',
          ctaAction: 'open-info',
          interactive: true,
          layoutHint: 'collective',
        }
      }
      // Can join the collective
      return {
        borderClass: 'card-gradient-border-collective',
        ctaLabel: '🤝 Присоединиться',
        ctaVariant: 'info',
        ctaAction: 'open-claim',
        interactive: true,
        layoutHint: 'collective',
      }

    case 'Reserved':
      if (isMyClaim) {
        return {
          borderClass: 'card-gradient-border-collective-mine',
          ctaLabel: '✓ Твой выбор',
          ctaVariant: 'secondary',
          ctaAction: 'open-info',
          interactive: true,
          layoutHint: 'mine',
        }
      }
      // Reserved by someone else
      return {
        borderClass: 'card-gradient-border-reserved',
        ctaLabel: '🔒 Уже выбрано',
        ctaVariant: 'disabled',
        ctaAction: 'none',
        interactive: false,
        layoutHint: 'reserved',
      }

    case 'Purchased':
    default:
      return {
        borderClass: 'card-gradient-border-purchased',
        ctaLabel: '✨ Куплено',
        ctaVariant: 'disabled',
        ctaAction: 'none',
        interactive: false,
        layoutHint: 'purchased',
      }
  }
}
