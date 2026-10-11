'use client'

import { useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ORDER_CURRENCIES } from '@/lib/currencies'
import { orderSchema, type OrderData, type OrderInput } from '@/lib/validators/order'
import { OrderItemsTable } from './OrderItemsTable'
import { StudyOrderItemsTable } from './StudyOrderItemsTable'
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

const emptyProductItem = {
  designation: '',
  sizeXS: 0,
  sizeS: 0,
  sizeM: 0,
  sizeL: 0,
  sizeXL: 0,
  sizeXXL: 0,
  sizeXXXL: 0,
  sizeTU: 0,
  quantity: 0,
  unitPrice: 0,
}

const emptyStudyItem = {
  kind: 'BREAKDOWN' as const,
  designation: '',
  patronage: 0,
  proto: 0,
  gradationSizes: 0,
  gradationUnitPrice: 0,
}

export function OrderForm({ mode = 'create', orderId, initialData }: OrderFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClientId = searchParams.get('clientId') ?? ''
  const orderType: 'PRODUCT' | 'STUDY' =
    initialData?.type ?? (searchParams.get('type') === 'STUDY' ? 'STUDY' : 'PRODUCT')

  const { data: clientsData } = useQuery({
    queryKey: ['clients-select'],
    queryFn: async () => {
      const res = await fetch('/api/clients?limit=200')
      return res.json() as Promise<{ clients: { id: string; company: string | null; firstName: string | null; lastName: string | null }[] }>
    },
  })

  const defaultItems = (initialData?.items?.length ?? 0) > 0
    ? initialData!.items
    : [orderType === 'STUDY' ? emptyStudyItem : emptyProductItem]

  const form = useForm<OrderInput, undefined, OrderData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      type: orderType,
      clientId: initialData?.clientId ?? preselectedClientId,
      currency: initialData?.currency ?? 'MAD',
      fabricSupply: initialData?.fabricSupply ?? false,
      deadline: initialData?.deadline ?? '',
      notes: initialData?.notes ?? '',
      items: defaultItems,
    },
  })

  useEffect(() => {
    if (!initialData) return

    form.reset({
      type: orderType,
      clientId: initialData.clientId,
      currency: initialData.currency ?? 'MAD',
      fabricSupply: initialData.fabricSupply ?? false,
      deadline: initialData.deadline ?? '',
      notes: initialData.notes ?? '',
      items: initialData.items.length > 0 ? initialData.items : [orderType === 'STUDY' ? emptyStudyItem : emptyProductItem],
    })
  }, [form, initialData, orderType])

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

  const isStudy = orderType === 'STUDY'
  const title = mode === 'edit'
    ? (isStudy ? 'Modifier le devis bureau d\'études' : 'Modifier le devis')
    : (isStudy ? 'Nouveau devis bureau d\'études' : 'Nouveau devis')

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{title}</h1>
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
              {!isStudy && (
                <FormField
                  control={form.control}
                  name="fabricSupply"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fourniture de tissu</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === 'true')}
                        value={field.value ? 'true' : 'false'}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Fourniture de tissu" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Avec fourniture de tissu</SelectItem>
                          <SelectItem value="false">Sans fourniture de tissu</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
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
            <CardHeader><CardTitle>{isStudy ? 'Lignes bureau d\'études' : 'Lignes produits'}</CardTitle></CardHeader>
            <CardContent>
              {isStudy ? <StudyOrderItemsTable /> : <OrderItemsTable />}
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
