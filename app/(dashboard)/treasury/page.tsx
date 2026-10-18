'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cashEntrySchema, type CashEntryInput } from '@/lib/validators/cash'
import { Card, CardContent } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { format, startOfMonth, startOfYear } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus, TrendingUp, TrendingDown } from 'lucide-react'

const CASH_ENTRY_TYPE_LABELS = {
  INCOME: 'Recette',
  EXPENSE: 'Dépense',
} as const

type CashEntryView = {
  id: string
  date: string
  label: string
  category: string | null
  type: keyof typeof CASH_ENTRY_TYPE_LABELS
  amount: number
  balance: number
}

type CashChartPoint = {
  date: string
  income: number
  expense: number
  balance: number
}

type ChartGranularity = 'day' | 'month' | 'year'

const CHART_GRANULARITY_LABELS: Record<ChartGranularity, string> = {
  day: 'Jour',
  month: 'Mois',
  year: 'Année',
}

function chartBucketDate(date: Date, granularity: ChartGranularity) {
  if (granularity === 'month') return startOfMonth(date)
  if (granularity === 'year') return startOfYear(date)
  return date
}

function chartTickLabel(date: string, granularity: ChartGranularity) {
  const parsedDate = new Date(date)
  if (granularity === 'month') return format(parsedDate, 'MMM yyyy', { locale: fr })
  if (granularity === 'year') return format(parsedDate, 'yyyy', { locale: fr })
  return format(parsedDate, 'dd/MM', { locale: fr })
}

function chartPeriodLabel(startDate: string, endDate: string, granularity: ChartGranularity) {
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (granularity === 'year') {
    return startDate === endDate
      ? format(start, 'yyyy', { locale: fr })
      : `${format(start, 'yyyy', { locale: fr })} - ${format(end, 'yyyy', { locale: fr })}`
  }

  if (granularity === 'month') {
    return startDate === endDate
      ? format(start, 'MMMM yyyy', { locale: fr })
      : `${format(start, 'MMM yyyy', { locale: fr })} - ${format(end, 'MMM yyyy', { locale: fr })}`
  }

  return startDate === endDate
    ? format(start, 'dd MMMM yyyy', { locale: fr })
    : `${format(start, 'dd MMM', { locale: fr })} - ${format(end, 'dd MMM yyyy', { locale: fr })}`
}

