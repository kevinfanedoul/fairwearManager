'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { ORDER_STATUS_LABELS } from '@/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function OrdersPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders')
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Commandes & Devis</h1>
        <Link href="/orders/new"><Button><Plus size={16} className="mr-2" />Nouveau devis</Button></Link>
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
              {orders?.map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link href={`/orders/${order.id}`} className="font-medium hover:underline">{order.reference}</Link>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {order.client?.company || [order.client?.firstName, order.client?.lastName].filter(Boolean).join(' ')}
                  </TableCell>
                  <TableCell><StatusBadge label={ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]} variant="muted" /></TableCell>
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
