# FairwairManager CRM — Plan 2 : Clients + Commandes (S2-S3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prérequis :** Plan 1 complété (fondations, auth, layout, schema Prisma en place).

**Goal:** Implémenter le module Clients (CRUD + mensurations + fiche client) et le module Devis/Commandes (création, lignes produits, calculs HT/TVA/TTC, gestion des statuts).

**Architecture:** API Routes Next.js validées par Zod. Formulaires avec react-hook-form + zodResolver. Liste clients avec TanStack Query pour le server state.

**Tech Stack:** Prisma, Zod, react-hook-form, TanStack Query, shadcn/ui, @hookform/resolvers

---

## Fichiers créés dans ce plan

```
app/
  (dashboard)/
    clients/
      page.tsx               # Liste clients
      new/page.tsx           # Formulaire création
      [id]/page.tsx          # Fiche client (onglets)
    orders/
      page.tsx               # Liste commandes
      new/page.tsx           # Formulaire création devis
      [id]/page.tsx          # Détail commande
app/api/
  clients/
    route.ts                 # GET (liste) + POST (création)
    [id]/
      route.ts               # GET + PUT + DELETE
      measurements/route.ts  # GET + PUT mensurations
  orders/
    route.ts                 # GET + POST
    [id]/
      route.ts               # GET + PUT
      confirm/route.ts       # POST (confirmer devis)
components/
  clients/
    ClientsTable.tsx
    ClientForm.tsx
    MeasurementsForm.tsx
    ClientTabs.tsx
  orders/
    OrdersTable.tsx
    OrderForm.tsx
    OrderItemsTable.tsx
lib/
  validators/
    client.ts                # Zod schemas client
    order.ts                 # Zod schemas commande
  calculations/
    order-reference.ts       # Numérotation DEVIS-YYYY-NNN
```

---

## Task 1 : Validateurs Zod — Client

**Files:**
- Create: `lib/validators/client.ts`, `lib/validators/__tests__/client.test.ts`

- [ ] **Écrire les tests**

```typescript
// lib/validators/__tests__/client.test.ts
import { describe, it, expect } from 'vitest'
import { clientSchema, measurementSchema } from '../client'

describe('clientSchema', () => {
  it('accepts a valid B2B client', () => {
    const result = clientSchema.safeParse({
      type: 'B2B',
      company: 'Hotel Atlas',
      email: 'contact@atlas.ma',
      phone: '0661234567',
      city: 'Agadir',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = clientSchema.safeParse({
      type: 'INDIVIDUAL',
      firstName: 'Zahra',
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('accepts client without email', () => {
    const result = clientSchema.safeParse({
      type: 'INDIVIDUAL',
      firstName: 'Zahra',
      lastName: 'Alaoui',
    })
    expect(result.success).toBe(true)
  })
})

describe('measurementSchema', () => {
  it('accepts partial measurements', () => {
    const result = measurementSchema.safeParse({ shoulder: 38, chest: 90 })
    expect(result.success).toBe(true)
  })

  it('rejects negative values', () => {
    const result = measurementSchema.safeParse({ shoulder: -5 })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Lancer les tests — doivent échouer**

```bash
npx vitest run lib/validators/__tests__/client.test.ts
```

- [ ] **Implémenter `lib/validators/client.ts`**

```typescript
import { z } from 'zod'

export const clientSchema = z.object({
  type: z.enum(['BRAND', 'B2B', 'INDIVIDUAL', 'STUDIO']),
  company: z.string().min(1).optional().or(z.literal('')),
  firstName: z.string().min(1).optional().or(z.literal('')),
  lastName: z.string().min(1).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('MA'),
  ice: z.string().optional(),
  tvaNumber: z.string().optional(),
  notes: z.string().optional(),
})

export const measurementSchema = z.object({
  shoulder: z.number().positive().optional(),
  chest: z.number().positive().optional(),
  waist: z.number().positive().optional(),
  hips: z.number().positive().optional(),
  length: z.number().positive().optional(),
  waistLength: z.number().positive().optional(),
  sleeves: z.number().positive().optional(),
  notes: z.string().optional(),
})

