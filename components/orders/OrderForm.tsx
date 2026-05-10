'use client'

import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { orderSchema, type OrderInput } from '@/lib/validators/order'
import { OrderItemsTable } from './OrderItemsTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function OrderForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClientId = searchParams.get('clientId') ?? ''

  const { data: clientsData } = useQuery({
    queryKey: ['clients-select'],
    queryFn: async () => {
      const res = await fetch('/api/clients?limit=200')
      return res.json() as Promise<{ clients: { id: string; company: string | null; firstName: string | null; lastName: string | null }[] }>
    },
  })

  const form = useForm<OrderInput>({
    resolver: zodResolver(orderSchema) as any,
    defaultValues: {
      clientId: preselectedClientId,
      items: [{ designation: '', sizeS: 0, sizeM: 0, sizeL: 0, sizeXL: 0, sizeTU: 0, quantity: 0, unitPrice: 0 }],
    },
  })

  function clientLabel(c: { company: string | null; firstName: string | null; lastName: string | null }) {
    return c.company || [c.firstName, c.lastName].filter(Boolean).join(' ')
  }

  async function onSubmit(data: OrderInput) {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      form.setError('root', { message: 'Erreur lors de la création' })
      return
    }
    const order = await res.json()
    router.push(`/orders/${order.id}`)
    router.refresh()
  }

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Nouveau devis</h1>
          </div>

          <Card>
            <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientsData?.clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{clientLabel(c)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date limite de livraison</FormLabel>
                    <FormControl><Input {...field} type="date" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea {...field} rows={2} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Lignes produits</CardTitle></CardHeader>
            <CardContent>
              <OrderItemsTable />
            </CardContent>
          </Card>

          {form.formState.errors.root && (
            <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Création…' : 'Créer le devis'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Annuler</Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  )
}
