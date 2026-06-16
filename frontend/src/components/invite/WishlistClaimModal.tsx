'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, UserPlus, Gift, ExternalLink } from 'lucide-react'
import type { WishlistItem } from '@/types'
import { formatPrice } from '@/lib/utils'

interface WishlistClaimModalProps {
  item: WishlistItem | null
  currentGuestId: string
  onClose: () => void
  onClaim: (itemId: string, type: 'Solo' | 'Collective') => void
  onJoinCollective: (claimId: string) => void
  onCancel: (claimId: string) => void
  isClaimPending: boolean
  isJoinPending: boolean
  isCancelPending: boolean
}

export function WishlistClaimModal({
  item,
  currentGuestId,
  onClose,
  onClaim,
  onJoinCollective,
  onCancel,
  isClaimPending,
  isJoinPending,
  isCancelPending,
}: WishlistClaimModalProps) {
  const [modalStep, setModalStep] = useState<'choose' | 'success'>('choose')
  const [successType, setSuccessType] = useState<'claim' | 'join'>('claim')

  // Reset internal state when parent closes the modal
  useEffect(() => {
    if (item === null) setModalStep('choose')
  }, [item])

  const handleClose = () => {
    setModalStep('choose')
    onClose()
  }

  if (!item) return null

  const isMyClaim = item.activeClaim?.claimer.id === currentGuestId
  const isInMyCollective = (item.activeClaim?.participants.some(p => p.id === currentGuestId)) ?? false

  const handleClaim = (type: 'Solo' | 'Collective') => {
    onClaim(item.id, type)
    setSuccessType('claim')
    setModalStep('success')
  }

  const handleJoin = () => {
    if (!item.activeClaim) return
    onJoinCollective(item.activeClaim.id)
    setSuccessType('join')
    setModalStep('success')
  }

  const handleCancel = () => {
    if (!item.activeClaim) return
    onCancel(item.activeClaim.id)
    handleClose()
  }

  return (
    <AnimatePresence>
      {item && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
            onClick={modalStep === 'success' ? undefined : handleClose}
          />

          {/* Modal */}
          <div
            key="modal-wrapper"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="w-full max-w-md pointer-events-auto"
            >
              <div className="liquid-glass p-6 shadow-2xl relative">
                {/* Close button */}
                <button
            onClick={handleClose}
                  className="absolute top-4 right-4 text-brand-pearl/40 hover:text-brand-pearl transition-colors z-10"
                >
                  <X size={18} />
                </button>

                {/* Header: photo + name + price */}
                <div className="flex gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-brand-deep shrink-0">
                    {item.photoUrl ? (
                      <img
                        src={item.photoUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Gift size={24} className="text-brand-pearl/20" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-brand-pearl font-medium">{item.name}</p>
                    {item.price != null && (
                      <p className="gradient-text-gold font-bold text-lg">
                        {formatPrice(item.price, item.currency)}
                      </p>
                    )}
                    {item.sourceUrl && (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-brand-pearl/50 hover:text-brand-violet transition-colors mt-1"
                        onClick={e => e.stopPropagation()}
                      >
                        <ExternalLink size={12} />
                        Открыть на сайте
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions area — 7 CTA matrix states */}
                <div className="space-y-3">
                  {/* State 1: Available — two buttons */}
                  {item.status === 'Available' && (
                    <>
                      <p className="text-brand-pearl/60 text-sm text-center">Как хочешь подарить?</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleClaim('Solo')}
                          disabled={isClaimPending}
                          className="flex flex-col items-center gap-2 p-4 rounded-xl
                                     border border-brand-pearl/10 hover:border-brand-violet/40
                                     hover:bg-brand-violet/10 transition-all disabled:opacity-50"
                        >
                          <span className="text-2xl">🎁</span>
                          <span className="text-brand-pearl text-sm font-medium">Куплю</span>
                          <span className="text-brand-pearl/40 text-xs text-center">Только от тебя</span>
                        </button>
                        <button
                          onClick={() => handleClaim('Collective')}
                          disabled={isClaimPending}
                          className="flex flex-col items-center gap-2 p-4 rounded-xl
                                     border border-brand-pearl/10 hover:border-brand-champagne/40
                                     hover:bg-brand-champagne/5 transition-all disabled:opacity-50"
                        >
                          <span className="text-2xl">🤝</span>
                          <span className="text-brand-pearl text-sm font-medium">Открыть сбор</span>
                          <span className="text-brand-pearl/40 text-xs text-center">Другие могут скинуться</span>
                        </button>
                      </div>
                    </>
                  )}

                  {/* State 2: Collective, not in it — join button */}
                  {item.status === 'Collective' && !isMyClaim && !isInMyCollective && (
                    <>
                      <p className="text-brand-pearl/60 text-sm text-center">Групповой сбор</p>
                      {item.activeClaim && (
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <span className="text-xs text-brand-pearl/50">Начал:</span>
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-admin-surface border border-brand-pearl/10">
                            {item.activeClaim.claimer.emoji}
                          </span>
                          <span className="text-xs text-brand-pearl/60">{item.activeClaim.claimer.name}</span>
                        </div>
                      )}
                      <button
                        onClick={handleJoin}
                        disabled={isJoinPending}
                        className="w-full py-3 rounded-xl bg-info/20 border border-info/30
                                   text-info font-semibold hover:bg-info/30 transition-all
                                   disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <UserPlus size={16} />
                        {isJoinPending ? 'Присоединяемся...' : 'Присоединиться к сбору'}
                      </button>
                    </>
                  )}

                  {/* State 3 & 4: My claim (Solo or Collective-owner) — cancel button */}
                  {isMyClaim && (
                    <>
                      <p className="text-brand-pearl/60 text-sm text-center">Этот подарок выбран тобой</p>
                      <button
                        onClick={handleCancel}
                        disabled={isCancelPending}
                        className="w-full py-3 rounded-xl border border-danger/20 text-danger
                                   hover:bg-danger/10 transition-all disabled:opacity-50 text-sm"
                      >
                        {isCancelPending ? '...' : 'Отменить выбор'}
                      </button>
                    </>
                  )}

                  {/* State 5: In collective, not the creator — participant list + leave button */}
                  {isInMyCollective && !isMyClaim && (
                    <>
                      <p className="text-info text-sm text-center font-medium">Ты в сборе!</p>
                      {item.activeClaim && item.activeClaim.participants.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-brand-pearl/50 text-center">Участники:</p>
                          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
                            {item.activeClaim.participants.map((p) => (
                              <span key={p.id} className="flex items-center gap-1.5 text-xs text-brand-pearl/70">
                                <span className="text-sm">{p.emoji}</span>
                                <span>{p.name}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <button
                        onClick={handleCancel}
                        disabled={isCancelPending}
                        className="w-full py-3 rounded-xl border border-danger/20 text-danger
                                   hover:bg-danger/10 transition-all text-sm"
                      >
                        {isCancelPending ? '...' : 'Выйти из сбора'}
                      </button>
                    </>
                  )}

                  {/* State 6: Reserved by someone else — info text */}
                  {item.status === 'Reserved' && !isMyClaim && (
                    <p className="text-brand-pearl/40 text-sm text-center py-2">
                      Этот подарок уже выбран другим гостем
                    </p>
                  )}

                  {/* State 7: Purchased — info text */}
                  {item.status === 'Purchased' && (
                    <p className="text-brand-pearl/40 text-sm text-center py-2">
                      Этот подарок уже куплен 🎉
                    </p>
                  )}
                </div>

                {/* Success step: claim (Solo or Collective) */}
                {modalStep === 'success' && successType === 'claim' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-4"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.1, damping: 12 }}
                      className="w-16 h-16 rounded-full bg-success/20 border border-success/30
                                 flex items-center justify-center mx-auto mb-4"
                    >
                      <Check size={28} className="text-success" />
                    </motion.div>
                    <p className="text-brand-pearl font-semibold text-lg">Отлично!</p>
                    <p className="text-brand-pearl/60 text-sm mt-1">Подарок выбран</p>
                    <button
                      onClick={handleClose}
                      className="mt-6 w-full py-3 rounded-xl bg-brand-violet hover:bg-brand-purple text-white font-semibold text-sm transition-colors duration-200"
                    >
                      Понятно
                    </button>
                  </motion.div>
                )}

                {/* Success step: join collective */}
                {modalStep === 'success' && successType === 'join' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-4"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.1, damping: 12 }}
                      className="w-16 h-16 rounded-full bg-info/20 border border-info/30
                                 flex items-center justify-center mx-auto mb-4"
                    >
                      <Check size={28} className="text-info" />
                    </motion.div>
                    <p className="text-brand-pearl font-semibold text-lg">Ты в сборе!</p>
                    <p className="text-brand-pearl/60 text-sm mt-1 mb-4">
                      Вы участвуете в групповом сборе на этот подарок
                    </p>

                    {/* Participants list in success view */}
                    {item.activeClaim && item.activeClaim.participants.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-brand-pearl/40 mb-2">Участники сбора:</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {item.activeClaim.participants.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full
                                         bg-brand-deep border border-brand-pearl/5"
                            >
                              <span className="text-sm">{p.emoji}</span>
                              <span className="text-xs text-brand-pearl/70">{p.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={handleClose}
                      className="mt-6 w-full py-3 rounded-xl bg-brand-violet hover:bg-brand-purple text-white font-semibold text-sm transition-colors duration-200"
                    >
                      Понятно
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
