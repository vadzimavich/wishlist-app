'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { guestsApi } from '@/lib/api'
import { GuestSelf, RsvpStatus } from '@/types'

import { MessageCircle } from 'lucide-react'
import confetti from 'canvas-confetti'

interface Props {
  guest: GuestSelf
  eventId: string
  chatOpen?: boolean
  onChatToggle?: () => void
}

export function InviteRsvpBar({ guest, onChatToggle }: Props) {
  const qc = useQueryClient()
  const isFormal = guest.guestCount > 1

  const rsvpMutation = useMutation({
    mutationFn: (status: RsvpStatus) =>
      guestsApi.updateRsvp(guest.token, status, undefined),
    onSuccess: (_data, status) => {
      qc.invalidateQueries({ queryKey: ['invite', guest.token] })
      const tid = toast.success(
        status === 'Attending'
          ? (isFormal ? 'Отлично, ждём вас! 🎉' : 'Отлично, ждём тебя! 🎉')
          : (isFormal ? 'Жаль, что не придёте 😔' : 'Понял, жаль что не придёшь 😔'),
        { duration: 2500 }
      )
      setTimeout(() => toast.dismiss(tid), 2600)
      if (status === 'Attending') {
        const end = Date.now() + 1500
        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors: ['#9B59F5', '#F5D88A', '#22C55E'],
          })
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors: ['#9B59F5', '#F5D88A', '#22C55E'],
          })
          if (Date.now() < end) requestAnimationFrame(frame)
        }
        frame()
      }
    },
    onError: () => toast.error('Не удалось сохранить ответ'),
  })

  return (
    <>
      {/* Sticky bar */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', damping: 20 }}
        className="fixed bottom-0 inset-x-0 z-50 flex justify-center px-4 pb-3"
      >
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="liquid-glass px-5 py-3 flex items-center gap-4 shadow-2xl w-full sm:max-w-sm">
            <p className="text-brand-pearl/80 text-sm font-medium whitespace-nowrap">
              {isFormal ? 'Вы придёте?' : 'Ты придёшь?'}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => rsvpMutation.mutate('Attending')}
                disabled={rsvpMutation.isPending}
                className={`min-w-[64px] px-4 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 active:scale-95 ${
                  guest.rsvpStatus === 'Attending'
                    ? 'bg-success/20 border border-success/30 text-success hover:bg-success/30'
                    : 'bg-brand-pearl/5 border border-brand-pearl/10 text-brand-pearl/60 hover:bg-brand-pearl/10'
                }`}
              >
                Да
              </button>
              <button
                onClick={() => rsvpMutation.mutate('NotAttending')}
                disabled={rsvpMutation.isPending}
                className={`min-w-[64px] px-4 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 active:scale-95 ${
                  guest.rsvpStatus === 'NotAttending'
                    ? 'bg-brand-pearl/20 border border-brand-pearl/30 text-brand-pearl hover:bg-brand-pearl/30'
                    : 'bg-brand-pearl/5 border border-brand-pearl/10 text-brand-pearl/60 hover:bg-brand-pearl/10'
                }`}
              >
                Нет
              </button>
            </div>
          </div>
          <button
            onClick={onChatToggle}
            className="w-12 h-12 rounded-xl bg-brand-violet/20 border border-brand-violet/30 text-brand-violet
                       hover:bg-brand-violet/30 hover:scale-105 active:scale-95 transition-all duration-200
                       flex items-center justify-center shadow-2xl shrink-0"
            aria-label="Чат события"
          >
            <MessageCircle size={22} />
          </button>
        </div>
      </motion.div>


    </>
  )
}