export type ClientInput = z.infer<typeof clientSchema>
export type MeasurementInput = z.infer<typeof measurementSchema>
```

- [ ] **Relancer les tests — doivent passer**

```bash
npx vitest run lib/validators/__tests__/client.test.ts
```

Attendu : 5/5 PASS

- [ ] **Commit**

```bash
git add lib/validators/
git commit -m "feat: add Zod validators for Client and Measurement"
```

---

## Task 2 : API Route clients (GET liste + POST)

**Files:**
- Create: `app/api/clients/route.ts`

- [ ] **Créer `app/api/clients/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clientSchema } from '@/lib/validators/client'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const type = searchParams.get('type') ?? undefined
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')

  const where = {
    active: true,
    ...(type && { type: type as any }),
    ...(search && {
      OR: [
        { company: { contains: search, mode: 'insensitive' as const } },
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: [{ company: 'asc' }, { lastName: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { orders: true, invoices: true } },
      },
    }),
    prisma.client.count({ where }),
  ])

  return NextResponse.json({ clients, total, page, limit })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const parsed = clientSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const client = await prisma.client.create({ data: parsed.data })
  return NextResponse.json(client, { status: 201 })
}
```

- [ ] **Créer `app/api/clients/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clientSchema } from '@/lib/validators/client'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      measurements: true,
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { items: true },
      },
      invoices: {
        orderBy: { issueDate: 'desc' },
        take: 20,
        include: { payments: true },
      },
    },
  })

  if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
  return NextResponse.json(client)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = clientSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const client = await prisma.client.update({ where: { id }, data: parsed.data })
  return NextResponse.json(client)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  await prisma.client.update({ where: { id }, data: { active: false } })
  return NextResponse.json({ success: true })
}
```

- [ ] **Créer `app/api/clients/[id]/measurements/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { measurementSchema } from '@/lib/validators/client'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const measurement = await prisma.measurement.findUnique({ where: { clientId: id } })
  return NextResponse.json(measurement)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = measurementSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const measurement = await prisma.measurement.upsert({
    where: { clientId: id },
    update: parsed.data,
    create: { clientId: id, ...parsed.data },
  })
  return NextResponse.json(measurement)
}
```

- [ ] **Tester avec curl**

```bash
# Créer un client test (remplacer TOKEN par un JWT Supabase valide)
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=TOKEN" \
  -d '{"type":"B2B","company":"Hotel Test","city":"Agadir"}'
```

Attendu : `{"id":"...","type":"B2B","company":"Hotel Test",...}` avec status 201.

- [ ] **Commit**

```bash
git add app/api/clients/
git commit -m "feat: add clients CRUD API routes with Zod validation"
```

---

## Task 3 : Liste clients (page)

**Files:**
- Create: `components/clients/ClientsTable.tsx`, `app/(dashboard)/clients/page.tsx`

- [ ] **Créer `components/clients/ClientsTable.tsx`**

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import Link from 'next/link'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CLIENT_TYPE_LABELS } from '@/types'
import { Plus, Search } from 'lucide-react'

type ClientRow = {
  id: string
  type: string
  company: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
  city: string | null
  _count: { orders: number; invoices: number }
}

const typeVariants: Record<string, 'info' | 'success' | 'warning' | 'muted'> = {
  BRAND: 'info',
  B2B: 'success',
  INDIVIDUAL: 'warning',
  STUDIO: 'muted',
}

export function ClientsTable() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState<string>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search, type],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (type !== 'all') params.set('type', type)
      const res = await fetch(`/api/clients?${params}`)
      if (!res.ok) throw new Error('Erreur chargement clients')
      return res.json() as Promise<{ clients: ClientRow[]; total: number }>
    },
  })

  function displayName(c: ClientRow) {
    if (c.company) return c.company
    return [c.firstName, c.lastName].filter(Boolean).join(' ') || '—'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
        <Link href="/clients/new">
          <Button><Plus size={16} className="mr-2" />Nouveau client</Button>
        </Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Rechercher un client…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {Object.entries(CLIENT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-slate-500 py-8 text-center">Chargement…</div>
      ) : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom / Société</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead className="text-right">Commandes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.clients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                    Aucun client trouvé
                  </TableCell>
                </TableRow>
              )}
              {data?.clients.map((client) => (
                <TableRow key={client.id} className="cursor-pointer hover:bg-slate-50">
                  <TableCell>
                    <Link href={`/clients/${client.id}`} className="font-medium hover:underline">
                      {displayName(client)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={CLIENT_TYPE_LABELS[client.type as keyof typeof CLIENT_TYPE_LABELS]}
                      variant={typeVariants[client.type]}
                    />
                  </TableCell>
                  <TableCell className="text-slate-500">{client.email ?? '—'}</TableCell>
                  <TableCell className="text-slate-500">{client.city ?? '—'}</TableCell>
                  <TableCell className="text-right text-slate-500">{client._count.orders}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {data && (
        <p className="text-sm text-slate-500">{data.total} client{data.total > 1 ? 's' : ''}</p>
      )}
    </div>
  )
}
```

