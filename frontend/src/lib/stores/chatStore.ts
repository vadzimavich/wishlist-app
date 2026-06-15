import { create } from 'zustand'
import axios from 'axios'
import { ChatMessage } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

interface ChatState {
  messages: Record<string, ChatMessage[]> // key: claimId or '__event__' for event chat
  loading: boolean
  hasMore: Record<string, boolean>
  addMessage: (message: ChatMessage) => void
  editMessage: (messageId: string, newText: string, editedAt: string) => void
  removeMessage: (messageId: string) => void
  setMessages: (key: string, messages: ChatMessage[]) => void
  setLoading: (loading: boolean) => void
  setHasMore: (key: string, hasMore: boolean) => void
  loadMessages: (eventId: string, claimId?: string, skip?: number, take?: number) => Promise<void>
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: {},
  loading: false,
  hasMore: {},

  addMessage: (message) =>
    set((state) => {
      const key = message.claimId || '__event__'
      const existing = state.messages[key] || []
      // Prevent duplicates
      if (existing.some((m) => m.id === message.id)) return state
      return {
        messages: {
          ...state.messages,
          [key]: [...existing, message],
        },
      }
    }),

  editMessage: (messageId, newText, editedAt) =>
    set((state) => {
      const updated: Record<string, ChatMessage[]> = {}
      for (const key of Object.keys(state.messages)) {
        const list = state.messages[key]
        const idx = list.findIndex((m) => m.id === messageId)
        if (idx !== -1) {
          updated[key] = list.map((m) =>
            m.id === messageId ? { ...m, text: newText, editedAt } : m
          )
        }
      }
      if (Object.keys(updated).length === 0) return state
      return { messages: { ...state.messages, ...updated } }
    }),

  removeMessage: (messageId) =>
    set((state) => {
      const updated: Record<string, ChatMessage[]> = {}
      for (const key of Object.keys(state.messages)) {
        const filtered = state.messages[key].filter((m) => m.id !== messageId)
        if (filtered.length !== state.messages[key].length) {
          updated[key] = filtered
        }
      }
      if (Object.keys(updated).length === 0) return state
      return { messages: { ...state.messages, ...updated } }
    }),

  setMessages: (key, messages) =>
    set((state) => ({
      messages: { ...state.messages, [key]: messages },
    })),

  setLoading: (loading) => set({ loading }),

  setHasMore: (key, hasMore) =>
    set((state) => ({
      hasMore: { ...state.hasMore, [key]: hasMore },
    })),

  loadMessages: async (eventId, claimId, skip = 0, take = 50) => {
    const { loading } = get()
    if (loading) return

    set({ loading: true })
    try {
      const params: Record<string, string | number> = { skip, take }
      if (claimId) params.claimId = claimId

      const response = await axios.get(`${API_URL}/api/events/${eventId}/messages`, { params })
      const responseData = response.data?.data ?? response.data
      // Response from backend: { data: { messages: [...], total: N } }
      const messagesData = Array.isArray(responseData)
        ? responseData
        : responseData?.messages ?? responseData?.items ?? []
      const chatMessages: ChatMessage[] = messagesData

      const key = claimId || '__event__'

      set((state) => {
        const existing = state.messages[key] || []
        // On first page (skip === 0) replace; otherwise append
        const merged = skip === 0 ? chatMessages : [...existing, ...chatMessages]
        return {
          messages: { ...state.messages, [key]: merged },
          hasMore: { ...state.hasMore, [key]: chatMessages.length === take },
        }
      })
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load chat messages:', error)
      }
    } finally {
      set({ loading: false })
    }
  },
}))
