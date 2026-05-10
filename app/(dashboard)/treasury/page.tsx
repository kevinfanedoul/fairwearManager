'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cashEntrySchema, type CashEntryInput } from '@/lib/validators/cash'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus, TrendingUp, TrendingDown } from 'lucide-react'

export default function TreasuryPage() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: entries, isLoading } = useQuery({
    queryKey: ['cash'],
    queryFn: async () => {
      const res = await fetch('/api/treasury/cash')
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
  })

  const form = useForm<CashEntryInput>({
    resolver: zodResolver(cashEntrySchema) as any,
    defaultValues: {
      date: new Date().toISOString(),
      type: 'INCOME',
      amount: 0,
      label: '',
    },
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
      form.reset()
      setOpen(false)
    },
  })

  const currentBalance = entries?.length > 0 ? Number(entries[entries.length - 1].balance) : 0
  const totalIncome = entries?.filter((e: any) => e.type === 'INCOME').reduce((sum: number, e: any) => sum + Number(e.amount), 0) ?? 0
  const totalExpense = entries?.filter((e: any) => e.type === 'EXPENSE').reduce((sum: number, e: any) => sum + Number(e.amount), 0) ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trésorerie</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger>
            <Button><Plus size={16} className="mr-2" />Nouvelle opération</Button>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="INCOME">Recette</SelectItem>
                        <SelectItem value="EXPENSE">Dépense</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="label" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Libellé</FormLabel>
                    <FormControl><Input {...field} placeholder="Règlement facture PR-001/2026" /></FormControl>
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
                    <FormControl><Input {...field} placeholder="Loyer, Fournitures…" /></FormControl>
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
              {entries && [...entries].reverse().map((entry: any) => (
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
  )
}
