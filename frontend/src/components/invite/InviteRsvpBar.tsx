'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { guestsApi } from '@/lib/api'
import { GuestSelf, RsvpStatus } from '@/types'
import { useContactStore } from '@/lib/stores/contactStore'

import { MessageCircle } from 'lucide-react'
import { ContactSharingModal } from './ContactSharingModal'
import confetti from 'canvas-confetti'

interface Props {
  guest: GuestSelf
  eventId: string
  chatOpen?: boolean
  onChatToggle?: () => void
}

export function InviteRsvpBar({ guest, eventId, onChatToggle }: Props) {
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<RsvpStatus | null>(null)
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [showContactPrompt, setShowContactPrompt] = useState(false)
  const contactPromptDismissed = useRef(false)
  const isFormal = guest.guestCount > 1
  const contactStore = useContactStore()

  const rsvpMutation = useMutation({
    mutationFn: (status: RsvpStatus) =>
      guestsApi.updateRsvp(guest.token, status, note || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invite', guest.token] })
      const tid = toast.success(
        pendingStatus === 'Attending'
          ? (isFormal ? 'Отлично, ждём вас! 🎉' : 'Отлично, ждём тебя! 🎉')
          : (isFormal ? 'Жаль, что не придёте 😔' : 'Понял, жаль что не придёшь 😔'),
        { duration: 2500 }
      )
      // Force-dismiss after duration to handle StrictMode/re-render edge cases
      setTimeout(() => toast.dismiss(tid), 2600)
      // Confetti burst on Attending
      if (pendingStatus === 'Attending') {
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
      // Show contact sharing prompt after Attending RSVP
      if (pendingStatus === 'Attending' && !contactPromptDismissed.current) {
        // Small delay so toast appears first
        setTimeout(() => setShowContactPrompt(true), 800)
      }
    },
    onError: () => toast.error('Не удалось сохранить ответ'),
  })

  const handleContactPromptAccept = () => {
    setShowContactPrompt(false)
    setContactModalOpen(true)
  }

  const handleContactPromptDismiss = () => {
    setShowContactPrompt(false)
    contactPromptDismissed.current = true
  }

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
        className="fixed bottom-0 inset-x-0 z-50 flex justify-center px-4 pb-3"
      >
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="liquid-glass px-5 py-3 flex items-center gap-4 shadow-2xl w-full sm:max-w-sm">
            <p className="text-brand-pearl/80 text-sm font-medium whitespace-nowrap">
              {isFormal ? 'Вы придёте?' : 'Ты придёшь?'}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRsvp('Attending')}
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
                onClick={() => handleRsvp('NotAttending')}
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

      {/* Contact sharing prompt banner */}
      <AnimatePresence>
        {showContactPrompt && (
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="fixed bottom-[76px] inset-x-0 z-40 flex justify-center px-4 pointer-events-none"
          >
            <div className="liquid-glass px-4 py-3 pointer-events-auto shadow-2xl max-w-sm w-full">
              <p className="text-brand-pearl/80 text-sm font-medium mb-3">
                Хочешь поделиться контактом с другими гостями?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleContactPromptDismiss}
                  className="flex-1 py-2 rounded-lg border border-brand-pearl/10 text-brand-pearl/50
                             text-xs hover:text-brand-pearl/70 transition-colors"
                >
                  Нет, спасибо
                </button>
                <button
                  onClick={handleContactPromptAccept}
                  className="flex-1 py-2 rounded-lg bg-brand-violet/20 border border-brand-violet/30
                             text-brand-violet text-xs font-medium hover:bg-brand-violet/30
                             transition-all"
                >
                  Да, конечно
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Contact sharing modal */}
      <ContactSharingModal
        open={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        guestToken={guest.token}
      />
    </>
  )
}
