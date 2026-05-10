import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type StatusVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

const variantClasses: Record<StatusVariant, string> = {
  default: '',
  success: 'bg-green-100 text-green-800 hover:bg-green-100',
  warning: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  danger: 'bg-red-100 text-red-800 hover:bg-red-100',
  info: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  muted: 'bg-slate-100 text-slate-600 hover:bg-slate-100',
}

interface StatusBadgeProps {
  label: string
  variant?: StatusVariant
  className?: string
}

export function StatusBadge({ label, variant = 'default', className }: StatusBadgeProps) {
  return (
    <Badge variant="secondary" className={cn(variantClasses[variant], className)}>
      {label}
    </Badge>
  )
}
