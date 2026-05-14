'use client'

import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CheckCircle, FilterX } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { INVOICE_STATUS_LABELS } from '@/types'

const statusVariants: Record<string, 'success' | 'warning' | 'danger' | 'muted' | 'info'> = {
  PAID: 'success',
  PARTIAL: 'warning',
  PENDING: 'info',
  OVERDUE: 'danger',
  DRAFT: 'muted',
  CANCELLED: 'muted',
}

const monthOptions = [
  { value: '1', label: 'Janvier' },
  { value: '2', label: 'Fevrier' },
  { value: '3', label: 'Mars' },
  { value: '4', label: 'Avril' },
  { value: '5', label: 'Mai' },
  { value: '6', label: 'Juin' },
  { value: '7', label: 'Juillet' },
  { value: '8', label: 'Aout' },
  { value: '9', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Decembre' },
]

type ClientOption = {
  id: string
  company: string | null
  firstName: string | null
  lastName: string | null
}

type PaymentView = {
  id: string
  amount: number
}

type InvoiceView = {
  id: string
  number: string
  status: keyof typeof INVOICE_STATUS_LABELS
  issueDate: string
  totalTTC: number
  accountingExported: boolean
  client: ClientOption
  payments: PaymentView[]
}

function clientLabel(client: ClientOption) {
  return client.company || [client.firstName, client.lastName].filter(Boolean).join(' ') || 'Client sans nom'
}

const ALL_FILTER_VALUE = 'tous'

export default function InvoicesPage() {
  const queryClient = useQueryClient()
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedYear, setSelectedYear] = useState('')

  const invoiceQueryString = useMemo(() => {
    const params = new URLSearchParams()

    if (selectedClientId) params.set('clientId', selectedClientId)
    if (selectedStatus) params.set('status', selectedStatus)
    if (selectedMonth) params.set('month', selectedMonth)
    if (selectedYear) params.set('year', selectedYear)

    const query = params.toString()
    return query ? `?${query}` : ''
  }, [selectedClientId, selectedStatus, selectedMonth, selectedYear])

  const { data: invoices = [], isLoading } = useQuery<InvoiceView[]>({
    queryKey: ['invoices', selectedClientId, selectedStatus, selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/invoices${invoiceQueryString}`)
      if (!res.ok) throw new Error('Erreur')
      return res.json() as Promise<InvoiceView[]>
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

  const exportMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountingExported: true }),
      })
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  })

  const yearOptions = useMemo(() => {
    const invoiceYears = invoices.map((invoice) => new Date(invoice.issueDate).getFullYear())
    const currentYear = new Date().getFullYear()
    const startYear = Math.min(currentYear - 4, ...(invoiceYears.length > 0 ? invoiceYears : [currentYear]))
    const years: string[] = []

    for (let year = currentYear + 1; year >= startYear; year -= 1) {
      years.push(String(year))
    }

    return years
  }, [invoices])

  function totalPaid(invoice: InvoiceView) {
    return invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  }

  function resetFilters() {
    setSelectedClientId('')
    setSelectedStatus('')
    setSelectedMonth('')
    setSelectedYear('')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Factures</h1>
          <p className="mt-1 text-sm text-slate-500">Filtre par client, mois ou annee pour retrouver rapidement les factures voulues.</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Client</p>
          <Select onValueChange={(value) => setSelectedClientId(value === ALL_FILTER_VALUE ? '' : value)} value={selectedClientId || ALL_FILTER_VALUE}>
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
          <Select onValueChange={(value) => setSelectedStatus(value === ALL_FILTER_VALUE ? '' : value)} value={selectedStatus || ALL_FILTER_VALUE}>
            <SelectTrigger className="w-full">
              {selectedStatus
                ? INVOICE_STATUS_LABELS[selectedStatus as keyof typeof INVOICE_STATUS_LABELS]
                : <SelectValue placeholder="Tous les statuts" />}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE}>Tous les statuts</SelectItem>
              {Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Mois</p>
          <Select onValueChange={(value) => setSelectedMonth(value === ALL_FILTER_VALUE ? '' : value)} value={selectedMonth || ALL_FILTER_VALUE}>
            <SelectTrigger className="w-full" disabled={!selectedYear}>
              {selectedMonth
                ? monthOptions.find((month) => month.value === selectedMonth)?.label
                : <SelectValue placeholder={selectedYear ? 'Tous les mois' : 'Choisir une annee'} />}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE}>Tous les mois</SelectItem>
              {monthOptions.map((month) => (
                <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Annee</p>
          <Select
            onValueChange={(value) => {
              const nextYear = value === ALL_FILTER_VALUE ? '' : value
              setSelectedYear(nextYear)
              if (!nextYear) setSelectedMonth('')
            }}
            value={selectedYear || ALL_FILTER_VALUE}
          >
            <SelectTrigger className="w-full">
              {selectedYear ? selectedYear : <SelectValue placeholder="Toutes les annees" />}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE}>Toutes les annees</SelectItem>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
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

      <div className="rounded-md border bg-white">
        {isLoading ? <div className="p-6 text-slate-500">Chargement…</div> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Facture</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total TTC</TableHead>
                <TableHead className="text-right">Réglé</TableHead>
                <TableHead className="text-right">Reste</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-slate-500">
                    Aucune facture ne correspond à ces filtres.
                  </TableCell>
                </TableRow>
              ) : invoices.map((invoice) => {
                const paid = totalPaid(invoice)
                const remaining = Number(invoice.totalTTC) - paid

                return (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link href={`/invoices/${invoice.id}`} className="font-medium hover:underline">
                        {invoice.number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {clientLabel(invoice.client)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        label={INVOICE_STATUS_LABELS[invoice.status]}
                        variant={statusVariants[invoice.status] ?? 'muted'}
                      />
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {format(new Date(invoice.issueDate), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell className="text-right"><CurrencyDisplay amount={invoice.totalTTC} /></TableCell>
                    <TableCell className="text-right text-green-700"><CurrencyDisplay amount={paid} /></TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      {remaining > 0 ? <CurrencyDisplay amount={remaining} /> : '—'}
                    </TableCell>
                    <TableCell>
                      {!invoice.accountingExported ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportMutation.mutate(invoice.id)}
                          title="Marquer transmis comptable"
                        >
                          <CheckCircle size={16} />
                        </Button>
                      ) : (
                        <span className="text-xs text-green-600">✓ Comptable</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