function buildCashChartData(entries: CashEntryView[], granularity: ChartGranularity) {
  const grouped = new Map<string, CashChartPoint>()

  entries.forEach((entry) => {
    const date = chartBucketDate(new Date(entry.date), granularity).toISOString()
    const current = grouped.get(date) ?? { date, income: 0, expense: 0, balance: 0 }

    if (entry.type === 'INCOME') {
      current.income += Number(entry.amount)
    } else {
      current.expense += Number(entry.amount)
    }

    current.balance = Number(entry.balance)
    grouped.set(date, current)
  })

  return Array.from(grouped.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

function formatCompactAmount(value: number) {
  return new Intl.NumberFormat('fr-MA', {
    notation: 'compact',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value)
}

function TreasuryChart({
  entries,
  granularity,
  onGranularityChange,
}: {
  entries: CashEntryView[]
  granularity: ChartGranularity
  onGranularityChange: (granularity: ChartGranularity) => void
}) {
  const chartData = buildCashChartData(entries, granularity)

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            Aucune donnée de trésorerie à afficher pour le moment.
          </div>
        </CardContent>
      </Card>
    )
  }

  const width = Math.max(760, chartData.length * 132)
  const height = 260
  const paddingTop = 28
  const paddingRight = 24
  const paddingBottom = 48
  const paddingLeft = 84
  const chartWidth = width - paddingLeft - paddingRight
  const chartHeight = height - paddingTop - paddingBottom
  const maxValue = Math.max(...chartData.flatMap((point) => [point.income, point.expense]), 1)
  const gridSteps = 4
  const gridValues = Array.from({ length: gridSteps + 1 }, (_, index) => index / gridSteps)
  const columnWidth = chartWidth / chartData.length
  const barGroupWidth = Math.min(42, columnWidth * 0.48)
  const barWidth = Math.max(12, (barGroupWidth - 8) / 2)
  const netTotal = chartData.reduce((sum, point) => sum + point.income - point.expense, 0)
  const strongestDay = [...chartData].sort((a, b) => (b.income - b.expense) - (a.income - a.expense))[0]
  const periodLabel = chartPeriodLabel(chartData[0].date, chartData[chartData.length - 1].date, granularity)

  return (
    <Card className="overflow-hidden border-slate-200/80 shadow-sm">
      <CardContent className="bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(244,63,94,0.12),_transparent_30%),linear-gradient(180deg,_rgba(248,250,252,0.95),_rgba(255,255,255,1))] pt-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/80 px-3 py-1 text-xs font-medium text-emerald-700 backdrop-blur">
              Flux de trésorerie
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">Évolution des entrées et sorties d&apos;argent</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Lecture journalière des encaissements et des dépenses réelles sur la période sélectionnée.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-sm backdrop-blur">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Période</p>
              <p className="mt-2 text-sm font-semibold text-slate-700">{periodLabel}</p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-sm backdrop-blur">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Net</p>
              <p className={`mt-2 text-sm font-semibold ${netTotal >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {netTotal >= 0 ? '+' : '-'}{formatCompactAmount(Math.abs(netTotal))} MAD
              </p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-sm backdrop-blur">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Point fort</p>
              <p className="mt-2 text-sm font-semibold text-slate-700">
                {chartTickLabel(strongestDay.date, granularity)} · {formatCompactAmount(Math.max(strongestDay.income - strongestDay.expense, 0))} MAD
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200/70 bg-white/80 p-4 shadow-[0_16px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-3 text-xs text-slate-600">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Recettes
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 font-medium text-rose-700">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                Dépenses
              </div>
            </div>
            <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
              {(['day', 'month', 'year'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onGranularityChange(option)}
                  className={buttonVariants({
                    variant: granularity === option ? 'default' : 'ghost',
                    size: 'sm',
                    className: 'rounded-full px-3 shadow-none',
                  })}
                >
                  {CHART_GRANULARITY_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <div style={{ minWidth: `${width}px` }}>
              <svg viewBox={`0 0 ${width} ${height}`} className="h-[22rem] w-full">
                <defs>
                  <linearGradient id="incomeBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="rgb(5 150 105)" stopOpacity="0.7" />
                  </linearGradient>
                  <linearGradient id="expenseBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(244 63 94)" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="rgb(225 29 72)" stopOpacity="0.7" />
                  </linearGradient>
                </defs>

                <rect
                  x={paddingLeft}
                  y={paddingTop}
                  width={chartWidth}
                  height={chartHeight}
                  rx="20"
                  fill="rgba(248,250,252,0.85)"
                />

              {gridValues.map((gridValue) => {
                const y = paddingTop + chartHeight - gridValue * chartHeight
                const label = `${formatCompactAmount(Math.round(maxValue * gridValue))} MAD`

                return (
                  <g key={gridValue}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={paddingLeft + chartWidth}
                      y2={y}
                      stroke="rgba(148, 163, 184, 0.22)"
                      strokeDasharray="4 8"
                    />
                    <text x={14} y={Math.max(y + 4, 16)} fill="rgb(100 116 139)" fontSize="11" fontWeight="500">
                      {label}
                    </text>
                  </g>
                )
              })}

              {chartData.map((point, index) => {
                const groupCenter = paddingLeft + (index + 0.5) * columnWidth
                const groupLeft = groupCenter - barGroupWidth / 2
                const incomeHeight = maxValue === 0 ? 0 : (point.income / maxValue) * chartHeight
                const expenseHeight = maxValue === 0 ? 0 : (point.expense / maxValue) * chartHeight
                const incomeY = paddingTop + chartHeight - incomeHeight
                const expenseY = paddingTop + chartHeight - expenseHeight
                const net = point.income - point.expense

                return (
                  <g key={point.date}>
                    <rect
                      x={groupLeft}
                      y={incomeY}
                      width={barWidth}
                      height={Math.max(incomeHeight, 2)}
                      rx="10"
                      fill="url(#incomeBarGradient)"
                    />
                    <rect
                      x={groupLeft + barWidth + 8}
                      y={expenseY}
                      width={barWidth}
                      height={Math.max(expenseHeight, 2)}
                      rx="10"
                      fill="url(#expenseBarGradient)"
                    />
                    <text x={groupCenter} y={height - 14} textAnchor="middle" fill="rgb(71 85 105)" fontSize="11" fontWeight="500">
                      {chartTickLabel(point.date, granularity)}
                    </text>
                    <text
                      x={groupCenter}
                      y={paddingTop - 8}
                      textAnchor="middle"
                      fill={net >= 0 ? 'rgb(5 150 105)' : 'rgb(225 29 72)'}
                      fontSize="11"
                      fontWeight="700"
                    >
                      {net >= 0 ? '+' : '-'}{formatCompactAmount(Math.abs(net))}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function TreasuryPage() {
  const [open, setOpen] = useState(false)
  const [chartGranularity, setChartGranularity] = useState<ChartGranularity>('month')
  const queryClient = useQueryClient()

  const { data: entries = [], isLoading } = useQuery<CashEntryView[]>({
    queryKey: ['cash'],
    queryFn: async () => {
      const res = await fetch('/api/treasury/cash')
      if (!res.ok) throw new Error('Erreur')
      return res.json() as Promise<CashEntryView[]>
    },
  })

  const defaultValues: CashEntryInput = {
    date: new Date().toISOString(),
    type: 'INCOME',
    amount: 0,
    label: '',
    category: '',
    reference: '',
  }

  const form = useForm<CashEntryInput>({
    resolver: zodResolver(cashEntrySchema),
    defaultValues,
  })

  const mutation = useMutation({
    mutationFn: async (data: CashEntryInput) => {
      const res = await fetch('/api/treasury/cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash'] })
      form.reset(defaultValues)
      setOpen(false)
    },
  })

  const currentBalance = entries.length > 0 ? Number(entries[entries.length - 1].balance) : 0
  const totalIncome = entries.filter((entry) => entry.type === 'INCOME').reduce((sum, entry) => sum + Number(entry.amount), 0)
  const totalExpense = entries.filter((entry) => entry.type === 'EXPENSE').reduce((sum, entry) => sum + Number(entry.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trésorerie</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<button className={buttonVariants({ variant: 'default' })} />}>
            <Plus size={16} className="mr-2" />Nouvelle opération
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle opération de caisse</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" value={field.value?.split('T')[0]}
                        onChange={e => field.onChange(new Date(e.target.value).toISOString())} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? 'INCOME'}>
                      <FormControl>
                        <SelectTrigger>
                          {field.value ? CASH_ENTRY_TYPE_LABELS[field.value] : <SelectValue placeholder="Sélectionner un type" />}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="INCOME">{CASH_ENTRY_TYPE_LABELS.INCOME}</SelectItem>
                        <SelectItem value="EXPENSE">{CASH_ENTRY_TYPE_LABELS.EXPENSE}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="label" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Libellé</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} placeholder="Règlement facture PR-001/2026" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant (MAD)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie (optionnel)</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} placeholder="Loyer, Fournitures…" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500">Solde actuel</p>
                <p className={`text-2xl font-bold mt-1 ${currentBalance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                  <CurrencyDisplay amount={currentBalance} />
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 flex items-center gap-1"><TrendingUp size={14} className="text-green-600" />Total recettes</p>
                <p className="text-2xl font-bold mt-1 text-green-700"><CurrencyDisplay amount={totalIncome} /></p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 flex items-center gap-1"><TrendingDown size={14} className="text-red-500" />Total dépenses</p>
                <p className="text-2xl font-bold mt-1 text-red-600"><CurrencyDisplay amount={totalExpense} /></p>
              </CardContent>
            </Card>
          </div>

          {!isLoading && (
            <TreasuryChart
              entries={entries}
              granularity={chartGranularity}
              onGranularityChange={setChartGranularity}
            />
          )}

          {isLoading ? <div className="text-slate-500">Chargement…</div> : (
            <div className="rounded-md border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead className="text-right">Recette</TableHead>
                    <TableHead className="text-right">Dépense</TableHead>
                    <TableHead className="text-right">Solde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...entries].reverse().map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-slate-500">{format(new Date(entry.date), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                      <TableCell>{entry.label}</TableCell>
                      <TableCell className="text-slate-500">{entry.category || '—'}</TableCell>
                      <TableCell className="text-right text-green-700">
                        {entry.type === 'INCOME' ? <CurrencyDisplay amount={entry.amount} /> : '—'}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {entry.type === 'EXPENSE' ? <CurrencyDisplay amount={entry.amount} /> : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <CurrencyDisplay amount={entry.balance} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
      </div>
    </div>
  )
}