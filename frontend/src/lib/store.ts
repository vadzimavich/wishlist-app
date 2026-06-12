import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { User, WishlistItem, Event } from '@/types'
import { authApi } from './api'

// ─── Auth Store ───────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const auth = await authApi.login(email, password)
          set({ user: auth.user, isAuthenticated: true })
        } finally {
          set({ isLoading: false })
        }
      },

      register: async (email, password, name) => {
        set({ isLoading: true })
        try {
          const auth = await authApi.register(email, password, name)
          set({ user: auth.user, isAuthenticated: true })
        } finally {
          set({ isLoading: false })
        }
      },

      logout: async () => {
        await authApi.logout()
        set({ user: null, isAuthenticated: false })
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)

// ─── Wishlist Store ───────────────────────────────────────────────────────────

interface WishlistState {
  items: WishlistItem[]
  setItems: (items: WishlistItem[]) => void
  upsertItem: (item: WishlistItem) => void
  removeItem: (id: string) => void
  updateItemStatus: (updatedItem: WishlistItem) => void
}

export const useWishlistStore = create<WishlistState>((set) => ({
  items: [],

  setItems: (items) => set({ items }),

  upsertItem: (item) =>
    set((state) => {
      const exists = state.items.find((i) => i.id === item.id)
      if (exists) {
        return { items: state.items.map((i) => (i.id === item.id ? item : i)) }
      }
      return { items: [item, ...state.items] }
    }),

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  // Используется SignalR хуком для real-time обновлений
  updateItemStatus: (updatedItem) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === updatedItem.id ? updatedItem : i)),
    })),
}))

// ─── Events Store ─────────────────────────────────────────────────────────────

interface EventsState {
  events: Event[]
  activeEvent: Event | null
  setEvents: (events: Event[]) => void
  setActiveEvent: (event: Event | null) => void
  upsertEvent: (event: Event) => void
  removeEvent: (id: string) => void
}

export const useEventsStore = create<EventsState>((set) => ({
  events: [],
  activeEvent: null,

  setEvents: (events) => set({ events }),

  setActiveEvent: (event) => set({ activeEvent: event }),

  upsertEvent: (event) =>
    set((state) => {
      const exists = state.events.find((e) => e.id === event.id)
      if (exists) {
        return { events: state.events.map((e) => (e.id === event.id ? event : e)) }
      }
      return { events: [event, ...state.events] }
    }),

  removeEvent: (id) =>
    set((state) => ({ events: state.events.filter((e) => e.id !== id) })),
}))

// ─── UI Store ─────────────────────────────────────────────────────────────────

interface UIState {
  sidebarOpen: boolean
  activeModal: string | null
  setSidebarOpen: (open: boolean) => void
  openModal: (name: string) => void
  closeModal: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  activeModal: null,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),
}))
