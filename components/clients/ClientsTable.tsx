'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import Link from 'next/link'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CLIENT_TYPE_LABELS } from '@/types'
import { Plus, Search } from 'lucide-react'

type ClientRow = {
  id: string
  type: string
  company: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
  city: string | null
  _count: { orders: number; invoices: number }
}

const typeVariants: Record<string, 'info' | 'success' | 'warning' | 'muted'> = {
  BRAND: 'info',
  B2B: 'success',
  INDIVIDUAL: 'warning',
  STUDIO: 'muted',
}

export function ClientsTable() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState<string>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search, type],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (type !== 'all') params.set('type', type)
      const res = await fetch(`/api/clients?${params}`)
      if (!res.ok) throw new Error('Erreur chargement clients')
      return res.json() as Promise<{ clients: ClientRow[]; total: number }>
    },
  })

  function displayName(c: ClientRow) {
    if (c.company) return c.company
    return [c.firstName, c.lastName].filter(Boolean).join(' ') || '—'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
        <Link href="/clients/new">
          <Button><Plus size={16} className="mr-2" />Nouveau client</Button>
        </Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Rechercher un client…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={type} onValueChange={(v) => setType(v ?? 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {Object.entries(CLIENT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-slate-500 py-8 text-center">Chargement…</div>
      ) : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom / Société</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead className="text-right">Commandes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.clients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                    Aucun client trouvé
                  </TableCell>
                </TableRow>
              )}
              {data?.clients.map((client) => (
                <TableRow key={client.id} className="cursor-pointer hover:bg-slate-50">
                  <TableCell>
                    <Link href={`/clients/${client.id}`} className="font-medium hover:underline">
                      {displayName(client)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={CLIENT_TYPE_LABELS[client.type as keyof typeof CLIENT_TYPE_LABELS]}
                      variant={typeVariants[client.type]}
                    />
                  </TableCell>
                  <TableCell className="text-slate-500">{client.email ?? '—'}</TableCell>
                  <TableCell className="text-slate-500">{client.city ?? '—'}</TableCell>
                  <TableCell className="text-right text-slate-500">{client._count.orders}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {data && (
        <p className="text-sm text-slate-500">{data.total} client{data.total > 1 ? 's' : ''}</p>
      )}
    </div>
  )
}
