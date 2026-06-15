'use client'

import { useEffect, useRef, useCallback } from 'react'
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { ChatMessage } from '@/types'
import { useChatStore } from '@/lib/stores/chatStore'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

const EVENT_CHAT_KEY = '__event__'

interface UseChatRealtimeOptions {
  eventId: string
  guestToken: string
}

export function useChatRealtime({ eventId, guestToken }: UseChatRealtimeOptions) {
  const connectionRef = useRef<HubConnection | null>(null)

  const messages = useChatStore((state) => state.messages[EVENT_CHAT_KEY] || [])
  const loading = useChatStore((state) => state.loading)
  const hasMore = useChatStore((state) => state.hasMore[EVENT_CHAT_KEY] ?? true)
  const addMessage = useChatStore((state) => state.addMessage)
  const editMessage = useChatStore((state) => state.editMessage)
  const removeMessage = useChatStore((state) => state.removeMessage)
  const loadMessages = useChatStore((state) => state.loadMessages)

  useEffect(() => {
    if (!eventId || !guestToken) return

    const hubUrl = `${API_URL}/hubs/chat?eventId=${eventId}&guestToken=${guestToken}`

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        withCredentials: false,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(process.env.NODE_ENV === 'development' ? LogLevel.Information : LogLevel.Error)
      .build()

    connectionRef.current = connection

    // ── Server → Client event handlers ──────────────────────────────────────
    connection.on('MessageReceived', (message: ChatMessage) => {
      addMessage(message)
    })

    connection.on('MessageEdited', (messageId: string, newText: string, editedAt: string) => {
      editMessage(messageId, newText, editedAt)
    })

    connection.on('MessageDeleted', (messageId: string) => {
      removeMessage(messageId)
    })

    // ── Start connection ────────────────────────────────────────────────────
    connection.start().catch((err) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Chat SignalR connection failed:', err)
      }
    })

    // Auto-load messages on mount
    loadMessages(eventId, undefined, 0, 50)

    return () => {
      connection.stop()
      connectionRef.current = null
    }
  }, [eventId, guestToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Client → Server methods ───────────────────────────────────────────────

  const sendEventMessage = useCallback(async (text: string) => {
    if (connectionRef.current) {
      await connectionRef.current.invoke('SendEventMessage', text)
    }
  }, [])

  const editMessageAction = useCallback(async (messageId: string, newText: string) => {
    if (connectionRef.current) {
      await connectionRef.current.invoke('EditMessage', messageId, newText)
    }
  }, [])

  const deleteMessageAction = useCallback(async (messageId: string) => {
    if (connectionRef.current) {
      await connectionRef.current.invoke('DeleteMessage', messageId)
    }
  }, [])

  const loadMore = useCallback(() => {
    const currentCount = messages.length
    loadMessages(eventId, undefined, currentCount, 50)
  }, [eventId, messages.length, loadMessages])

  return {
    sendEventMessage,
    editMessage: editMessageAction,
    deleteMessage: deleteMessageAction,
    messages,
    loadMore,
    hasMore,
    loading,
  }
}
