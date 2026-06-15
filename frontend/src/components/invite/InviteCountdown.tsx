'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  eventDate: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function InviteCountdown({ eventDate }: Props) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number; hours: number; minutes: number; seconds: number
  } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const eventTime = new Date(eventDate).getTime()

    const update = () => {
      const diff = eventTime - Date.now()
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      })
    }

    update()
    const interval = setInterval(update, 1_000)
    return () => clearInterval(interval)
  }, [eventDate])

  if (!mounted || !timeLeft) return null

  const isPast = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0

  if (isPast) {
    return (
      <section className="relative z-10 px-4 py-16 sm:py-20">
        <div className="max-w-lg mx-auto text-center">
          <div className="liquid-glass px-6 py-8 sm:px-10 sm:py-10">
            <p className="text-brand-pearl/50 text-base sm:text-lg">Событие прошло 🎉</p>
          </div>
        </div>
      </section>
    )
  }

  const units = [
    { value: timeLeft.days, label: 'дней' },
    { value: timeLeft.hours, label: 'часов' },
    { value: timeLeft.minutes, label: 'минут' },
    { value: timeLeft.seconds, label: 'секунд' },
  ]

  return (
    <section className="relative z-10 px-4 py-16 sm:py-20">
      <div className="max-w-lg mx-auto text-center space-y-5">
        <p className="text-brand-pearl/40 text-xs sm:text-sm font-medium tracking-widest uppercase">
          Через
        </p>

        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          {units.map(({ value, label }) => (
            <div
              key={label}
              className="liquid-glass px-2 py-4 sm:py-6 flex flex-col items-center gap-1"
            >
              <span className="font-display font-bold text-2xl sm:text-3xl md:text-4xl text-brand-pearl tabular-nums leading-none">
                {pad(value)}
              </span>
              <span className="text-[10px] sm:text-xs text-brand-pearl/35 uppercase tracking-wider">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
