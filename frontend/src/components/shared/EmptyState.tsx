'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon, AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './Button'

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: LucideIcon
  emoji?: string
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export function EmptyState({ icon: Icon, emoji, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      {emoji ? (
        <p className="text-5xl mb-4">{emoji}</p>
      ) : Icon ? (
        <Icon size={44} className="text-admin-muted/30 mb-4" />
      ) : null}
      <p className="text-admin-text font-semibold">{title}</p>
      {description && <p className="text-admin-muted text-sm mt-1 max-w-xs">{description}</p>}
      {action && (
        <Button onClick={action.onClick} size="sm" className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  )
}

// ─── ErrorBoundary ────────────────────────────────────────────────────────────

interface ErrorBoundaryState { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center min-h-[200px] gap-3 p-6 text-center">
            <AlertTriangle size={32} className="text-warning" />
            <p className="text-admin-text font-medium">Что-то пошло не так</p>
            <p className="text-admin-muted text-sm">{this.state.error?.message}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => this.setState({ hasError: false })}
            >
              <RefreshCw size={14} /> Попробовать снова
            </Button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
