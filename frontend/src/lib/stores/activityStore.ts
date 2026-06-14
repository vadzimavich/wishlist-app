import { create } from 'zustand'
import { ActivityEvent } from '@/types'

interface ActivityState {
  activities: ActivityEvent[]
  loading: boolean
  hasMore: boolean
  addActivity: (event: ActivityEvent) => void
  setActivities: (events: ActivityEvent[], hasMore?: boolean) => void
  setLoading: (loading: boolean) => void
}

export const useActivityStore = create<ActivityState>((set) => ({
  activities: [],
  loading: false,
  hasMore: true,

  addActivity: (event) =>
    set((state) => {
      // Avoid duplicates by id
      if (state.activities.some((a) => a.id === event.id)) {
        return state
      }
      return { activities: [event, ...state.activities] }
    }),

  setActivities: (events, hasMore = true) =>
    set({ activities: events, hasMore }),

  setLoading: (loading) => set({ loading }),
}))
