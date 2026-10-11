'use client'

import { useQuery } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MeasurementsForm } from './MeasurementsForm'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { ORDER_STATUS_LABELS, INVOICE_STATUS_LABELS, CLIENT_TYPE_LABELS } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'
import { Plus } from 'lucide-react'

interface ClientTabsProps {
  clientId: string
}

export function ClientTabs({ clientId }: ClientTabsProps) {
  const { data: client, isLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}`)
      if (!res.ok) throw new Error('Client introuvable')
      return res.json()
    },
  })

  if (isLoading) return <div className="text-slate-500">Chargement…</div>
  if (!client) return <div className="text-red-600">Client introuvable</div>

  const displayName = client.company || [client.firstName, client.lastName].filter(Boolean).join(' ')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{displayName}</h1>
          <StatusBadge label={CLIENT_TYPE_LABELS[client.type as keyof typeof CLIENT_TYPE_LABELS]} variant="info" />
        </div>
        <div className="flex gap-2">
          <Link href={`/orders/new?clientId=${clientId}&type=PRODUCT`}>
            <Button><Plus size={16} className="mr-2" />Commande produit</Button>
          </Link>
          <Link href={`/orders/new?clientId=${clientId}&type=STUDY`}>
            <Button variant="secondary"><Plus size={16} className="mr-2" />Commande bureau d&apos;études</Button>
          </Link>
          <Link href={`/clients/${clientId}/edit`}>
            <Button variant="outline">Modifier</Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="measurements">Mensurations</TabsTrigger>
          <TabsTrigger value="orders">Commandes ({client.orders?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="invoices">Factures ({client.invoices?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardContent className="pt-6 grid grid-cols-2 gap-4 text-sm">
              {client.email && <div><span className="text-slate-500">Email</span><p>{client.email}</p></div>}
              {client.phone && <div><span className="text-slate-500">Téléphone</span><p>{client.phone}</p></div>}
              {client.address && <div><span className="text-slate-500">Adresse</span><p>{client.address}</p></div>}
              {client.city && <div><span className="text-slate-500">Ville</span><p>{client.city}</p></div>}
              {client.ice && <div><span className="text-slate-500">ICE</span><p>{client.ice}</p></div>}
              {client.notes && <div className="col-span-2"><span className="text-slate-500">Notes</span><p>{client.notes}</p></div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="measurements">
          <Card>
            <CardHeader><CardTitle>Mensurations</CardTitle></CardHeader>
            <CardContent>
              <MeasurementsForm clientId={clientId} defaultValues={client.measurements ?? {}} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardContent className="pt-6">
              {client.orders?.length === 0 ? (
                <p className="text-slate-400 text-center py-4">Aucune commande</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-slate-500"><th className="text-left pb-2">Réf.</th><th className="text-left pb-2">Statut</th><th className="text-left pb-2">Date</th><th className="text-right pb-2">Total TTC</th></tr></thead>
                  <tbody>
                    {client.orders?.map((order: any) => (
                      <tr key={order.id} className="border-b last:border-0">
                        <td className="py-2"><Link href={`/orders/${order.id}`} className="hover:underline font-medium">{order.reference}</Link></td>
                        <td><StatusBadge label={ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]} variant="muted" /></td>
                        <td className="text-slate-500">{format(new Date(order.orderDate), 'dd/MM/yyyy', { locale: fr })}</td>
                        <td className="text-right"><CurrencyDisplay amount={order.totalTTC} currency={order.currency ?? 'MAD'} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardContent className="pt-6">
              {client.invoices?.length === 0 ? (
                <p className="text-slate-400 text-center py-4">Aucune facture</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-slate-500"><th className="text-left pb-2">N°</th><th className="text-left pb-2">Statut</th><th className="text-left pb-2">Date</th><th className="text-right pb-2">Total TTC</th></tr></thead>
                  <tbody>
                    {client.invoices?.map((invoice: any) => (
                      <tr key={invoice.id} className="border-b last:border-0">
                        <td className="py-2"><Link href={`/invoices/${invoice.id}`} className="hover:underline font-medium">{invoice.number}</Link></td>
                        <td><StatusBadge label={INVOICE_STATUS_LABELS[invoice.status as keyof typeof INVOICE_STATUS_LABELS]} variant="muted" /></td>
                        <td className="text-slate-500">{format(new Date(invoice.issueDate), 'dd/MM/yyyy', { locale: fr })}</td>
                        <td className="text-right"><CurrencyDisplay amount={invoice.totalTTC} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
