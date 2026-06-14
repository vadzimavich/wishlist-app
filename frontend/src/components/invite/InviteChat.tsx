'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, ArrowLeft, ChevronRight, Pencil, Trash2, Loader2 } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useChatRealtime } from '@/hooks/useChatRealtime'
import { useChatStore } from '@/lib/stores/chatStore'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CollectiveChatInfo {
  claimId: string
  itemName: string
  participantCount: number
}

interface Props {
  eventId: string
  guestToken: string
  currentGuestId: string
  collectives?: CollectiveChatInfo[]
  openToClaimId?: string | null
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

export function InviteChat({ eventId, guestToken, currentGuestId, collectives = [], openToClaimId }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'event' | 'collectives' | 'collective-chat'>('event')
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ messageId: string; x: number; y: number } | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageListRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevMessageCountRef = useRef(0)
  const prevOpenClaimIdRef = useRef<string | null>(null)

  // Determine active claimId for the chat hook
  const currentClaimId = activeTab === 'collective-chat' ? selectedClaimId : undefined

  const {
    sendEventMessage,
    sendCollectiveMessage,
    editMessage: editMessageAction,
    deleteMessage: deleteMessageAction,
    messages: currentMessages,
    loading,
  } = useChatRealtime({ eventId, guestToken, claimId: currentClaimId ?? undefined })

  const loadMessages = useChatStore((s) => s.loadMessages)

