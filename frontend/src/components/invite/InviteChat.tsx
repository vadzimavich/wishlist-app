'use client'

import { useState, useRef, useEffect, useCallback, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Pencil, Trash2, Loader2, ChevronLeft, Phone } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useChatRealtime } from '@/hooks/useChatRealtime'
import { ContactSharingModal } from './ContactSharingModal'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
  eventId: string
  guestToken: string
  currentGuestId: string
  isOpen: boolean
  onClose: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const date = new Date(iso)
  const now = Date.now()
  const diffMs = now - date.getTime()

  // < 5 min → relative (date-fns: "только что", "1 минуту назад", "5 минут назад")
  if (diffMs < 300_000) {
    return formatDistanceToNow(date, { addSuffix: true, locale: ru })
  }

  // Today → show time only
  const isToday =
    date.getFullYear() === new Date(now).getFullYear() &&
    date.getMonth() === new Date(now).getMonth() &&
    date.getDate() === new Date(now).getDate()

  if (isToday) {
    return format(date, 'HH:mm', { locale: ru })
  }

  // This year → show day + month + time
  if (date.getFullYear() === new Date(now).getFullYear()) {
    return format(date, 'd MMM HH:mm', { locale: ru })
  }

  // Older → full date
  return format(date, 'd MMM yyyy HH:mm', { locale: ru })
}

// ─── Component ───────────────────────────────────────────────────────────────