- [ ] **Créer `app/(dashboard)/clients/page.tsx`**

```typescript
import { ClientsTable } from '@/components/clients/ClientsTable'

export const metadata = { title: 'Clients — FairwairManager' }

export default function ClientsPage() {
  return <ClientsTable />
}
```

- [ ] **Tester manuellement**

```bash
npm run dev
```

Naviguer vers /clients → tableau vide mais sans erreur. Créer un client via l'API et vérifier qu'il apparaît.

- [ ] **Commit**

```bash
git add app/\(dashboard\)/clients/ components/clients/ClientsTable.tsx
git commit -m "feat: add clients list page with search and type filter"
```

---

## Task 4 : Formulaire client (création + édition)

**Files:**
- Create: `components/clients/ClientForm.tsx`, `app/(dashboard)/clients/new/page.tsx`

- [ ] **Créer `components/clients/ClientForm.tsx`**

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { clientSchema, type ClientInput } from '@/lib/validators/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { CLIENT_TYPE_LABELS } from '@/types'

interface ClientFormProps {
  defaultValues?: Partial<ClientInput>
  clientId?: string
}

export function ClientForm({ defaultValues, clientId }: ClientFormProps) {
  const router = useRouter()
  const form = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      type: 'B2B',
      country: 'MA',
      ...defaultValues,
    },
  })

  async function onSubmit(data: ClientInput) {
    const url = clientId ? `/api/clients/${clientId}` : '/api/clients'
    const method = clientId ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      form.setError('root', { message: 'Erreur lors de l\'enregistrement' })
      return
    }

    const client = await res.json()
    router.push(`/clients/${client.id}`)
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{clientId ? 'Modifier le client' : 'Nouveau client'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de client</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(CLIENT_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Société</FormLabel>
                    <FormControl><Input {...field} placeholder="Fairwear SA" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ICE</FormLabel>
                    <FormControl><Input {...field} placeholder="001234567000000" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input {...field} type="email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea {...field} rows={3} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  )
}
```

- [ ] **Créer `app/(dashboard)/clients/new/page.tsx`**

```typescript
import { ClientForm } from '@/components/clients/ClientForm'

export const metadata = { title: 'Nouveau client — FairwairManager' }

export default function NewClientPage() {
  return <ClientForm />
}
```

- [ ] **Tester manuellement**

Naviguer vers /clients/new → remplir le formulaire → soumettre → vérifier la redirection vers la fiche client créée.

- [ ] **Commit**

```bash
git add components/clients/ClientForm.tsx app/\(dashboard\)/clients/new/
git commit -m "feat: add client creation form"
```

---

## Task 5 : Formulaire mensurations

**Files:**
- Create: `components/clients/MeasurementsForm.tsx`

- [ ] **Créer `components/clients/MeasurementsForm.tsx`**

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { measurementSchema, type MeasurementInput } from '@/lib/validators/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'

interface MeasurementsFormProps {
  clientId: string
  defaultValues?: Partial<MeasurementInput>
}

const fields: { name: keyof MeasurementInput; label: string }[] = [
  { name: 'shoulder', label: 'Épaule (cm)' },
  { name: 'chest', label: 'Poitrine (cm)' },
  { name: 'waist', label: 'Ceinture (cm)' },
  { name: 'hips', label: 'Bassin (cm)' },
  { name: 'length', label: 'Longueur (cm)' },
  { name: 'waistLength', label: 'Longueur de taille (cm)' },
  { name: 'sleeves', label: 'Manches (cm)' },
]

export function MeasurementsForm({ clientId, defaultValues }: MeasurementsFormProps) {
  const queryClient = useQueryClient()
  const form = useForm<MeasurementInput>({
    resolver: zodResolver(measurementSchema),
    defaultValues: defaultValues ?? {},
  })

  async function onSubmit(data: MeasurementInput) {
    const res = await fetch(`/api/clients/${clientId}/measurements`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      form.setError('root', { message: 'Erreur lors de l\'enregistrement' })
      return
    }
    queryClient.invalidateQueries({ queryKey: ['client', clientId] })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {fields.map(({ name, label }) => (
            <FormField
              key={name}
              control={form.control}
              name={name as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.5"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl><Textarea {...field} rows={2} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root && (
          <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Enregistrement…' : 'Enregistrer les mensurations'}
        </Button>
      </form>
    </Form>
  )
}
```

- [ ] **Commit**

```bash
git add components/clients/MeasurementsForm.tsx
git commit -m "feat: add measurements form component"
```

---

## Task 6 : Fiche client (onglets)

**Files:**
- Create: `components/clients/ClientTabs.tsx`, `app/(dashboard)/clients/[id]/page.tsx`

- [ ] **Créer `components/clients/ClientTabs.tsx`**

```typescript
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
          <StatusBadge label={CLIENT_TYPE_LABELS[client.type]} variant="info" />
        </div>
        <div className="flex gap-2">
          <Link href={`/orders/new?clientId=${clientId}`}>
            <Button><Plus size={16} className="mr-2" />Nouvelle commande</Button>
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
                        <td className="text-right"><CurrencyDisplay amount={order.totalTTC} /></td>
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
```

- [ ] **Créer `app/(dashboard)/clients/[id]/page.tsx`**

```typescript
import { ClientTabs } from '@/components/clients/ClientTabs'

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ClientTabs clientId={id} />
}
```

- [ ] **Tester manuellement**

Naviguer vers /clients → cliquer sur un client → vérifier les 4 onglets.

- [ ] **Commit**

```bash
git add components/clients/ClientTabs.tsx app/\(dashboard\)/clients/\[id\]/
git commit -m "feat: add client detail page with tabbed view"
```

---

## Task 7 : Validateurs Zod — Commandes

**Files:**
- Create: `lib/validators/order.ts`, `lib/calculations/order-reference.ts`

- [ ] **Écrire les tests**

```typescript
// lib/validators/__tests__/order.test.ts
import { describe, it, expect } from 'vitest'
import { orderItemSchema, orderSchema } from '../order'

describe('orderItemSchema', () => {
  it('accepts valid item with sizes', () => {
    const result = orderItemSchema.safeParse({
      designation: 'T-shirt blanc',
      sizeM: 10,
      sizeL: 5,
      quantity: 15,
      unitPrice: 85,
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative unit price', () => {
    const result = orderItemSchema.safeParse({
      designation: 'Robe',
      quantity: 1,
      unitPrice: -50,
    })
    expect(result.success).toBe(false)
  })
})
```

```typescript
// lib/calculations/__tests__/order-reference.test.ts
import { describe, it, expect } from 'vitest'
import { formatOrderReference, parseOrderYear } from '../order-reference'

describe('formatOrderReference', () => {
  it('formats reference with year and padded sequence', () => {
    expect(formatOrderReference(2026, 42)).toBe('DEVIS-2026-042')
  })

  it('pads to 3 digits', () => {
    expect(formatOrderReference(2026, 1)).toBe('DEVIS-2026-001')
  })
})

describe('parseOrderYear', () => {
  it('extracts year from reference', () => {
    expect(parseOrderYear('DEVIS-2026-042')).toBe(2026)
  })
})
```

- [ ] **Lancer les tests — doivent échouer**

```bash
npx vitest run lib/validators/__tests__/order.test.ts lib/calculations/__tests__/order-reference.test.ts
```

- [ ] **Implémenter `lib/validators/order.ts`**

```typescript
import { z } from 'zod'

export const orderItemSchema = z.object({
  designation: z.string().min(1, 'Désignation requise'),
  sizeS: z.number().int().min(0).default(0),
  sizeM: z.number().int().min(0).default(0),
  sizeL: z.number().int().min(0).default(0),
  sizeXL: z.number().int().min(0).default(0),
  sizeTU: z.number().int().min(0).default(0),
  quantity: z.number().int().min(0).default(0),
  unitPrice: z.number().positive('Le prix doit être positif'),
  notes: z.string().optional(),
})

export const orderSchema = z.object({
  clientId: z.string().uuid('Client requis'),
  deadline: z.string().datetime().optional().or(z.literal('')),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'Au moins une ligne requise'),
})

export type OrderItemInput = z.infer<typeof orderItemSchema>
export type OrderInput = z.infer<typeof orderSchema>
```

- [ ] **Implémenter `lib/calculations/order-reference.ts`**

```typescript
export function formatOrderReference(year: number, sequence: number): string {
  return `DEVIS-${year}-${String(sequence).padStart(3, '0')}`
}

export function parseOrderYear(reference: string): number {
  const match = reference.match(/DEVIS-(\d{4})-/)
  return match ? parseInt(match[1]) : new Date().getFullYear()
}
```

- [ ] **Relancer les tests**

```bash
npx vitest run lib/validators/__tests__/order.test.ts lib/calculations/__tests__/order-reference.test.ts
```

Attendu : 5/5 PASS

- [ ] **Commit**

```bash
git add lib/validators/order.ts lib/calculations/order-reference.ts lib/validators/__tests__/ lib/calculations/__tests__/order-reference.test.ts
git commit -m "feat: add order validators and reference formatting"
```

---

## Task 8 : API Routes commandes

**Files:**
- Create: `app/api/orders/route.ts`, `app/api/orders/[id]/route.ts`, `app/api/orders/[id]/confirm/route.ts`

- [ ] **Créer `app/api/orders/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { orderSchema } from '@/lib/validators/order'
import { calculateOrderTotals } from '@/lib/calculations/invoice'
import { formatOrderReference } from '@/lib/calculations/order-reference'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? undefined
  const clientId = searchParams.get('clientId') ?? undefined

  const orders = await prisma.order.findMany({
    where: {
      ...(status && { status: status as any }),
      ...(clientId && { clientId }),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      client: { select: { id: true, company: true, firstName: true, lastName: true } },
      items: true,
    },
  })

  return NextResponse.json(orders)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const parsed = orderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const { items, clientId, deadline, notes } = parsed.data

  // Numérotation séquentielle par année
  const year = new Date().getFullYear()
  const lastOrder = await prisma.order.findFirst({
    where: { reference: { startsWith: `DEVIS-${year}-` } },
    orderBy: { reference: 'desc' },
  })
  const lastSeq = lastOrder
    ? parseInt(lastOrder.reference.split('-')[2])
    : 0
  const reference = formatOrderReference(year, lastSeq + 1)

  // Calcul des totaux
  const itemsWithTotals = items.map((item) => ({
    ...item,
    totalPrice: Math.round(item.quantity * item.unitPrice * 100) / 100,
  }))
  const { totalHT, totalTTC } = calculateOrderTotals(items)

  const order = await prisma.order.create({
    data: {
      reference,
      clientId,
      deadline: deadline ? new Date(deadline) : undefined,
      notes,
      totalHT,
      totalTTC,
      items: { create: itemsWithTotals },
    },
    include: { items: true },
  })

  return NextResponse.json(order, { status: 201 })
}
```

- [ ] **Créer `app/api/orders/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateStatusSchema = z.object({
  status: z.enum(['QUOTE','CONFIRMED','SOURCING','STUDY','PRODUCTION','READY','DELIVERED','INVOICED','PAID','CANCELLED']),
  notes: z.string().optional(),
  deadline: z.string().datetime().optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      client: true,
      items: true,
      production: true,
      invoice: { include: { payments: true } },
    },
  })
  if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  return NextResponse.json(order)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = updateStatusSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const order = await prisma.order.update({
    where: { id },
    data: {
      status: parsed.data.status,
      ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
      ...(parsed.data.deadline && { deadline: new Date(parsed.data.deadline) }),
    },
  })
  return NextResponse.json(order)
}
```

- [ ] **Créer `app/api/orders/[id]/confirm/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  if (order.status !== 'QUOTE') {
    return NextResponse.json({ error: 'Seul un devis peut être confirmé' }, { status: 400 })
  }

  const [updatedOrder] = await prisma.$transaction([
    prisma.order.update({ where: { id }, data: { status: 'CONFIRMED' } }),
    prisma.productionPlan.create({ data: { orderId: id } }),
  ])

  return NextResponse.json(updatedOrder)
}
```

- [ ] **Commit**

```bash
git add app/api/orders/
git commit -m "feat: add orders CRUD API routes with auto-numbering and production plan creation"
```

---

## Task 9 : Formulaire création devis (UI)

**Files:**
- Create: `components/orders/OrderForm.tsx`, `components/orders/OrderItemsTable.tsx`, `app/(dashboard)/orders/new/page.tsx`, `app/(dashboard)/orders/page.tsx`, `app/(dashboard)/orders/[id]/page.tsx`

- [ ] **Créer `components/orders/OrderItemsTable.tsx`**

```typescript
'use client'

import { useFieldArray, useFormContext } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, FormControl, FormItem, FormMessage } from '@/components/ui/form'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { Trash2, Plus } from 'lucide-react'
import type { OrderInput } from '@/lib/validators/order'

export function OrderItemsTable() {
  const { control, watch } = useFormContext<OrderInput>()
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const items = watch('items')

  function lineTotal(index: number) {
    const item = items[index]
    if (!item) return 0
    return Math.round(item.quantity * (item.unitPrice ?? 0) * 100) / 100
  }

  const totalHT = items.reduce((sum, item, i) => sum + lineTotal(i), 0)
  const tva = Math.round(totalHT * 0.2 * 100) / 100
  const ttc = Math.round((totalHT + tva) * 100) / 100

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-slate-500 text-left">
              <th className="pb-2 pr-2">Désignation</th>
              <th className="pb-2 px-2 text-center">S</th>
              <th className="pb-2 px-2 text-center">M</th>
              <th className="pb-2 px-2 text-center">L</th>
              <th className="pb-2 px-2 text-center">XL</th>
              <th className="pb-2 px-2 text-center">TU</th>
              <th className="pb-2 px-2 text-center">Qté</th>
              <th className="pb-2 px-2 text-right">Prix unit.</th>
              <th className="pb-2 px-2 text-right">Total</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <tr key={field.id} className="border-b">
                <td className="py-2 pr-2">
                  <FormField control={control} name={`items.${index}.designation`} render={({ field }) => (
                    <FormItem><FormControl><Input {...field} placeholder="T-shirt blanc" /></FormControl><FormMessage /></FormItem>
                  )} />
                </td>
                {(['sizeS', 'sizeM', 'sizeL', 'sizeXL', 'sizeTU'] as const).map((size) => (
                  <td key={size} className="py-2 px-2">
                    <FormField control={control} name={`items.${index}.${size}`} render={({ field }) => (
                      <FormItem><FormControl><Input {...field} type="number" min="0" className="w-14 text-center" onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl></FormItem>
                    )} />
                  </td>
                ))}
                <td className="py-2 px-2">
                  <FormField control={control} name={`items.${index}.quantity`} render={({ field }) => (
                    <FormItem><FormControl><Input {...field} type="number" min="0" className="w-16 text-center" onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl></FormItem>
                  )} />
                </td>
                <td className="py-2 px-2">
                  <FormField control={control} name={`items.${index}.unitPrice`} render={({ field }) => (
                    <FormItem><FormControl><Input {...field} type="number" min="0" step="0.01" className="w-24 text-right" onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl></FormItem>
                  )} />
                </td>
                <td className="py-2 px-2 text-right font-medium">
                  <CurrencyDisplay amount={lineTotal(index)} />
                </td>
                <td className="py-2 pl-2">
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                    <Trash2 size={14} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ designation: '', sizeS: 0, sizeM: 0, sizeL: 0, sizeXL: 0, sizeTU: 0, quantity: 0, unitPrice: 0 })}
      >
        <Plus size={14} className="mr-2" />Ajouter une ligne
      </Button>

      <div className="flex justify-end">
        <div className="text-sm space-y-1 min-w-48">
          <div className="flex justify-between text-slate-600"><span>Total HT</span><CurrencyDisplay amount={totalHT} /></div>
          <div className="flex justify-between text-slate-600"><span>TVA 20%</span><CurrencyDisplay amount={tva} /></div>
          <div className="flex justify-between font-bold text-slate-900 border-t pt-1"><span>Total TTC</span><CurrencyDisplay amount={ttc} /></div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Créer `components/orders/OrderForm.tsx`**

```typescript
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
    resolver: zodResolver(orderSchema),
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
```

- [ ] **Créer les pages de commandes**

`app/(dashboard)/orders/page.tsx` :

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { ORDER_STATUS_LABELS } from '@/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function OrdersPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders')
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Commandes & Devis</h1>
        <Link href="/orders/new"><Button><Plus size={16} className="mr-2" />Nouveau devis</Button></Link>
      </div>
      {isLoading ? <div className="text-slate-500">Chargement…</div> : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead className="text-right">Total TTC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders?.map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link href={`/orders/${order.id}`} className="font-medium hover:underline">{order.reference}</Link>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {order.client?.company || [order.client?.firstName, order.client?.lastName].filter(Boolean).join(' ')}
                  </TableCell>
                  <TableCell><StatusBadge label={ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]} variant="muted" /></TableCell>
                  <TableCell className="text-slate-500">{format(new Date(order.orderDate), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                  <TableCell className="text-slate-500">{order.deadline ? format(new Date(order.deadline), 'dd/MM/yyyy', { locale: fr }) : '—'}</TableCell>
                  <TableCell className="text-right"><CurrencyDisplay amount={order.totalTTC} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
```

`app/(dashboard)/orders/new/page.tsx` :

```typescript
import { OrderForm } from '@/components/orders/OrderForm'

export const metadata = { title: 'Nouveau devis — FairwairManager' }

export default function NewOrderPage() {
  return <OrderForm />
}
```

`app/(dashboard)/orders/[id]/page.tsx` :

```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
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
```

- [ ] **Tester manuellement**

Naviguer vers /orders/new → créer un devis → vérifier la numérotation `DEVIS-2026-001` → confirmer → vérifier le changement de statut et la création du plan de production.

- [ ] **Lancer tous les tests**

```bash
npx vitest run
```

Attendu : tous les tests passent.

- [ ] **Commit final S2-S3**

```bash
git add -A
git commit -m "feat: complete S2-S3 - clients and orders modules"
```

---

## Vérification finale S2-S3

- [ ] `npm run build` sans erreur TypeScript
- [ ] Liste clients avec recherche et filtre par type
- [ ] Création client → fiche client avec onglets
- [ ] Mensurations sauvegardées en base
- [ ] Création devis → numérotation automatique → confirmation → plan de production créé
- [ ] `npx vitest run` : tous les tests passent

**Fin du Plan 2 — Passer au Plan 3 : Facturation + Trésorerie + Dashboard**
