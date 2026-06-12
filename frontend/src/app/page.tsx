import { redirect } from 'next/navigation'

// Root page redirects to dashboard (layout.tsx handles auth check)
export default function HomePage() {
  redirect('/dashboard')
}