export function InviteChat({ eventId, guestToken, currentGuestId, isOpen, onClose }: Props) {
  const [inputText, setInputText] = useState('')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ messageId: string; x: number; y: number } | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [contactModalOpen, setContactModalOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageListRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevMessageCountRef = useRef<number | null>(null)
  const wasOpenRef = useRef(false)

  const {
    sendEventMessage,
    editMessage: editMessageAction,
    deleteMessage: deleteMessageAction,
    messages: currentMessages,
    loading,
  } = useChatRealtime({ eventId, guestToken })

  // ── Lifecycle ────────────────────────────────────────────────────────────

  // Scroll to last message when chat opens (after messages are loaded & DOM ready)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true
      if (currentMessages.length > 0) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
          })
        })
      }
    } else if (!isOpen) {
      wasOpenRef.current = false
      prevMessageCountRef.current = null
    }
  }, [isOpen])

  // Auto-scroll to bottom when NEW messages arrive (not on initial load)
  useEffect(() => {
    if (!isOpen) return
    const count = currentMessages.length
    if (count > 0 && prevMessageCountRef.current !== null && count > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMessageCountRef.current = count
  }, [currentMessages.length, isOpen])

  // Stop wheel events from propagating to the page behind
  const handleWheel = useCallback((e: React.WheelEvent) => {
    const el = messageListRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    const atTop = scrollTop === 0
    const atBottom = scrollTop + clientHeight >= scrollHeight
    if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) return
    e.stopPropagation()
  }, [])

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [contextMenu])

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingMessageId) {
      inputRef.current?.focus()
    }
  }, [editingMessageId])

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const text = inputText.trim()
    if (!text || sending) return

    setSending(true)
    try {
      if (editingMessageId) {
        await editMessageAction(editingMessageId, text)
        setEditingMessageId(null)
      } else {
        await sendEventMessage(text)
      }
      setInputText('')
    } catch {
      // Silently fail — message will appear when store updates via SignalR
    } finally {
      setSending(false)
    }
  }, [inputText, sending, editingMessageId, sendEventMessage, editMessageAction])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape' && editingMessageId) {
      cancelEdit()
    }
  }, [handleSend, editingMessageId])

  const startEdit = useCallback((messageId: string, currentText: string) => {
    setEditingMessageId(messageId)
    setInputText(currentText)
    setContextMenu(null)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingMessageId(null)
    setInputText('')
  }, [])

  const handleDelete = useCallback(async (messageId: string) => {
    setDeleteConfirmId(messageId)
    setContextMenu(null)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmId) return
    try {
      await deleteMessageAction(deleteConfirmId)
    } catch {
      // Silently fail
    }
    setDeleteConfirmId(null)
  }, [deleteConfirmId, deleteMessageAction])

  // ── Long press handlers ──────────────────────────────────────────────────

  const handleTouchStart = useCallback((messageId: string, isOwn: boolean, e: React.TouchEvent) => {
    if (!isOwn) return
    longPressTimer.current = setTimeout(() => {
      const touch = e.touches[0]
      setContextMenu({ messageId, x: touch.clientX, y: touch.clientY })
    }, 500)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleContextMenuEvent = useCallback((messageId: string, isOwn: boolean, e: React.MouseEvent) => {
    e.preventDefault()
    if (!isOwn) return
    setContextMenu({ messageId, x: e.clientX, y: e.clientY })
  }, [])

  // ── Derived state ────────────────────────────────────────────────────────

  const isEditing = editingMessageId !== null
  const isOwnMessage = (guestId: string) => guestId === currentGuestId

  // ── Render: Chat Panel Content (shared between desktop & mobile) ─────────

  const chatPanelContent = (
    <div className="flex flex-col h-full liquid-glass shadow-2xl overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-3 border-b border-brand-pearl/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Back arrow on mobile */}
          <button
            onClick={() => onClose()}
            className="md:hidden text-brand-pearl/40 hover:text-brand-pearl transition-colors p-1 -ml-1"
            aria-label="Свернуть чат"
          >
            <ChevronLeft size={20} />
          </button>
          <h3 className="text-brand-pearl font-semibold truncate">
            Чат события
          </h3>
        </div>
        {/* Share contact button */}
        <button
          onClick={() => setContactModalOpen(true)}
          className="p-1.5 rounded-lg text-brand-pearl/30 hover:text-brand-violet/70 hover:bg-brand-pearl/5
                     transition-all"
          title="Поделиться контактом"
        >
          <Phone size={15} />
        </button>
        {/* Close button (desktop) */}
        <button
          onClick={() => onClose()}
          className="hidden md:flex text-brand-pearl/40 hover:text-brand-pearl transition-colors p-1 -mr-1"
          aria-label="Закрыть чат"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Messages list ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <div
          ref={messageListRef}
          onWheel={handleWheel}
          className="h-full overflow-y-auto px-3 py-3 space-y-3"
          style={{ overscrollBehavior: 'contain' }}
        >
          {/* Loading state */}
          {loading && currentMessages.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="text-brand-pearl/30 animate-spin" />
            </div>
          )}

          {/* Empty state */}
          {!loading && currentMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-12 h-12 rounded-full bg-brand-pearl/5 flex items-center justify-center mb-4">
                <MessageCircle size={20} className="text-brand-pearl/20" />
              </div>
              <p className="text-brand-pearl/30 text-sm">
                Пока нет сообщений. Напишите первыми!
              </p>
            </div>
          )}

          {/* Messages */}
          {currentMessages.map((msg) => {
            const isOwn = isOwnMessage(msg.guestId)
            const isBeingDeleted = deleteConfirmId === msg.id

            return (
              <Fragment key={msg.id}>
                <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div
                    onContextMenu={(e) => handleContextMenuEvent(msg.id, isOwn, e)}
                    onTouchStart={(e) => handleTouchStart(msg.id, isOwn, e)}
                    onTouchEnd={handleTouchEnd}
                    className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-3.5 py-2.5
                                ${isOwn
                                  ? 'bg-brand-violet/15 border border-brand-violet/20 rounded-br-md'
                                  : 'bg-brand-pearl/5 border border-brand-pearl/10 rounded-bl-md'
                                }`}
                  >
                    {/* Guest name + emoji */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm leading-none">{msg.guestEmoji || '🙂'}</span>
                      <span className={`text-xs font-medium ${isOwn ? 'text-brand-violet' : 'text-brand-pearl/60'}`}>
                        {isOwn ? 'Вы' : msg.guestName}
                      </span>
                    </div>

                    {/* Message text */}
                    <p className="text-brand-pearl/90 text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.text}
                    </p>

                    {/* Footer: timestamp + edited badge + actions */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-brand-pearl/30">
                        {formatTime(msg.createdAt)}
                      </span>
                      {msg.editedAt && (
                        <span className="text-[10px] italic text-brand-pearl/20">
                          изменено
                        </span>
                      )}
                      {isOwn && (
                        <div className="flex items-center gap-1 ml-auto">
                          <button
                            onClick={(e) => { e.stopPropagation(); startEdit(msg.id, msg.text); }}
                            className="p-1 rounded text-brand-pearl/30 hover:text-brand-champagne/80 hover:bg-brand-pearl/5 transition-all"
                            title="Редактировать"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}
                            className="p-1 rounded text-brand-pearl/30 hover:text-danger/80 hover:bg-danger/5 transition-all"
                            title="Удалить"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delete confirmation — appears right after the deleted message */}
                {isBeingDeleted && (
                  <div className="liquid-glass p-3 flex items-center justify-between gap-3">
                    <p className="text-sm text-brand-pearl/70">Удалить сообщение?</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-3 py-1 rounded-lg text-xs text-brand-pearl/50 hover:text-brand-pearl transition-colors"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={confirmDelete}
                        className="px-3 py-1 rounded-lg text-xs bg-danger/20 border border-danger/30 
                                   text-danger hover:bg-danger/30 transition-all"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                )}
              </Fragment>
            )
          })}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Input bar ─────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-brand-pearl/5 p-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isEditing
                  ? 'Редактирование...'
                  : 'Написать сообщение...'
              }
              className="w-full bg-brand-deep border border-brand-pearl/10 rounded-xl py-2.5 px-3.5
                         text-brand-pearl/90 text-sm outline-none placeholder:text-brand-pearl/25
                         focus:border-brand-violet/40 transition-colors"
            />
            {/* Edit indicator */}
            {isEditing && (
              <span className="absolute left-3.5 -top-2.5 text-[10px] text-brand-champagne/60 bg-brand-deep px-1.5">
                Редактирование
              </span>
            )}
          </div>

          {isEditing ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={cancelEdit}
                className="px-3 py-2.5 rounded-xl text-xs text-brand-pearl/50 hover:text-brand-pearl 
                           transition-colors border border-brand-pearl/10"
              >
                Отмена
              </button>
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || sending}
                className="px-3 py-2.5 rounded-xl bg-brand-champagne/20 border border-brand-champagne/30
                           text-brand-champagne hover:bg-brand-champagne/30 transition-all
                           disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
              >
                {sending ? '...' : 'Сохранить'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || sending}
              className="w-10 h-10 rounded-xl flex items-center justify-center
                         bg-brand-violet/20 border border-brand-violet/30 text-brand-violet
                         hover:bg-brand-violet/30 transition-all
                         disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              {sending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════
          EXPANDED PANEL
         ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* ── Backdrop ──────────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => onClose()}
            />

            {/* ── Desktop: centered modal ──────────────────────────────── */}
            <div className="fixed inset-0 z-[60] hidden md:flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                className="w-full max-w-md pointer-events-auto h-[80vh]"
              >
                {chatPanelContent}
              </motion.div>
            </div>

            {/* ── Mobile: bottom sheet ──────────────────────────────────── */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-[60] md:hidden
                         max-h-[85vh] h-[85vh]"
            >
              {chatPanelContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Context menu (edit/delete) ─────────────────────────────────── */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70]"
              onClick={() => setContextMenu(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                position: 'fixed',
                left: Math.min(contextMenu.x, window.innerWidth - 180),
                top: Math.min(contextMenu.y, window.innerHeight - 120),
              }}
              className="z-[80] liquid-glass py-1.5 min-w-[160px] shadow-2xl"
            >
              <button
                onClick={() => {
                  const msg = currentMessages.find(m => m.id === contextMenu.messageId)
                  if (msg) startEdit(msg.id, msg.text)
                }}
                className="w-full px-4 py-2 text-sm text-brand-pearl/80 hover:text-brand-pearl
                           hover:bg-brand-pearl/5 flex items-center gap-2.5 transition-colors text-left"
              >
                <Pencil size={14} className="text-brand-pearl/40" />
                Редактировать
              </button>
              <button
                onClick={() => handleDelete(contextMenu.messageId)}
                className="w-full px-4 py-2 text-sm text-danger/80 hover:text-danger
                           hover:bg-danger/5 flex items-center gap-2.5 transition-colors text-left"
              >
                <Trash2 size={14} className="text-danger/50" />
                Удалить
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ContactSharingModal
        open={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        guestToken={guestToken}
      />
    </>
  )
}
