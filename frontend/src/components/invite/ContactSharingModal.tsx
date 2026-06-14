'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, MessageCircle, X, Check, Save } from 'lucide-react'
import * as Switch from '@radix-ui/react-switch'
import toast from 'react-hot-toast'
import { useContactStore } from '@/lib/stores/contactStore'

interface Props {
  open: boolean
  onClose: () => void
  guestToken: string
}

export function ContactSharingModal({ open, onClose, guestToken }: Props) {
  const store = useContactStore()
  const [telegram, setTelegram] = useState(store.myTelegram)
  const [phone, setPhone] = useState(store.myPhone)
  const [isShared, setIsShared] = useState(store.isShared)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setTelegram(store.myTelegram)
      setPhone(store.myPhone)
      setIsShared(store.isShared)
    }
  }, [open, store.myTelegram, store.myPhone, store.isShared])

  const handleSave = async () => {
    setSaving(true)
    try {
      await store.updateMyContact(guestToken, telegram, phone)
      await store.toggleShare(guestToken, isShared)
      toast.success('Контакты сохранены')
      onClose()
    } catch {
      toast.error('Не удалось сохранить контакты')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm pointer-events-auto"
            >
              <div className="liquid-glass p-5 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-brand-pearl font-semibold text-lg">
                    Поделиться контактом
                  </h3>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-brand-pearl/40 hover:text-brand-pearl/70 hover:bg-brand-pearl/5 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Telegram input */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-brand-pearl/60 text-xs font-medium mb-1.5">
                    <MessageCircle size={14} />
                    Telegram
                  </label>
                  <input
                    type="text"
                    value={telegram}
                    onChange={e => setTelegram(e.target.value)}
                    placeholder="@username"
                    className="w-full bg-brand-deep border border-brand-pearl/10 rounded-xl px-3 py-2.5
                               text-brand-pearl/80 text-sm outline-none placeholder:text-brand-pearl/30
                               focus:border-brand-violet/40 transition-colors"
                  />
                </div>

                {/* Phone input */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-brand-pearl/60 text-xs font-medium mb-1.5">
                    <Phone size={14} />
                    Телефон
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+7 (999) 123-45-67"
                    className="w-full bg-brand-deep border border-brand-pearl/10 rounded-xl px-3 py-2.5
                               text-brand-pearl/80 text-sm outline-none placeholder:text-brand-pearl/30
                               focus:border-brand-violet/40 transition-colors"
                  />
                </div>

                {/* Share toggle */}
                <div className="flex items-center justify-between py-3 px-3 rounded-xl bg-brand-pearl/[0.03] border border-brand-pearl/5 mb-5">
                  <span className="text-brand-pearl/70 text-sm">Показывать другим гостям</span>
                  <Switch.Root
                    checked={isShared}
                    onCheckedChange={setIsShared}
                    className="w-10 h-6 rounded-full bg-brand-pearl/10 data-[state=checked]:bg-success/40
                               relative outline-none transition-colors cursor-pointer"
                  >
                    <Switch.Thumb
                      className="block w-4 h-4 bg-brand-pearl/60 rounded-full transition-transform
                                 translate-x-1 data-[state=checked]:translate-x-[22px]
                                 data-[state=checked]:bg-success"
                    />
                  </Switch.Root>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl border border-brand-pearl/10 text-brand-pearl/60
                               text-sm hover:text-brand-pearl transition-colors"
                  >
                    Пропустить
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-brand-violet/20 border border-brand-violet/30
                               text-brand-violet font-medium text-sm hover:bg-brand-violet/30
                               transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {saving ? (
                      <span className="w-4 h-4 rounded-full border-2 border-brand-violet/30 border-t-brand-violet animate-spin" />
                    ) : (
                      <>
                        <Save size={14} />
                        Сохранить
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
