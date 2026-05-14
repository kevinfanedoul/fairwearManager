'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { FilterX, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { ORDER_STATUS_LABELS } from '@/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const ALL_FILTER_VALUE = 'tous'

type ClientOption = {
  id: string
  company: string | null
  firstName: string | null
  lastName: string | null
}

type OrderView = {
  id: string
  reference: string
  status: keyof typeof ORDER_STATUS_LABELS
  orderDate: string
  deadline: string | null
  totalTTC: number
  client: ClientOption
}

function clientLabel(client: ClientOption) {
  return client.company || [client.firstName, client.lastName].filter(Boolean).join(' ') || 'Client sans nom'
}

export default function OrdersPage() {
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  const queryParams = new URLSearchParams()
  if (selectedClientId) queryParams.set('clientId', selectedClientId)
  if (selectedStatus) queryParams.set('status', selectedStatus)
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ''

  const { data: orders = [], isLoading } = useQuery<OrderView[]>({
    queryKey: ['orders', selectedClientId, selectedStatus],
    queryFn: async () => {
      const res = await fetch(`/api/orders${queryString}`)
      if (!res.ok) throw new Error('Erreur')
      return res.json() as Promise<OrderView[]>
    },
  })

  const { data: clientsData } = useQuery<{ clients: ClientOption[] }>({
    queryKey: ['clients-select'],
    queryFn: async () => {
      const res = await fetch('/api/clients?limit=200')
      if (!res.ok) throw new Error('Erreur clients')
      return res.json() as Promise<{ clients: ClientOption[] }>
    },
  })

  function resetFilters() {
    setSelectedClientId('')
    setSelectedStatus('')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Commandes & Devis</h1>
        <Link href="/orders/new"><Button><Plus size={16} className="mr-2" />Nouveau devis</Button></Link>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Client</p>
          <Select onValueChange={(value) => setSelectedClientId(value && value !== ALL_FILTER_VALUE ? value : '')} value={selectedClientId || ALL_FILTER_VALUE}>
            <SelectTrigger className="w-full">
              {selectedClientId
                ? clientLabel(clientsData?.clients.find((client) => client.id === selectedClientId) ?? { id: '', company: null, firstName: null, lastName: null })
                : <SelectValue placeholder="Tous les clients" />}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE}>Tous les clients</SelectItem>
              {clientsData?.clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>{clientLabel(client)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Statut</p>
          <Select onValueChange={(value) => setSelectedStatus(value && value !== ALL_FILTER_VALUE ? value : '')} value={selectedStatus || ALL_FILTER_VALUE}>
            <SelectTrigger className="w-full">
              {selectedStatus
                ? ORDER_STATUS_LABELS[selectedStatus as keyof typeof ORDER_STATUS_LABELS]
                : <SelectValue placeholder="Tous les statuts" />}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE}>Tous les statuts</SelectItem>
              {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button type="button" variant="outline" onClick={resetFilters}>
            <FilterX size={16} className="mr-2" />
            Reinitialiser
          </Button>
        </div>
      </div>

      {isLoading ? <div className="text-slate-500">Chargement…</div> : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead className="text-right">Total TTC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                    Aucune commande ne correspond à ces filtres.
                  </TableCell>
                </TableRow>
              ) : orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link href={`/orders/${order.id}`} className="font-medium hover:underline">{order.reference}</Link>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {clientLabel(order.client)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge label={ORDER_STATUS_LABELS[order.status]} variant="muted" />
                  </TableCell>
                  <TableCell className="text-slate-500">{format(new Date(order.orderDate), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                  <TableCell className="text-slate-500">{order.deadline ? format(new Date(order.deadline), 'dd/MM/yyyy', { locale: fr }) : '—'}</TableCell>
                  <TableCell className="text-right"><CurrencyDisplay amount={order.totalTTC} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
