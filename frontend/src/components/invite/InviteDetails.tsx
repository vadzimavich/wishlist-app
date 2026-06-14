'use client'

import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Props {
  date: string
  description: string | null
}

export function InviteDetails({ date, description }: Props) {

  return (
    <section className="relative z-10 px-4 py-16 max-w-2xl mx-auto space-y-8">
      <div className="space-y-2">
        <h2 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight gradient-text-sweep">Когда</h2>
        <p className="text-brand-pearl font-medium text-lg">
          {format(new Date(date), "d MMMM yyyy, EEEE", { locale: ru })}
        </p>
        <p className="text-brand-pearl/60 text-sm">
          {format(new Date(date), "HH:mm")}
        </p>
      </div>

      {description && (
        <div className="space-y-2">
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight gradient-text-sweep">Детали</h2>
          <p className="text-brand-pearl/80 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
            {description}
          </p>
        </div>
      )}
    </section>
  )
}