  // Load event messages on mount
  useEffect(() => {
    loadMessages(eventId, undefined, 0, 50)
  }, [eventId, loadMessages])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const count = currentMessages.length
    if (count > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMessageCountRef.current = count
  }, [currentMessages.length])

  // Scroll to bottom on first open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
      }, 350)
    }
  }, [isOpen])

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

  // Open chat to a specific collective when triggered externally (from wishlist modal)
  useEffect(() => {
    if (openToClaimId && openToClaimId !== prevOpenClaimIdRef.current) {
      prevOpenClaimIdRef.current = openToClaimId
      setSelectedClaimId(openToClaimId)
      setActiveTab('collective-chat')
      setIsOpen(true)
      loadMessages(eventId, openToClaimId, 0, 50)
    }
  }, [openToClaimId, eventId, loadMessages])

  const handleSend = useCallback(async () => {
    const text = inputText.trim()
    if (!text || sending) return

    setSending(true)
    try {
      if (editingMessageId) {
        await editMessageAction(editingMessageId, text)
        setEditingMessageId(null)
      } else if (activeTab === 'collective-chat' && selectedClaimId) {
        await sendCollectiveMessage(selectedClaimId, text)
      } else {
        await sendEventMessage(text)
      }
      setInputText('')
    } catch {
      // Silently fail — message will appear when store updates via SignalR
    } finally {
      setSending(false)
    }
  }, [inputText, sending, editingMessageId, activeTab, selectedClaimId, sendEventMessage, sendCollectiveMessage, editMessageAction])

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

  const openCollectiveChat = useCallback((claimId: string) => {
    setSelectedClaimId(claimId)
    setActiveTab('collective-chat')
    // Load messages for this collective
    loadMessages(eventId, claimId, 0, 50)
  }, [eventId, loadMessages])

  const backToCollectives = useCallback(() => {
    setSelectedClaimId(null)
    setActiveTab('collectives')
    cancelEdit()
  }, [cancelEdit])

  const switchToEvent = useCallback(() => {
    setActiveTab('event')
    cancelEdit()
  }, [cancelEdit])

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

  const getSelectedCollective = () => {
    if (!selectedClaimId) return null
    return collectives.find(c => c.claimId === selectedClaimId) ?? null
  }

  const selectedCollective = getSelectedCollective()
  const isEditing = editingMessageId !== null
  const isOwnMessage = (guestId: string) => guestId === currentGuestId

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Floating chat bubble ───────────────────────────────────────── */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: 'spring', damping: 18 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full liquid-glass
                   flex items-center justify-center cursor-pointer
                   hover:border-brand-violet/40 hover:-translate-y-1
                   active:scale-95 transition-all duration-300 shadow-2xl"
        aria-label="Открыть чат"
      >
        <MessageCircle size={22} className="text-brand-violet" />
        {/* Unread indicator dot */}
        {currentMessages.length > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger 
                           text-white text-[9px] font-bold flex items-center justify-center
                           shadow-lg">
            {currentMessages.length > 9 ? '9+' : currentMessages.length}
          </span>
        )}
      </motion.button>

      {/* ── Chat panel ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel — mobile: fullscreen drawer, desktop: centered modal */}
            <div className="fixed inset-x-0 bottom-0 z-50 flex items-end md:items-center justify-center pointer-events-none">
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="relative w-full md:max-w-md md:mx-4 pointer-events-auto
                           md:rounded-2xl max-h-[85vh] md:max-h-[70vh] h-[85vh] md:h-auto"
              >
                <div className="flex flex-col h-full liquid-glass shadow-2xl md:rounded-2xl overflow-hidden">
                  {/* ── Header ────────────────────────────────────────── */}
                  <div className="shrink-0 px-4 py-3 border-b border-brand-pearl/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {activeTab === 'collective-chat' ? (
                        <button
                          onClick={backToCollectives}
                          className="text-brand-pearl/50 hover:text-brand-pearl transition-colors p-1 -ml-1"
                          aria-label="Назад к списку сборов"
                        >
                          <ArrowLeft size={18} />
                        </button>
                      ) : null}
                      <h3 className="text-brand-pearl font-semibold truncate">
                        {activeTab === 'event' && 'Чат события'}
                        {activeTab === 'collectives' && 'Мои сборы'}
                        {activeTab === 'collective-chat' && (
                          selectedCollective
                            ? `Чат: ${selectedCollective.itemName}`
                            : 'Чат сбора'
                        )}
                      </h3>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-brand-pearl/40 hover:text-brand-pearl transition-colors p-1 -mr-1"
                      aria-label="Закрыть чат"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* ── Tabs ──────────────────────────────────────────── */}
                  {activeTab !== 'collective-chat' && (
                    <div className="shrink-0 flex border-b border-brand-pearl/5">
                      <button
                        onClick={switchToEvent}
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors relative
                                    ${activeTab === 'event'
                                      ? 'text-brand-violet'
                                      : 'text-brand-pearl/40 hover:text-brand-pearl/70'
                                    }`}
                      >
                        Общий чат
                        {activeTab === 'event' && (
                          <motion.div
                            layoutId="chat-tab-indicator"
                            className="absolute bottom-0 inset-x-4 h-0.5 bg-brand-violet rounded-full"
                          />
                        )}
                      </button>
                      {collectives.length > 0 && (
                        <button
                          onClick={() => setActiveTab('collectives')}
                          className={`flex-1 py-2.5 text-sm font-medium transition-colors relative
                                      ${activeTab === 'collectives'
                                        ? 'text-brand-violet'
                                        : 'text-brand-pearl/40 hover:text-brand-pearl/70'
                                      }`}
                        >
                          Мои сборы
                          <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-brand-violet/20 text-brand-violet">
                            {collectives.length}
                          </span>
                          {activeTab === 'collectives' && (
                            <motion.div
                              layoutId="chat-tab-indicator"
                              className="absolute bottom-0 inset-x-4 h-0.5 bg-brand-violet rounded-full"
                            />
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── Content area ──────────────────────────────────── */}
                  <div className="flex-1 overflow-hidden">
                    {activeTab === 'collectives' ? (
                      /* ── Collectives list ───────────────────────────── */
                      <div className="h-full overflow-y-auto p-3 space-y-2">
                        {collectives.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-center px-6">
                            <p className="text-brand-pearl/30 text-sm">
                              Вы пока не участвуете в сборах
                            </p>
                            <p className="text-brand-pearl/20 text-xs mt-2">
                              Присоединитесь к групповому сбору подарка, чтобы здесь появился чат
                            </p>
                          </div>
                        ) : (
                          collectives.map((coll) => (
                            <button
                              key={coll.claimId}
                              onClick={() => openCollectiveChat(coll.claimId)}
                              className="w-full liquid-glass p-3.5 flex items-center gap-3
                                         hover:border-brand-violet/30 transition-all duration-200
                                         active:scale-[0.98] text-left"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-brand-pearl text-sm font-medium truncate">
                                  {coll.itemName}
                                </p>
                                <p className="text-brand-pearl/40 text-xs mt-0.5">
                                  {coll.participantCount} {coll.participantCount === 1 ? 'участник' : 'участника'}
                                </p>
                              </div>
                              <ChevronRight size={16} className="text-brand-pearl/30 shrink-0" />
                            </button>
                          ))
                        )}
                      </div>
                    ) : (
                      /* ── Messages list ──────────────────────────────── */
                      <div
                        ref={messageListRef}
                        className="h-full overflow-y-auto px-3 py-3 space-y-3"
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

                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                            >
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

                                {/* Footer: timestamp + edited badge */}
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] text-brand-pearl/30">
                                    {formatTime(msg.createdAt)}
                                  </span>
                                  {msg.editedAt && (
                                    <span className="text-[10px] italic text-brand-pearl/20">
                                      изменено
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}

                        {/* Delete confirmation inline */}
                        {deleteConfirmId && (
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

                        {/* Scroll anchor */}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* ── Input bar ──────────────────────────────────────── */}
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
                              : activeTab === 'collectives'
                                ? 'Выберите сбор для чата'
                                : 'Написать сообщение...'
                          }
                          disabled={activeTab === 'collectives'}
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
                          disabled={!inputText.trim() || sending || activeTab === 'collectives'}
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
              </motion.div>
            </div>
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
              className="fixed inset-0 z-[60]"
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
              className="z-[70] liquid-glass py-1.5 min-w-[160px] shadow-2xl"
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
    </>
  )
}
