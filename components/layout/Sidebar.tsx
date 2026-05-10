'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Users, ShoppingBag, FileText, Wallet, CheckSquare, LayoutDashboard,
} from 'lucide-react'

const navItems = [
  { label: 'Tableau de bord', href: '/', icon: LayoutDashboard },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Commandes', href: '/orders', icon: ShoppingBag },
  { label: 'Factures', href: '/invoices', icon: FileText },
  { label: 'Trésorerie', href: '/treasury', icon: Wallet },
  { label: 'Tâches', href: '/todos', icon: CheckSquare },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <h1 className="font-bold text-lg">FairwairManager</h1>
        <p className="text-slate-400 text-xs mt-1">Fairwear Manufacture</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              pathname === href
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
