'use client'

import { useEffect, useRef } from 'react'
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { WishlistItem, GuestPublic } from '@/types'
import { useWishlistStore } from '@/lib/store'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

interface UseWishlistRealtimeOptions {
  eventId: string | undefined
  onGuestRsvpUpdated?: (guest: GuestPublic) => void
}

export function useWishlistRealtime({ eventId, onGuestRsvpUpdated }: UseWishlistRealtimeOptions) {
  const connectionRef = useRef<HubConnection | null>(null)
  const { updateItemStatus } = useWishlistStore()

  useEffect(() => {
    if (!eventId) return

    const connection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/wishlist?eventId=${eventId}`, {
        withCredentials: false, // Гости не используют cookies
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(process.env.NODE_ENV === 'development' ? LogLevel.Information : LogLevel.Error)
      .build()

    connectionRef.current = connection

    // ── Обработчики событий ────────────────────────────────────────────
    connection.on('GiftClaimed', (item: WishlistItem) => {
      updateItemStatus(item)
    })

    connection.on('CollectiveJoined', (item: WishlistItem) => {
      updateItemStatus(item)
    })

    connection.on('ClaimCancelled', (item: WishlistItem) => {
      updateItemStatus(item)
    })

    connection.on('WishlistItemUpdated', (item: WishlistItem) => {
      updateItemStatus(item)
    })

    connection.on('GuestRsvpUpdated', (guest: GuestPublic) => {
      onGuestRsvpUpdated?.(guest)
    })

    // ── Запуск подключения ────────────────────────────────────────────
    connection.start().catch((err) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('SignalR connection failed:', err)
      }
    })

    return () => {
      connection.stop()
    }
  }, [eventId]) // eslint-disable-line react-hooks/exhaustive-deps

  return connectionRef.current
}
