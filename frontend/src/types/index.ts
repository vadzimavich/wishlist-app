// ─── Enums ────────────────────────────────────────────────────────────────────

export type WishlistItemStatus = 'Available' | 'Reserved' | 'Collective' | 'Purchased'

export type RsvpStatus = 'Pending' | 'Attending' | 'NotAttending'

export type ClaimType = 'Solo' | 'Collective'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  createdAt: string
}

export interface AuthResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  user: User
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export interface GuestPublic {
  id: string
  name: string
  emoji: string
  rsvpStatus: RsvpStatus
}

export interface CollectiveParticipant {
  id: string
  name: string
  emoji: string
  rsvpStatus: RsvpStatus
}

export interface GiftClaim {
  id: string
  wishlistItemId: string
  claimer: GuestPublic
  type: ClaimType
  participants: GuestPublic[]
  createdAt: string
}

export interface WishlistItem {
  id: string
  name: string
  price: number | null
  currency: string
  photoUrl: string | null
  sourceUrl: string | null
  description: string | null
  status: WishlistItemStatus
  activeClaim: GiftClaim | null
  createdAt: string
}

// ─── Events ───────────────────────────────────────────────────────────────────

export interface Guest {
  id: string
  name: string
  emoji: string
  token: string
  rsvpStatus: RsvpStatus
  rsvpNote: string | null
  inviteUrl: string
}

export interface Event {
  id: string
  title: string
  date: string
  location: string | null
  description: string | null
  coverImageUrl: string | null
  isActive: boolean
  guests: Guest[]
  createdAt: string
}

// ─── Invite Page ──────────────────────────────────────────────────────────────

export interface GuestSelf {
  id: string
  name: string
  emoji: string
  token: string
  rsvpStatus: RsvpStatus
  rsvpNote: string | null
}

export interface InvitePage {
  eventId: string
  eventTitle: string
  eventDate: string
  eventLocation: string | null
  eventDescription: string | null
  coverImageUrl: string | null
  hostName: string
  hostAvatarUrl: string | null
  guests: GuestPublic[]
  wishlistItems: WishlistItem[]
  currentGuest: GuestSelf
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
  details?: string[]
}

export interface ParsedProduct {
  name: string | null
  price: number | null
  imageUrl: string | null
  description: string | null
  sourceUrl: string
}

// ─── Forms ────────────────────────────────────────────────────────────────────

export interface CreateWishlistItemForm {
  name: string
  price: string
  currency: string
  photoUrl: string
  sourceUrl: string
  description: string
}

export interface CreateEventForm {
  title: string
  date: string
  location: string
  description: string
  coverImageUrl: string
}

export interface CreateGuestForm {
  name: string
  emoji: string
}
