'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Clock } from 'lucide-react'

interface Props {
  date: string
  description: string | null
}

export function InviteDetails({ date, description }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const initGsap = async () => {
      const { gsap } = await import('gsap')
      const { ScrollTrigger } = await import('gsap/ScrollTrigger')
      gsap.registerPlugin(ScrollTrigger)

      if (ref.current) {
        gsap.fromTo(
          ref.current.querySelectorAll('.detail-card'),
          { y: 40, opacity: 0 },
          {
            y: 0, opacity: 1,
            stagger: 0.15,
            duration: 0.7,
            ease: 'power2.out',
            scrollTrigger: { trigger: ref.current, start: 'top 80%' },
          }
        )
      }
    }
    initGsap()
  }, [])

  if (!description) return null

  return (
    <section ref={ref} className="relative z-10 px-4 py-16 max-w-2xl mx-auto">
      <div className="space-y-3">
        <div className="detail-card liquid-glass p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-violet/10 border border-brand-violet/20
                          flex items-center justify-center shrink-0">
            <Clock size={18} className="text-brand-violet" />
          </div>
          <div>
            <p className="text-brand-pearl/40 text-xs uppercase tracking-wider mb-1">Когда</p>
            <p className="text-brand-pearl font-medium">
              {format(new Date(date), "d MMMM yyyy, EEEE", { locale: ru })}
            </p>
            <p className="text-brand-pearl/60 text-sm mt-0.5">
              {format(new Date(date), "HH:mm")}
            </p>
          </div>
        </div>

        {description && (
          <div className="detail-card liquid-glass p-5">
            <p className="text-brand-pearl/40 text-xs uppercase tracking-wider mb-2">Детали</p>
            <p className="text-brand-pearl/80 text-sm leading-relaxed whitespace-pre-wrap">
              {description}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
