import { cn } from '@/lib/utils'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}

const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }

export function LoadingSpinner({ size = 'md', className, label }: Props) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'rounded-full border-2 border-admin-border border-t-brand-violet animate-spin',
          sizes[size]
        )}
      />
      {label && <p className="text-admin-muted text-sm">{label}</p>}
    </div>
  )
}

/** Полноэкранный загрузчик */
export function FullPageSpinner({ label = 'Загрузка...' }: { label?: string }) {
  return (
    <div className="min-h-screen bg-admin-bg flex items-center justify-center">
      <LoadingSpinner size="lg" label={label} />
    </div>
  )
}
