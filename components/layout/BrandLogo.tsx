'use client'

import { Scissors } from 'lucide-react'
import { cn } from '@/lib/utils'

type BrandLogoProps = {
  compact?: boolean
  className?: string
}

export function BrandLogo({ compact = false, className }: BrandLogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm">
        <Scissors size={22} strokeWidth={2.2} />
      </div>
      {!compact && (
        <div className="min-w-0">
          <div className="text-[2rem] leading-none font-black tracking-[-0.04em] text-slate-950">
            Fairwear Manufacture
          </div>
          <div className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Atelier de confection
          </div>
        </div>
      )}
    </div>
  )
}
