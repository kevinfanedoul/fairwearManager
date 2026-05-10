'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ORDER_STATUS_LABELS } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${id}`)
      if (!res.ok) throw new Error('Commande introuvable')
      return res.json()
    },
  })

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${id}/confirm`, { method: 'POST' })
      if (!res.ok) throw new Error('Erreur confirmation')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['order', id] }),
  })

  if (isLoading) return <div className="text-slate-500">Chargement…</div>
  if (!order) return <div className="text-red-600">Commande introuvable</div>

  const clientName = order.client?.company || [order.client?.firstName, order.client?.lastName].filter(Boolean).join(' ')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{order.reference}</h1>
          <p className="text-slate-500">{clientName}</p>
        </div>
        <div className="flex gap-2 items-center">
          <StatusBadge label={ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]} variant="info" />
          {order.status === 'QUOTE' && (
            <Button onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>
              {confirmMutation.isPending ? 'Confirmation…' : 'Confirmer la commande'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div><span className="text-slate-500">Date :</span> {format(new Date(order.orderDate), 'dd/MM/yyyy', { locale: fr })}</div>
            {order.deadline && <div><span className="text-slate-500">Deadline :</span> {format(new Date(order.deadline), 'dd/MM/yyyy', { locale: fr })}</div>}
            {order.notes && <div><span className="text-slate-500">Notes :</span> {order.notes}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Totaux</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-slate-500">Total HT</span><CurrencyDisplay amount={order.totalHT} /></div>
            <div className="flex justify-between"><span className="text-slate-500">TVA 20%</span><CurrencyDisplay amount={Number(order.totalTTC) - Number(order.totalHT)} /></div>
            <div className="flex justify-between font-bold border-t pt-1"><span>Total TTC</span><CurrencyDisplay amount={order.totalTTC} /></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Lignes produits</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-slate-500"><th className="text-left pb-2">Désignation</th><th className="text-center pb-2">S</th><th className="text-center pb-2">M</th><th className="text-center pb-2">L</th><th className="text-center pb-2">XL</th><th className="text-center pb-2">TU</th><th className="text-center pb-2">Qté</th><th className="text-right pb-2">Prix unit.</th><th className="text-right pb-2">Total</th></tr></thead>
            <tbody>
              {order.items?.map((item: any) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2">{item.designation}</td>
                  <td className="text-center">{item.sizeS || '—'}</td>
                  <td className="text-center">{item.sizeM || '—'}</td>
                  <td className="text-center">{item.sizeL || '—'}</td>
                  <td className="text-center">{item.sizeXL || '—'}</td>
                  <td className="text-center">{item.sizeTU || '—'}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right"><CurrencyDisplay amount={item.unitPrice} /></td>
                  <td className="text-right"><CurrencyDisplay amount={item.totalPrice} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
