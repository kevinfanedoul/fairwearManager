'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CLIENT_TYPE_LABELS } from '@/types'
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'

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

type SortField = 'name' | 'type' | 'email' | 'city' | 'orders'
type SortOrder = 'asc' | 'desc'

const typeVariants: Record<string, 'info' | 'success' | 'warning' | 'muted'> = {
  BRAND: 'info',
  B2B: 'success',
  INDIVIDUAL: 'warning',
  STUDIO: 'muted',
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export function ClientsTable() {
  const [search, setSearch] = useState('')
  const [letter, setLetter] = useState('')
  const [type, setType] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const limit = 25

  useEffect(() => {
    setPage(1)
  }, [search, letter, type, sortBy, sortOrder])

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search, letter, type, page, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (letter) params.set('letter', letter)
      if (type !== 'all') params.set('type', type)
      params.set('page', String(page))
      params.set('limit', String(limit))
      params.set('sortBy', sortBy)
      params.set('sortOrder', sortOrder)
      const res = await fetch(`/api/clients?${params}`)
      if (!res.ok) throw new Error('Erreur chargement clients')
      return res.json() as Promise<{ clients: ClientRow[]; total: number; page: number; limit: number; sortBy: SortField; sortOrder: SortOrder }>
    },
  })

  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur lors de la suppression')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  })

  function handleDelete(id: string) {
    if (window.confirm('Supprimer ce client ? Il ne sera plus visible dans la liste.')) {
      deleteMutation.mutate(id)
    }
  }

  const totalPages = useMemo(() => {
    if (!data) return 1
    return Math.max(1, Math.ceil(data.total / data.limit))
  }, [data])

  function displayName(c: ClientRow) {
    if (c.company) return c.company
    return [c.lastName, c.firstName].filter(Boolean).join(' ') || '—'
  }

  function toggleSort(field: SortField) {
    if (sortBy === field) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortBy(field)
    setSortOrder('asc')
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortBy !== field) return <ArrowUpDown size={14} className="text-slate-400" />
    if (sortOrder === 'asc') return <ArrowUp size={14} className="text-slate-700" />
    return <ArrowDown size={14} className="text-slate-700" />
  }

  function SortHeader({ field, label, align = 'left' }: { field: SortField; label: string; align?: 'left' | 'right' }) {
    return (
      <button
        type="button"
        onClick={() => toggleSort(field)}
        className={`inline-flex items-center gap-1.5 rounded-md px-1 py-1 transition-colors hover:bg-slate-100 ${align === 'right' ? 'ml-auto' : ''}`}
      >
        <span>{label}</span>
        <SortIcon field={field} />
      </button>
    )
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
            onChange={(e) => {
              setSearch(e.target.value)
              if (letter) setLetter('')
            }}
          />
        </div>
        <Select value={type} onValueChange={(v) => setType(v ?? 'all')} items={{ all: 'Tous les types', ...CLIENT_TYPE_LABELS }}>
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

      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => setLetter('')}
          className={`px-2.5 py-1 rounded-md text-sm font-medium transition-colors ${letter === '' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Tous
        </button>
        {ALPHABET.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => {
              setLetter(letter === l ? '' : l)
              setSearch('')
            }}
            className={`px-2.5 py-1 rounded-md text-sm font-medium transition-colors ${letter === l ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-slate-500 py-8 text-center">Chargement…</div>
      ) : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><SortHeader field="name" label="Nom / Société" /></TableHead>
                <TableHead><SortHeader field="type" label="Type" /></TableHead>
                <TableHead><SortHeader field="email" label="Email" /></TableHead>
                <TableHead><SortHeader field="city" label="Ville" /></TableHead>
                <TableHead className="text-right"><SortHeader field="orders" label="Commandes" align="right" /></TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.clients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-8">
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
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/clients/${client.id}`}>
                        <Button variant="ghost" size="icon-sm" title="Voir">
                          <Eye size={14} />
                        </Button>
                      </Link>
                      <Link href={`/clients/${client.id}/edit`}>
                        <Button variant="ghost" size="icon-sm" title="Modifier">
                          <Pencil size={14} />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Supprimer"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(client.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {data && (
        <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {data.total} client{data.total > 1 ? 's' : ''} · page {data.page} sur {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
            >
              Précédent
            </Button>
            <div className="min-w-24 text-center text-slate-600">
              {Math.min((page - 1) * limit + 1, data.total)}-{Math.min(page * limit, data.total)} / {data.total}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
