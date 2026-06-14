'use client'

import { useEffect, useCallback, useRef } from 'react'
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { ActivityEvent } from '@/types'
import { guestsApi } from '@/lib/api'
import { useActivityStore } from '@/lib/stores/activityStore'

const ACTIVITY_PAGE_SIZE = 20
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

interface UseActivityFeedResult {
  activities: ActivityEvent[]
  loading: boolean
  hasMore: boolean
  loadMore: () => Promise<void>
}

export function useActivityFeed(eventId: string | undefined): UseActivityFeedResult {
  const { activities, loading, hasMore, setActivities, addActivity, setLoading } = useActivityStore()
  const skipRef = useRef(0)
  const connectionRef = useRef<HubConnection | null>(null)

  const fetchPage = useCallback(
    async (skip: number, take: number): Promise<{ events: ActivityEvent[]; hasMore: boolean }> => {
      if (!eventId) return { events: [], hasMore: false }

      const events = await guestsApi.getActivity(eventId, skip, take)
      const hasMoreResult = events.length >= take

      return { events, hasMore: hasMoreResult }
    },
    [eventId],
  )

  // ── Load initial data ───────────────────────────────────────────────────
  useEffect(() => {
    if (!eventId) return

    skipRef.current = 0
    setLoading(true)

    fetchPage(0, ACTIVITY_PAGE_SIZE)
      .then(({ events, hasMore }) => {
        setActivities(events, hasMore)
        skipRef.current = events.length
      })
      .finally(() => setLoading(false))
  }, [eventId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── SignalR: listen to ActivityUpdated ──────────────────────────────────
  useEffect(() => {
    if (!eventId) return

    const connection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/wishlist?eventId=${eventId}`, {
        withCredentials: false,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(process.env.NODE_ENV === 'development' ? LogLevel.Information : LogLevel.Error)
      .build()

    connectionRef.current = connection

    connection.on('ActivityUpdated', (activity: ActivityEvent) => {
      addActivity(activity)
    })

    connection.start().catch((err) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('SignalR (activity feed) connection failed:', err)
      }
    })

    return () => {
      connection.stop()
      connectionRef.current = null
    }
  }, [eventId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── loadMore: fetch next page and append ────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!eventId || loading || !hasMore) return

    setLoading(true)

    try {
      const { events, hasMore: more } = await fetchPage(skipRef.current, ACTIVITY_PAGE_SIZE)

      // Append to existing activities
      const currentActivities = useActivityStore.getState().activities
      const merged = [...currentActivities, ...events]
      setActivities(merged, more)
      skipRef.current = merged.length
    } finally {
      setLoading(false)
    }
  }, [eventId, loading, hasMore, fetchPage, setActivities, setLoading])

  return { activities, loading, hasMore, loadMore }
}
