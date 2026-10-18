'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ORDER_STATUS_LABELS } from '@/types'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { TrendingUp, Clock, AlertTriangle, CheckSquare, ShoppingBag, FileText } from 'lucide-react'

export default function DashboardPage() {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/kpis')
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
    refetchInterval: 5 * 60 * 1000,
  })

  if (isLoading) return <div className="text-slate-500">Chargement du tableau de bord…</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <TrendingUp size={14} className="text-green-600" />CA du mois
            </div>
            <p className="text-2xl font-bold"><CurrencyDisplay amount={kpis?.caMonth ?? 0} /></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <FileText size={14} className="text-orange-500" />Factures en attente
            </div>
            <p className="text-2xl font-bold">{kpis?.pendingInvoicesCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <ShoppingBag size={14} className="text-blue-500" />Commandes actives
            </div>
            <p className="text-2xl font-bold">{kpis?.activeOrdersCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <CheckSquare size={14} className="text-purple-500" />Tâches en cours
            </div>
            <p className="text-2xl font-bold">{kpis?.activeTodosCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock size={16} className="text-orange-500" />Deadlines dans 7 jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kpis?.upcomingDeadlines?.length === 0 && (
              <p className="text-slate-400 text-sm">Aucune deadline imminente</p>
            )}
            {kpis?.upcomingDeadlines?.map((order: any) => {
              const daysLeft = differenceInDays(new Date(order.deadline), new Date())
              const clientName = order.client?.company || [order.client?.firstName, order.client?.lastName].filter(Boolean).join(' ')
              return (
                <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <Link href={`/orders/${order.id}`} className="font-medium text-sm hover:underline">{order.reference}</Link>
                    <p className="text-xs text-slate-500">{clientName}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${daysLeft <= 2 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                    J-{daysLeft}
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />Impayés +30 jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kpis?.overdueInvoices?.length === 0 && (
              <p className="text-slate-400 text-sm">Aucun impayé en retard</p>
            )}
            {kpis?.overdueInvoices?.map((invoice: any) => {
              const paid = invoice.payments?.reduce((s: number, p: any) => s + Number(p.appliedAmount ?? p.amount), 0) ?? 0
              const remaining = Number(invoice.totalTTC) - paid
              const clientName = invoice.client?.company || [invoice.client?.firstName, invoice.client?.lastName].filter(Boolean).join(' ')
              return (
                <div key={invoice.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <Link href={`/invoices/${invoice.id}`} className="font-medium text-sm hover:underline">{invoice.number}</Link>
                    <p className="text-xs text-slate-500">{clientName}</p>
                  </div>
                  <span className="text-sm font-bold text-red-600"><CurrencyDisplay amount={remaining} currency={invoice.order?.currency ?? 'MAD'} /></span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Dernières commandes</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="text-left pb-2">Référence</th>
                <th className="text-left pb-2">Client</th>
                <th className="text-left pb-2">Statut</th>
                <th className="text-left pb-2">Date</th>
                <th className="text-right pb-2">Total TTC</th>
              </tr>
            </thead>
            <tbody>
              {kpis?.recentOrders?.map((order: any) => {
                const clientName = order.client?.company || [order.client?.firstName, order.client?.lastName].filter(Boolean).join(' ')
                return (
                  <tr key={order.id} className="border-b last:border-0">
                    <td className="py-2"><Link href={`/orders/${order.id}`} className="hover:underline font-medium">{order.reference}</Link></td>
                    <td className="text-slate-600">{clientName}</td>
                    <td><StatusBadge label={ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]} variant="muted" /></td>
                    <td className="text-slate-500">{format(new Date(order.orderDate), 'dd/MM/yyyy', { locale: fr })}</td>
                    <td className="text-right"><CurrencyDisplay amount={order.totalTTC} currency={order.currency ?? 'MAD'} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
