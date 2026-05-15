'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Check, Download, FilePenLine } from 'lucide-react'

type OrderItemView = {
  id: string
  designation: string
  sizeS: number
  sizeM: number
  sizeL: number
  sizeXL: number
  sizeTU: number
  quantity: number
  unitPrice: number
  totalPrice: number
}

type OrderView = {
  id: string
  reference: string
  status: OrderStatus
  orderDate: string
  deadline: string | null
  totalHT: number
  totalTTC: number
  currency: 'MAD' | 'EUR' | 'GBP' | 'USD'
  notes?: string | null
  client?: {
    company: string | null
    firstName: string | null
    lastName: string | null
  }
  invoice?: { id: string } | null
  items?: OrderItemView[]
}

const workflowSteps: OrderStatus[] = [
  'QUOTE',
  'CONFIRMED',
  'INVOICED',
  'PAID',
]

function stepState(currentStatus: OrderStatus, step: OrderStatus) {
  if (currentStatus === 'CANCELLED') {
    return step === 'QUOTE' ? 'done' : 'upcoming'
  }

  const currentIndex = workflowSteps.indexOf(currentStatus)
  const stepIndex = workflowSteps.indexOf(step)

  if (currentIndex === -1 || stepIndex === -1) return 'upcoming'
  if (stepIndex < currentIndex) return 'done'
  if (stepIndex === currentIndex) return 'current'
  return 'upcoming'
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: order, isLoading } = useQuery<OrderView>({
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

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: id,
          dueDate: '',
          applyStampDuty: false,
          notes: '',
        }),
      })
      if (!res.ok) throw new Error('Erreur création facture')
      return res.json()
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      router.push(`/invoices/${invoice.id}`)
    },
  })

  const cancelQuoteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      if (!res.ok) throw new Error('Erreur annulation')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  if (isLoading) return <div className="text-slate-500">Chargement…</div>
  if (!order) return <div className="text-red-600">Commande introuvable</div>

  const clientName = order.client?.company || [order.client?.firstName, order.client?.lastName].filter(Boolean).join(' ')

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-sky-700">
              Espace devis
            </div>
            <h1 className="text-2xl font-bold text-slate-950">{order.reference}</h1>
            <p className="mt-1 text-slate-600">{clientName}</p>
            <p className="mt-2 text-sm text-slate-500">
              Gérez les ajustements du client, confirmez le devis ou annulez-le avant validation.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:max-w-[42rem] lg:items-end">
            <div className="flex justify-start lg:justify-end">
              <div className="rounded-full bg-white/90 px-1 py-1 shadow-sm ring-1 ring-slate-200/80">
                <StatusBadge label={ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]} variant="info" />
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
              <a
                href={`/api/orders/${id}/pdf`}
                className={buttonVariants({ variant: 'outline', className: 'w-full justify-center sm:w-auto' })}
              >
                <Download size={16} className="mr-2" />Télécharger PDF
              </a>

              {order.invoice && (
                <Link
                  href={`/invoices/${order.invoice.id}`}
                  className={buttonVariants({ variant: 'outline', className: 'w-full justify-center sm:w-auto' })}
                >
                  Voir la facture
                </Link>
              )}

              {order.status === 'QUOTE' && (
                <Link
                  href={`/orders/${id}/edit`}
                  className={buttonVariants({ variant: 'secondary', className: 'w-full justify-center sm:w-auto' })}
                >
                  <FilePenLine size={16} className="mr-2" />
                  Modifier
                </Link>
              )}
              {order.status === 'QUOTE' && (
                <Button
                  variant="destructive"
                  className="w-full justify-center sm:w-auto"
                  onClick={() => cancelQuoteMutation.mutate()}
                  disabled={cancelQuoteMutation.isPending || confirmMutation.isPending}
                >
                  {cancelQuoteMutation.isPending ? 'Annulation…' : 'Annuler le devis'}
                </Button>
              )}

              {order.status === 'QUOTE' && (
                <Button
                  className="w-full justify-center bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
                  onClick={() => confirmMutation.mutate()}
                  disabled={confirmMutation.isPending || cancelQuoteMutation.isPending}
                >
                  {confirmMutation.isPending ? 'Confirmation…' : 'Confirmer la commande'}
                </Button>
              )}
            </div>

            {order.status === 'CONFIRMED' && !order.invoice && (
              <Button
                className="w-full justify-center bg-sky-600 text-white hover:bg-sky-700 sm:w-auto"
                onClick={() => createInvoiceMutation.mutate()}
                disabled={createInvoiceMutation.isPending}
              >
                {createInvoiceMutation.isPending ? 'Création de la facture…' : 'Créer la facture'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card className="overflow-hidden border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100/70">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Timeline du workflow</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Suivi du devis depuis l&apos;émission jusqu&apos;à la facturation et au règlement.
              </p>
            </div>
            {order.status === 'CANCELLED' && (
              <div className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
                Devis annulé avant confirmation
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto pb-5">
          <div className="flex min-w-max items-start gap-0">
            {workflowSteps.map((step, index) => {
              const state = stepState(order.status as OrderStatus, step)
              const isLast = index === workflowSteps.length - 1

              return (
                <div key={step} className="flex items-start">
                  <div className="flex w-32 flex-col items-center text-center">
                    <div
                      className={[
                        'flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
                        state === 'done' ? 'border-emerald-600 bg-emerald-600 text-white' : '',
                        state === 'current' ? 'border-slate-900 bg-slate-900 text-white ring-4 ring-slate-200' : '',
                        state === 'upcoming' ? 'border-slate-200 bg-white text-slate-400' : '',
                      ].join(' ')}
                    >
                      {state === 'done' ? <Check size={18} /> : index + 1}
                    </div>
                    <div className="mt-3 text-sm font-medium text-slate-900">
                      {ORDER_STATUS_LABELS[step]}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {state === 'done' ? 'Terminée' : state === 'current' ? 'Étape en cours' : 'À venir'}
                    </div>
                  </div>
                  {!isLast && (
                    <div className="mt-5 h-[2px] w-12 shrink-0 rounded-full bg-slate-200">
                      <div
                        className={[
                          'h-full rounded-full',
                          state === 'done' ? 'bg-emerald-500' : 'bg-slate-200',
                        ].join(' ')}
                      />
                    </div>
                  )}
                </div>
              )
            })}
            {order.status === 'CANCELLED' && (
              <div className="flex items-start">
                <div className="mt-5 h-[2px] w-12 shrink-0 rounded-full bg-red-200" />
                <div className="flex w-32 flex-col items-center text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-red-600 bg-red-600 text-sm font-semibold text-white ring-4 ring-red-100">
                    ×
                  </div>
                  <div className="mt-3 text-sm font-medium text-red-700">
                    Annulé
                  </div>
                  <div className="mt-1 text-xs text-red-400">
                    Workflow interrompu
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
            <div className="flex justify-between"><span className="text-slate-500">Total HT</span><CurrencyDisplay amount={order.totalHT} currency={order.currency} /></div>
            <div className="flex justify-between"><span className="text-slate-500">TVA 20%</span><CurrencyDisplay amount={Number(order.totalTTC) - Number(order.totalHT)} currency={order.currency} /></div>
            <div className="flex justify-between font-bold border-t pt-1"><span>Total TTC</span><CurrencyDisplay amount={order.totalTTC} currency={order.currency} /></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Lignes produits</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-slate-500"><th className="text-left pb-2">Désignation</th><th className="text-center pb-2">S</th><th className="text-center pb-2">M</th><th className="text-center pb-2">L</th><th className="text-center pb-2">XL</th><th className="text-center pb-2">TU</th><th className="text-center pb-2">Qté</th><th className="text-right pb-2">Prix unit.</th><th className="text-right pb-2">Total</th></tr></thead>
            <tbody>
              {order.items?.map((item: OrderItemView) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2">{item.designation}</td>
                  <td className="text-center">{item.sizeS || '—'}</td>
                  <td className="text-center">{item.sizeM || '—'}</td>
                  <td className="text-center">{item.sizeL || '—'}</td>
                  <td className="text-center">{item.sizeXL || '—'}</td>
                  <td className="text-center">{item.sizeTU || '—'}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right"><CurrencyDisplay amount={item.unitPrice} currency={order.currency} /></td>
                  <td className="text-right"><CurrencyDisplay amount={item.totalPrice} currency={order.currency} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
