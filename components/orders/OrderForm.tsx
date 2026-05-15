'use client'

import { useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ORDER_CURRENCIES } from '@/lib/currencies'
import { orderSchema, type OrderData, type OrderInput } from '@/lib/validators/order'
import { OrderItemsTable } from './OrderItemsTable'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'

type OrderFormProps = {
  mode?: 'create' | 'edit'
  orderId?: string
  initialData?: OrderInput
}

export function OrderForm({ mode = 'create', orderId, initialData }: OrderFormProps) {
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

  const form = useForm<OrderInput, undefined, OrderData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      clientId: initialData?.clientId ?? preselectedClientId,
      currency: initialData?.currency ?? 'MAD',
      deadline: initialData?.deadline ?? '',
      notes: initialData?.notes ?? '',
      items: initialData?.items ?? [{ designation: '', sizeS: 0, sizeM: 0, sizeL: 0, sizeXL: 0, sizeTU: 0, quantity: 0, unitPrice: 0 }],
    },
  })

  useEffect(() => {
    if (!initialData) return

    form.reset({
      clientId: initialData.clientId,
      currency: initialData.currency ?? 'MAD',
      deadline: initialData.deadline ?? '',
      notes: initialData.notes ?? '',
      items: initialData.items.length > 0 ? initialData.items : [{ designation: '', sizeS: 0, sizeM: 0, sizeL: 0, sizeXL: 0, sizeTU: 0, quantity: 0, unitPrice: 0 }],
    })
  }, [form, initialData])

  function clientLabel(c: { company: string | null; firstName: string | null; lastName: string | null }) {
    return c.company || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Client sans nom'
  }

  function clientLabelById(clientId: string) {
    const client = clientsData?.clients.find((c) => c.id === clientId)
    return client ? clientLabel(client) : clientId
  }

  async function onSubmit(data: OrderData) {
    const endpoint = mode === 'edit' && orderId ? `/api/orders/${orderId}` : '/api/orders'
    const method = mode === 'edit' ? 'PUT' : 'POST'

    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      form.setError('root', { message: mode === 'edit' ? 'Erreur lors de la modification' : 'Erreur lors de la création' })
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
            <h1 className="text-2xl font-bold">{mode === 'edit' ? 'Modifier le devis' : 'Nouveau devis'}</h1>
          </div>

          <Card>
            <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          {field.value ? clientLabelById(field.value) : <SelectValue placeholder="Sélectionner un client" />}
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
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Devise du devis</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? 'MAD'}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choisir une devise" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(ORDER_CURRENCIES).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
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
                    <FormControl>
                      <DatePicker
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        placeholder="Choisir une date de livraison"
                      />
                    </FormControl>
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
                    <FormControl><Textarea {...field} value={field.value ?? ''} rows={2} /></FormControl>
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
              {form.formState.isSubmitting
                ? mode === 'edit' ? 'Enregistrement…' : 'Création…'
                : mode === 'edit' ? 'Enregistrer les modifications' : 'Créer le devis'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Annuler</Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  )
}
