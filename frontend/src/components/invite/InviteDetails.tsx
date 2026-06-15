'use client'

import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Calendar, Info } from 'lucide-react'

interface Props {
  date: string
  description?: string | null
  show?: 'when' | 'details' | 'both'
  children?: React.ReactNode
}

export function InviteDetails({ date, description, show = 'both', children }: Props) {

  return (
    <section className="relative z-10 px-4 py-20 max-w-2xl mx-auto space-y-10 text-center">
      {show !== 'details' && (
        <div className="space-y-3">
          <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight gradient-text-sweep flex items-center justify-center gap-3">
            <Calendar size={28} className="text-brand-violet shrink-0" />
            Когда
          </h2>
          <p className="text-brand-pearl font-medium text-base sm:text-lg">
            {format(new Date(date), "d MMMM yyyy, EEEE", { locale: ru })}
            <span className="text-brand-pearl/30">, </span>
            {format(new Date(date), "HH:mm")}
          </p>
          {children}
        </div>
      )}

      {show !== 'when' && description && (
        <div className="space-y-3">
          <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight gradient-text-sweep flex items-center justify-center gap-3">
            <Info size={28} className="text-brand-violet shrink-0" />
            Детали
          </h2>
          <p className="text-brand-pearl/80 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
            {description}
          </p>
        </div>
      )}
    </section>
  )
}
