'use client'

import { useEffect, useRef } from 'react'
import { GuestPublic } from '@/types'

interface Props {
  guests: GuestPublic[]
  currentGuestId: string
}

const RSVP_CONFIG: Record<string, { color: string; dot: string; label: string }> = {
  Pending:      { color: 'bg-admin-muted/20',  dot: 'bg-admin-muted', label: 'Ожидает'   },
  Attending:    { color: 'bg-success/10',       dot: 'bg-success',     label: 'Придёт'    },
  NotAttending: { color: 'bg-danger/10',        dot: 'bg-danger',      label: 'Не придёт' },
}

const DEFAULT_CFG = { color: 'bg-admin-muted/20', dot: 'bg-admin-muted', label: '' }

export function InviteGuests({ guests, currentGuestId }: Props) {
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const initGsap = async () => {
      const { gsap } = await import('gsap')
      const { ScrollTrigger } = await import('gsap/ScrollTrigger')
      gsap.registerPlugin(ScrollTrigger)

      if (sectionRef.current) {
        gsap.fromTo(
          sectionRef.current.querySelectorAll('.guest-chip'),
          { scale: 0.8, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            stagger: 0.06,
            duration: 0.4,
            ease: 'back.out(1.7)',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 80%',
            },
          }
        )
      }
    }
    initGsap()
  }, [])

  const attending = guests.filter(g => g.rsvpStatus === 'Attending').length

  return (
    <section ref={sectionRef} className="relative z-10 px-4 py-8 max-w-2xl mx-auto">
      <div className="liquid-glass p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display font-bold text-brand-pearl text-lg">Гости</h2>
            <p className="text-brand-pearl/40 text-xs mt-0.5">
              {guests.length} приглашено · {attending} придут
            </p>
          </div>

          {/* Attending avatars stack */}
          {attending > 0 && (
            <div className="flex -space-x-2">
              {guests
                .filter(g => g.rsvpStatus === 'Attending')
                .slice(0, 4)
                .map((g, i) => (
                  <div
                    key={g.id}
                    title={g.name}
                    className="w-7 h-7 rounded-full border-2 border-brand-midnight
                               bg-gradient-to-br from-brand-purple to-brand-violet
                               flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ zIndex: 4 - i }}
                  >
                    {g.emoji || g.name.charAt(0).toUpperCase()}
                  </div>
                ))}
              {attending > 4 && (
                <div
                  className="w-7 h-7 rounded-full border-2 border-brand-midnight
                             bg-admin-elevated flex items-center justify-center
                             text-[10px] text-brand-pearl/60"
                  style={{ zIndex: 0 }}
                >
                  +{attending - 4}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Guest chips */}
        <div className="flex flex-wrap gap-2">
          {guests.map(guest => {
            const cfg = RSVP_CONFIG[guest.rsvpStatus] ?? DEFAULT_CFG
            const isMe = guest.id === currentGuestId

            return (
              <div
                key={guest.id}
                className={`guest-chip flex items-center gap-2 px-3 py-1.5 rounded-full
                             text-sm transition-all ${cfg.color}
                             ${isMe ? 'ring-1 ring-brand-violet/40' : ''}`}
              >
                <span className="text-base leading-none">{guest.emoji || '🙂'}</span>
                <span className={isMe ? 'text-brand-pearl font-medium' : 'text-brand-pearl/70'}>
                  {guest.name}{isMe ? ' (ты)' : ''}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
