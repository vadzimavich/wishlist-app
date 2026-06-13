'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { guestsApi } from '@/lib/api'
import { GuestSelf, RsvpStatus } from '@/types'

interface Props {
  guest: GuestSelf
  eventId: string
}

export function InviteRsvpBar({ guest, eventId }: Props) {
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<RsvpStatus | null>(null)
  const isFormal = guest.guestCount > 1

  const rsvpMutation = useMutation({
    mutationFn: (status: RsvpStatus) =>
      guestsApi.updateRsvp(guest.token, status, note || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invite', guest.token] })
      toast.success(
        pendingStatus === 'Attending'
          ? (isFormal ? 'Отлично, ждём вас! 🎉' : 'Отлично, ждём тебя! 🎉')
          : (isFormal ? 'Жаль, что не придёте 😔' : 'Понял, жаль что не придёшь 😔')
      )
    },
    onError: () => toast.error('Не удалось сохранить ответ'),
  })

  const handleRsvp = (status: RsvpStatus) => {
    setPendingStatus(status)
    if (status === 'Attending') {
      rsvpMutation.mutate(status)
    } else {
      setExpanded(true)
    }
  }

  const confirmDecline = () => {
    rsvpMutation.mutate('NotAttending')
    setExpanded(false)
  }

  return (
    <>
      {/* Sticky bar */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', damping: 20 }}
        className="fixed bottom-0 inset-x-0 z-50 flex justify-center px-4 pb-3 pointer-events-none"
      >
        <div className="liquid-glass px-5 py-3 flex items-center gap-4 pointer-events-auto
                        shadow-2xl max-w-sm w-full">
          <p className="text-brand-pearl/80 text-sm font-medium flex-1">
            {isFormal ? 'Вы придёте?' : 'Ты придёшь?'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRsvp('Attending')}
              disabled={rsvpMutation.isPending}
              className="px-4 py-1.5 rounded-lg bg-success/20 border border-success/30 text-success
                         text-sm font-medium hover:bg-success/30 transition-all disabled:opacity-50
                         active:scale-95"
            >
              Да 🎉
            </button>
            <button
              onClick={() => handleRsvp('NotAttending')}
              disabled={rsvpMutation.isPending}
              className="px-4 py-1.5 rounded-lg bg-brand-pearl/5 border border-brand-pearl/10
                         text-brand-pearl/60 text-sm hover:bg-brand-pearl/10 transition-all
                         disabled:opacity-50 active:scale-95"
            >
              Нет
            </button>
          </div>
        </div>
      </motion.div>

      {/* Decline note modal */}
      <AnimatePresence>
        {expanded && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setExpanded(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25 }}
                className="w-full max-w-sm pointer-events-auto"
              >
                <div className="liquid-glass p-5 shadow-2xl">
                  <p className="text-brand-pearl font-medium mb-3">{isFormal ? 'Жаль, что не придёте 😔' : 'Жаль, что не придёшь 😔'}</p>
                  <textarea
                    className="w-full bg-brand-deep border border-brand-pearl/10 rounded-xl p-3
                               text-brand-pearl/80 text-sm resize-none outline-none placeholder:text-brand-pearl/30
                               focus:border-brand-violet/40 transition-colors"
                    rows={3}
                    placeholder="Можешь оставить сообщение (необязательно)..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => setExpanded(false)}
                      className="flex-1 py-2.5 rounded-xl border border-brand-pearl/10 text-brand-pearl/60
                                 text-sm hover:text-brand-pearl transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={confirmDecline}
                      disabled={rsvpMutation.isPending}
                      className="flex-1 py-2.5 rounded-xl bg-brand-pearl/10 text-brand-pearl font-medium
                                 text-sm hover:bg-brand-pearl/20 transition-all disabled:opacity-50"
                    >
                      {rsvpMutation.isPending ? '...' : 'Подтвердить'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
