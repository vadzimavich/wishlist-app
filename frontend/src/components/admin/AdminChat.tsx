'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Trash2, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useAdminChatRealtime } from '@/hooks/useAdminChatRealtime'

interface Props {
  eventId: string
  eventTitle: string
  isOpen: boolean
  onClose: () => void
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  const now = Date.now()
  const diffMs = now - date.getTime()

  if (diffMs < 300_000) {
    const secs = Math.floor(diffMs / 1000)
    if (secs < 60) return 'только что'
    const mins = Math.floor(secs / 60)
    return `${mins} мин. назад`
  }

  const isToday =
    date.getFullYear() === new Date(now).getFullYear() &&
    date.getMonth() === new Date(now).getMonth() &&
    date.getDate() === new Date(now).getDate()

  if (isToday) return format(date, 'HH:mm', { locale: ru })
  if (date.getFullYear() === new Date(now).getFullYear()) return format(date, 'd MMM HH:mm', { locale: ru })
  return format(date, 'd MMM yyyy HH:mm', { locale: ru })
}

export function AdminChat({ eventId, eventTitle, isOpen, onClose }: Props) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageListRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevMessageCountRef = useRef(0)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    setAccessToken(localStorage.getItem('accessToken'))
  }, [])

  const {
    sendEventMessage,
    hostDeleteMessage,
    messages,
    loadMore,
    hasMore,
    loading,
  } = useAdminChatRealtime({ eventId, accessToken: accessToken ?? null })

  // Auto-scroll to bottom on NEW messages only (not on initial load)
  useEffect(() => {
    const count = messages.length
    if (count > 0 && count > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMessageCountRef.current = count
  }, [messages.length])

  // Scroll to last message when chat opens (after messages are loaded)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true
      // Use rAF + scrollTop to ensure DOM is painted
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
        })
      })
      setTimeout(() => inputRef.current?.focus(), 400)
    } else if (!isOpen) {
      wasOpenRef.current = false
    }
  }, [isOpen])

  // Stop wheel events from propagating to the page behind
  const handleWheel = useCallback((e: React.WheelEvent) => {
    const el = messageListRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    const atTop = scrollTop === 0
    const atBottom = scrollTop + clientHeight >= scrollHeight
    // If scrolling up at the top OR down at the bottom, let native scroll handle it (won't propagate)
    if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) return
    e.stopPropagation()
  }, [])

  const handleSend = useCallback(async () => {
    const text = inputText.trim()
    if (!text || sending) return
    setSending(true)
    try {
      await sendEventMessage(text)
      setInputText('')
    } catch {
      // Silently fail
    } finally {
      setSending(false)
    }
  }, [inputText, sending, sendEventMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm
                       bg-admin-surface border-l border-admin-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-admin-border shrink-0">
              <div className="min-w-0">
                <h2 className="font-semibold text-admin-text text-sm">Чат события</h2>
                <p className="text-xs text-admin-muted truncate mt-0.5">{eventTitle}</p>
              </div>
              <button onClick={onClose} className="text-admin-muted hover:text-admin-text ml-3 shrink-0">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={messageListRef}
              onWheel={handleWheel}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
              style={{ overscrollBehavior: 'contain' }}
            >
              {loading && messages.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-admin-muted" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-admin-muted text-sm">Пока нет сообщений</p>
                </div>
              ) : (
                <>
                  {hasMore && (
                    <button
                      onClick={loadMore}
                      className="w-full text-xs text-admin-muted hover:text-brand-violet py-2 transition-colors"
                    >
                      Загрузить ещё
                    </button>
                  )}

                  {messages.map((msg) => {
                    const isDeleted = msg.isDeleted
                    return (
                      <div key={msg.id} className="group">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-brand-purple/20 flex items-center justify-center text-xs shrink-0 mt-0.5">
                            {msg.guestEmoji || '🙂'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-medium text-admin-text truncate">
                                {msg.guestName}
                              </span>
                              <span className="text-[10px] text-admin-muted shrink-0">
                                {formatTime(msg.createdAt)}
                              </span>
                            </div>

                            {isDeleted ? (
                              <p className="text-xs text-admin-muted italic">Сообщение удалено</p>
                            ) : (
                              <p className="text-sm text-admin-text/90 break-words whitespace-pre-wrap">
                                {msg.text}
                                {msg.editedAt && (
                                  <span className="text-[10px] text-admin-muted ml-1">(ред.)</span>
                                )}
                              </p>
                            )}
                          </div>

                          {/* Host delete button */}
                          {!isDeleted && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-1">
                              {deleteConfirmId === msg.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      hostDeleteMessage(msg.id)
                                      setDeleteConfirmId(null)
                                    }}
                                    className="text-xs text-danger hover:underline"
                                  >
                                    Удалить
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="text-xs text-admin-muted hover:underline"
                                  >
                                    Нет
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmId(msg.id)}
                                  title="Удалить сообщение"
                                  className="text-admin-muted hover:text-danger transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-admin-border shrink-0">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Написать сообщение..."
                  className="flex-1 bg-admin-elevated border border-admin-border rounded-xl px-3 py-2
                             text-sm text-admin-text outline-none placeholder:text-admin-muted
                             focus:border-brand-violet/40 transition-colors"
                  maxLength={1000}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || sending}
                  className="w-9 h-9 rounded-xl bg-brand-purple hover:bg-brand-violet
                             text-white flex items-center justify-center shrink-0
                             transition-all disabled:opacity-40 active:scale-95"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
