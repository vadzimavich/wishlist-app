import axios, { AxiosInstance } from 'axios'
import {
  ActivityEvent,
  AuthResponse,
  CreateEventForm,
  CreateGuestForm,
  CreateWishlistItemForm,
  Event,
  GiftClaim,
  Guest,
  GuestSelf,
  InvitePage,
  ParsedProduct,
  RsvpStatus,
  SharedContact,
  UpdateGuestForm,
  WishlistItem,
  ClaimType,
} from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

// ─── Axios Instance ───────────────────────────────────────────────────────────

const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Для refresh token cookie
})

// ── Request interceptor: добавляем JWT ────────────────────────────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: обновляем токен при 401 ────────────────────────────
let isRefreshing = false
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = []

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => api(original))
      }

      original._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {}, { withCredentials: true })
        const newToken = data.data.accessToken
        localStorage.setItem('accessToken', newToken)
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`
        failedQueue.forEach(({ resolve }) => resolve(undefined))
        failedQueue = []
        return api(original)
      } catch {
        failedQueue.forEach(({ reject }) => reject(error))
        failedQueue = []
        localStorage.removeItem('accessToken')
        window.location.href = '/auth'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  register: async (email: string, password: string, name: string): Promise<AuthResponse> => {
    const { data } = await api.post('/auth/register', { email, password, name })
    localStorage.setItem('accessToken', data.data.accessToken)
    return data.data
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('accessToken', data.data.accessToken)
    return data.data
  },

  logout: async () => {
    await api.post('/auth/logout').catch(() => {})
    localStorage.removeItem('accessToken')
  },

  refresh: async (): Promise<AuthResponse> => {
    const { data } = await api.post('/auth/refresh', {})
    localStorage.setItem('accessToken', data.data.accessToken)
    return data.data
  },
}

// ─── Wishlist API ─────────────────────────────────────────────────────────────

export const wishlistApi = {
  getItems: async (): Promise<WishlistItem[]> => {
    const { data } = await api.get('/wishlist')
    return data.data
  },

  createItem: async (form: CreateWishlistItemForm): Promise<WishlistItem> => {
    const { data } = await api.post('/wishlist', {
      ...form,
      price: form.price ? parseFloat(form.price) : null,
    })
    return data.data
  },

  updateItem: async (id: string, form: Partial<CreateWishlistItemForm>): Promise<WishlistItem> => {
    const { data } = await api.put(`/wishlist/${id}`, {
      ...form,
      price: form.price ? parseFloat(form.price) : undefined,
    })
    return data.data
  },

  deleteItem: async (id: string): Promise<void> => {
    await api.delete(`/wishlist/${id}`)
  },

  parseUrl: async (url: string): Promise<ParsedProduct> => {
    const { data } = await api.post('/parser/fetch-meta', { url })
    return data.data
  },
}

// ─── Events API ───────────────────────────────────────────────────────────────

export const eventsApi = {
  getEvents: async (): Promise<Event[]> => {
    const { data } = await api.get('/events')
    return data.data
  },

  getEvent: async (id: string): Promise<Event> => {
    const { data } = await api.get(`/events/${id}`)
    return data.data
  },

  createEvent: async (form: CreateEventForm): Promise<Event> => {
    const { data } = await api.post('/events', form)
    return data.data
  },

  updateEvent: async (id: string, form: Partial<CreateEventForm>): Promise<Event> => {
    const { data } = await api.put(`/events/${id}`, form)
    return data.data
  },

  deleteEvent: async (id: string): Promise<void> => {
    await api.delete(`/events/${id}`)
  },
}

// ─── Guests API ───────────────────────────────────────────────────────────────

export const guestsApi = {
  addGuest: async (eventId: string, form: CreateGuestForm): Promise<Guest> => {
    const { data } = await api.post(`/events/${eventId}/guests`, {
      name: form.name,
      emoji: form.emoji,
      ...(form.guestCount !== undefined && { guestCount: form.guestCount }),
    })
    return data.data
  },

  updateGuest: async (eventId: string, guestId: string, form: UpdateGuestForm): Promise<Guest> => {
    const { data } = await api.put(`/events/${eventId}/guests/${guestId}`, form)
    return data.data
  },

  deleteGuest: async (eventId: string, guestId: string): Promise<void> => {
    await api.delete(`/events/${eventId}/guests/${guestId}`)
  },

  // Публичные методы (без авторизации)
  getInvitePage: async (token: string): Promise<InvitePage> => {
    const { data } = await axios.get(`${API_URL}/api/guests/by-token/${token}`)
    return data.data
  },

  updateRsvp: async (token: string, status: RsvpStatus, note?: string): Promise<Guest> => {
    const { data } = await axios.post(`${API_URL}/api/guests/${token}/rsvp`, { status, note })
    return data.data
  },

  getActivity: async (eventId: string, skip?: number, take?: number): Promise<ActivityEvent[]> => {
    const { data } = await axios.get(`${API_URL}/api/events/${eventId}/activity?skip=${skip ?? 0}&take=${take ?? 20}`)
    // API returns { data: { items: ActivityEventDto[], totalCount: number } }
    return data.data.items
  },

  updateContact: async (token: string, telegram?: string, phone?: string): Promise<GuestSelf> => {
    const { data } = await axios.post(`${API_URL}/api/guests/${token}/contact`, { telegram, phone })
    return data.data
  },

  toggleContactShare: async (token: string, isShared: boolean): Promise<GuestSelf> => {
    const { data } = await axios.put(`${API_URL}/api/guests/${token}/contact/share`, { isShared })
    return data.data
  },

  getSharedContacts: async (token: string): Promise<SharedContact[]> => {
    const { data } = await axios.get(`${API_URL}/api/guests/${token}/contacts`)
    return data.data
  },
}

// ─── Gifts API ────────────────────────────────────────────────────────────────

export const giftsApi = {
  claimGift: async (guestToken: string, wishlistItemId: string, claimType: ClaimType): Promise<WishlistItem> => {
    const { data } = await axios.post(`${API_URL}/api/gifts/claim`, {
      guestToken,
      wishlistItemId,
      claimType,
    })
    return data.data
  },

  joinCollective: async (claimId: string, guestToken: string): Promise<WishlistItem> => {
    const { data } = await axios.post(`${API_URL}/api/gifts/${claimId}/join`, { guestToken })
    return data.data
  },

  cancelClaim: async (claimId: string, guestToken: string): Promise<WishlistItem> => {
    const { data } = await axios.post(`${API_URL}/api/gifts/${claimId}/cancel`, { guestToken })
    return data.data
  },
}

export default api
