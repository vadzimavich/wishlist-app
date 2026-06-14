import { create } from 'zustand'
import { guestsApi } from '@/lib/api'
import { SharedContact } from '@/types'

interface ContactState {
  myTelegram: string
  myPhone: string
  isShared: boolean
  sharedContacts: SharedContact[]
  loading: boolean
  updateMyContact: (token: string, telegram: string, phone: string) => Promise<void>
  toggleShare: (token: string, isShared: boolean) => Promise<void>
  fetchSharedContacts: (token: string) => Promise<void>
  setMyTelegram: (val: string) => void
  setMyPhone: (val: string) => void
}

export const useContactStore = create<ContactState>((set) => ({
  myTelegram: '',
  myPhone: '',
  isShared: false,
  sharedContacts: [],
  loading: false,

  updateMyContact: async (token, telegram, phone) => {
    set({ loading: true })
    try {
      const result = await guestsApi.updateContact(token, telegram, phone)
      set({ myTelegram: result.telegram ?? '', myPhone: result.phone ?? '', isShared: result.isContactShared })
    } finally {
      set({ loading: false })
    }
  },

  toggleShare: async (token, isShared) => {
    const result = await guestsApi.toggleContactShare(token, isShared)
    set({ isShared: result.isContactShared })
  },

  fetchSharedContacts: async (token) => {
    const contacts = await guestsApi.getSharedContacts(token)
    set({ sharedContacts: contacts })
  },

  setMyTelegram: (val) => set({ myTelegram: val }),
  setMyPhone: (val) => set({ myPhone: val }),
}))
