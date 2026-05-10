# FairwairManager CRM — Plan 1 : Fondations (S1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialiser le projet Next.js 15 avec TypeScript, Tailwind, shadcn/ui, Prisma, Supabase Auth et le layout dashboard — fondations complètes avant tout module métier.

**Architecture:** Next.js 15 App Router monorepo. Routes `/(dashboard)/*` protégées par middleware Next.js vérifiant le JWT Supabase. Prisma schema complet dès S1 pour éviter les migrations destructives en Phase 2.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Prisma, Supabase (@supabase/ssr), Zod, Vitest

---

## Fichiers créés dans ce plan

```
fairwair-manager/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── globals.css
├── components/
│   └── layout/
│       ├── Sidebar.tsx
│       └── Header.tsx
├── lib/
│   ├── prisma.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   └── auth.ts
├── middleware.ts
├── prisma/
│   └── schema.prisma
├── types/
│   └── index.ts
├── .env.local               (non commité)
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## Task 1 : Initialisation du projet Next.js 15

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `app/globals.css`

- [ ] **Créer le projet**

```bash
cd /Users/fanedoulkevin/Documents/dev
npx create-next-app@latest fairwair-manager \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"
cd fairwair-manager
```

- [ ] **Installer les dépendances**

```bash
npm install \
  @supabase/supabase-js \
  @supabase/ssr \
  @prisma/client \
  @tanstack/react-query \
  zustand \
  zod \
  react-hook-form \
  @hookform/resolvers \
  @react-pdf/renderer \
  clsx \
  tailwind-merge \
  lucide-react \
  date-fns

npm install -D \
  prisma \
  vitest \
  @vitejs/plugin-react \
  @testing-library/react \
  @testing-library/jest-dom \
  jsdom
```

- [ ] **Installer shadcn/ui**

```bash
npx shadcn@latest init
```

Répondre : Style → Default, Base color → Slate, CSS variables → yes.

```bash
npx shadcn@latest add button input label form table badge card dialog dropdown-menu select separator sheet skeleton tabs toast
```

- [ ] **Configurer vitest**

Créer `vitest.config.ts` :

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

Créer `vitest.setup.ts` :

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Vérifier que le projet démarre**

```bash
npm run dev
```

Attendu : serveur sur http://localhost:3000 sans erreur.

- [ ] **Commit**

```bash
git add -A
git commit -m "chore: init Next.js 15 project with shadcn/ui and Vitest"
```

---

## Task 2 : Variables d'environnement

**Files:**
- Create: `.env.local`, `.env.example`

- [ ] **Créer `.env.local`** (ne pas commiter)

```bash
cat > .env.local << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://VOTRE_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=VOTRE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=VOTRE_SERVICE_ROLE_KEY

# Database (Prisma)
DATABASE_URL=postgresql://postgres:VOTRE_MOT_DE_PASSE@db.VOTRE_PROJECT_ID.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:VOTRE_MOT_DE_PASSE@db.VOTRE_PROJECT_ID.supabase.co:5432/postgres
EOF
```

- [ ] **Créer `.env.example`** (commité — template sans valeurs)

```bash
cat > .env.example << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
DIRECT_URL=
EOF
```

- [ ] **Ajouter `.env.local` au `.gitignore`**

Vérifier que `.gitignore` contient déjà `.env.local` (create-next-app l'ajoute par défaut).

- [ ] **Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: add env example template"
```

---

## Task 3 : Schéma Prisma complet

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Initialiser Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Remplacer `prisma/schema.prisma` par le schéma complet**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ─── UTILISATEURS ───────────────────────────────────────────

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  role      UserRole @default(COMMERCIAL)
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  todos          Todo[]
  productionItems ProductionPlanningItem[]
  timesheets     Timesheet[]
}

enum UserRole {
  ADMIN
  COMMERCIAL
  PRODUCTION
  COMPTABLE
  RH
}

// ─── CLIENTS ────────────────────────────────────────────────

model Client {
  id          String     @id @default(uuid())
  type        ClientType @default(BRAND)
  company     String?
  firstName   String?
  lastName    String?
  email       String?
  phone       String?
  address     String?
  city        String?
  country     String     @default("MA")
  ice         String?
  tvaNumber   String?
  notes       String?
  active      Boolean    @default(true)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  measurements    Measurement?
  orders          Order[]
  invoices        Invoice[]

  @@index([company])
  @@index([lastName])
}

enum ClientType {
  BRAND
  B2B
  INDIVIDUAL
  STUDIO
}

model Measurement {
  id          String   @id @default(uuid())
  clientId    String   @unique
  client      Client   @relation(fields: [clientId], references: [id])
  shoulder    Float?
  chest       Float?
  waist       Float?
  hips        Float?
  length      Float?
  waistLength Float?
  sleeves     Float?
  notes       String?
  updatedAt   DateTime @updatedAt
}

// ─── COMMANDES & DEVIS ──────────────────────────────────────

model Order {
  id        String      @id @default(uuid())
  reference String      @unique
  clientId  String
  client    Client      @relation(fields: [clientId], references: [id])
  status    OrderStatus @default(QUOTE)
  orderDate DateTime    @default(now())
  deadline  DateTime?
  totalHT   Decimal     @db.Decimal(12, 2) @default(0)
  totalTTC  Decimal     @db.Decimal(12, 2) @default(0)
  currency  String      @default("MAD")
  notes     String?
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  items      OrderItem[]
  production ProductionPlan?
  invoice    Invoice?
  payments   Payment[]

  @@index([clientId])
  @@index([status])
}

enum OrderStatus {
  QUOTE
  CONFIRMED
  SOURCING
  STUDY
  PRODUCTION
  READY
  DELIVERED
  INVOICED
  PAID
  CANCELLED
}

model OrderItem {
  id          String  @id @default(uuid())
  orderId     String
  order       Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  designation String
  sizeS       Int     @default(0)
  sizeM       Int     @default(0)
  sizeL       Int     @default(0)
  sizeXL      Int     @default(0)
  sizeTU      Int     @default(0)
  quantity    Int     @default(0)
  unitPrice   Decimal @db.Decimal(10, 2)
  totalPrice  Decimal @db.Decimal(10, 2)
  notes       String?

  @@index([orderId])
}

// ─── FACTURATION ────────────────────────────────────────────

model Invoice {
  id                   String        @id @default(uuid())
  number               String        @unique
  clientId             String
  client               Client        @relation(fields: [clientId], references: [id])
  orderId              String?       @unique
  order                Order?        @relation(fields: [orderId], references: [id])
  issueDate            DateTime      @default(now())
  dueDate              DateTime?
  totalHT              Decimal       @db.Decimal(12, 2)
  tvaRate              Decimal       @db.Decimal(5, 4) @default(0.20)
  tvaAmount            Decimal       @db.Decimal(12, 2)
  stampDuty            Decimal       @db.Decimal(8, 2) @default(0)
  totalTTC             Decimal       @db.Decimal(12, 2)
  status               InvoiceStatus @default(PENDING)
  pdfUrl               String?
  accountingExported   Boolean       @default(false)
  accountingExportedAt DateTime?
  notes                String?
  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt

  payments Payment[]

  @@index([clientId])
  @@index([status])
}

enum InvoiceStatus {
  DRAFT
  PENDING
  PARTIAL
  PAID
  OVERDUE
  CANCELLED
}

model Payment {
  id        String        @id @default(uuid())
  invoiceId String?
  invoice   Invoice?      @relation(fields: [invoiceId], references: [id])
  orderId   String?
  order     Order?        @relation(fields: [orderId], references: [id])
  date      DateTime
  amount    Decimal       @db.Decimal(12, 2)
  method    PaymentMethod
  reference String?
  notes     String?
  createdAt DateTime      @default(now())
}

enum PaymentMethod {
  CASH
  BANK_TRANSFER
  CHECK
  MOBILE_PAYMENT
}

// ─── PRODUCTION ─────────────────────────────────────────────

model ProductionPlan {
  id             String    @id @default(uuid())
  orderId        String    @unique
  order          Order     @relation(fields: [orderId], references: [id])
  sourcingDone   Boolean   @default(false)
  sourcingDate   DateTime?
  studyDone      Boolean   @default(false)
  studyDate      DateTime?
  productionDone Boolean   @default(false)
  productionDate DateTime?
  deliveryDone   Boolean   @default(false)
  deliveryDate   DateTime?
  notes          String?
  updatedAt      DateTime  @updatedAt
}

model ProductionPlanningItem {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  weekStart  DateTime
  dayOfWeek  Int
  tasks      String
  orderId    String?
  createdAt  DateTime @default(now())

  @@index([weekStart, userId])
}

// ─── RH ─────────────────────────────────────────────────────

model Employee {
  id         String   @id @default(uuid())
  name       String
  role       String?
  hourlyRate Decimal  @db.Decimal(8, 2)
  active     Boolean  @default(true)
  createdAt  DateTime @default(now())

  timesheets Timesheet[]
  salaries   Salary[]
}

model Timesheet {
  id            String   @id @default(uuid())
  employeeId    String
  employee      Employee @relation(fields: [employeeId], references: [id])
  userId        String?
  user          User?    @relation(fields: [userId], references: [id])
  date          DateTime
  startTime     DateTime
  endTime       DateTime
  breakDuration Float    @default(0.5)
  totalHours    Float
  notes         String?
  createdAt     DateTime @default(now())

  @@index([employeeId, date])
}

model Salary {
  id            String   @id @default(uuid())
  employeeId    String
  employee      Employee @relation(fields: [employeeId], references: [id])
  weekStart     DateTime
  weekEnd       DateTime
  normalHours   Float
  overtimeHours Float
  baseSalary    Decimal  @db.Decimal(10, 2)
  bonuses       Decimal  @db.Decimal(10, 2) @default(0)
  advances      Decimal  @db.Decimal(10, 2) @default(0)
  totalPaid     Decimal  @db.Decimal(10, 2)
  paidAt        DateTime?
  notes         String?
  createdAt     DateTime @default(now())
}

// ─── TRÉSORERIE ─────────────────────────────────────────────

model CashEntry {
  id          String        @id @default(uuid())
  date        DateTime
  label       String
  amount      Decimal       @db.Decimal(10, 2)
  type        CashEntryType
  category    String?
  reference   String?
  balance     Decimal       @db.Decimal(12, 2)
  periodStart DateTime?
  periodEnd   DateTime?
  createdAt   DateTime      @default(now())
}

enum CashEntryType {
  INCOME
  EXPENSE
}

// ─── FOURNISSEURS ────────────────────────────────────────────

model Supplier {
  id        String   @id @default(uuid())
  name      String
  type      String?
  phone     String?
  email     String?
  city      String?
  ice       String?
  active    Boolean  @default(true)
  notes     String?
  createdAt DateTime @default(now())

  purchases SupplierPurchase[]
}

model SupplierPurchase {
  id                 String         @id @default(uuid())
  supplierId         String
  supplier           Supplier       @relation(fields: [supplierId], references: [id])
  date               DateTime
  invoiceNumber      String?
  description        String
  amountHT           Decimal        @db.Decimal(10, 2)
  tvaRate            Decimal        @db.Decimal(5, 4) @default(0.20)
  tvaAmount          Decimal        @db.Decimal(10, 2) @default(0)
  totalTTC           Decimal        @db.Decimal(10, 2)
  stamps             Decimal        @db.Decimal(8, 2) @default(0)
  paymentMethod      PaymentMethod?
  paymentDate        DateTime?
  amountPaid         Decimal        @db.Decimal(10, 2) @default(0)
  accountingExported Boolean        @default(false)
  notes              String?
  createdAt          DateTime       @default(now())

  @@index([supplierId])
}

// ─── TÂCHES ─────────────────────────────────────────────────

model Todo {
  id        String     @id @default(uuid())
  title     String
  status    TodoStatus @default(TODO)
  ownerId   String?
  owner     User?      @relation(fields: [ownerId], references: [id])
  notes     String?
  dueDate   DateTime?
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

enum TodoStatus {
  TODO
  IN_PROGRESS
  BLOCKED
  DONE
}

// ─── RÉFÉRENTIEL TARIFAIRE ───────────────────────────────────

model PriceList {
  id          String   @id @default(uuid())
  supplierId  String?
  category    String
  designation String
  unitPrice   Decimal  @db.Decimal(10, 2)
  currency    String   @default("MAD")
  minQty      Int?
  notes       String?
  validFrom   DateTime @default(now())
  validTo     DateTime?
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
}
```

- [ ] **Lancer la migration**

```bash
npx prisma migrate dev --name init_schema
```

Attendu : migration créée et appliquée sans erreur, `prisma generate` lancé automatiquement.

- [ ] **Vérifier le schema dans Supabase Studio**

Ouvrir https://app.supabase.com → votre projet → Table Editor. Toutes les tables doivent être visibles.

- [ ] **Commit**

```bash
git add prisma/
git commit -m "feat: add complete Prisma schema with all Phase 1-3 tables"
```

---

## Task 4 : Singleton Prisma Client

**Files:**
- Create: `lib/prisma.ts`

- [ ] **Écrire le test**

Créer `lib/__tests__/prisma.test.ts` :

```typescript
import { describe, it, expect } from 'vitest'

describe('prisma singleton', () => {
  it('returns the same instance on multiple imports', async () => {
    const { prisma: a } = await import('../prisma')
    const { prisma: b } = await import('../prisma')
    expect(a).toBe(b)
  })
})
```

- [ ] **Lancer le test — doit échouer**

```bash
npx vitest run lib/__tests__/prisma.test.ts
```

Attendu : FAIL "Cannot find module '../prisma'"

- [ ] **Implémenter `lib/prisma.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Relancer le test — doit passer**

```bash
npx vitest run lib/__tests__/prisma.test.ts
```

Attendu : PASS

- [ ] **Commit**

```bash
git add lib/prisma.ts lib/__tests__/prisma.test.ts
git commit -m "feat: add Prisma singleton client"
```

---

## Task 5 : Clients Supabase (browser + server)

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`

- [ ] **Créer `lib/supabase/client.ts`** (composants client)

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Créer `lib/supabase/server.ts`** (Server Components + API Routes)

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Commit**

```bash
git add lib/supabase/
git commit -m "feat: add Supabase browser and server clients"
```

---

## Task 6 : Middleware d'authentification

**Files:**
- Create: `middleware.ts`

- [ ] **Créer `middleware.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/') &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/_next') &&
    !request.nextUrl.pathname.startsWith('/api/auth')

  if (!user && isDashboardRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Commit**

```bash
git add middleware.ts
git commit -m "feat: add Supabase auth middleware protecting dashboard routes"
```

---

## Task 7 : Page de login

**Files:**
- Create: `app/(auth)/login/page.tsx`

- [ ] **Créer `app/(auth)/login/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">FairwairManager</CardTitle>
          <CardDescription>Connectez-vous à votre espace</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="safa@fairwear.ma"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Tester manuellement**

```bash
npm run dev
```

Naviguer vers http://localhost:3000/login. Le formulaire s'affiche. Tenter une connexion avec de fausses credentials → message d'erreur affiché.

- [ ] **Commit**

```bash
git add app/\(auth\)/
git commit -m "feat: add login page with Supabase auth"
```

---

## Task 8 : Types globaux

**Files:**
- Create: `types/index.ts`

- [ ] **Créer `types/index.ts`**

```typescript
import type { UserRole, ClientType, OrderStatus, InvoiceStatus, PaymentMethod, CashEntryType, TodoStatus } from '@prisma/client'

export type { UserRole, ClientType, OrderStatus, InvoiceStatus, PaymentMethod, CashEntryType, TodoStatus }

export type NavItem = {
  label: string
  href: string
  icon: string
}

export type KpiCard = {
  title: string
  value: string | number
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
}

// Helpers d'affichage
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  QUOTE: 'Devis',
  CONFIRMED: 'Confirmée',
  SOURCING: 'Sourcing',
  STUDY: 'Bureau d\'étude',
  PRODUCTION: 'Production',
  READY: 'Prêt',
  DELIVERED: 'Livré',
  INVOICED: 'Facturé',
  PAID: 'Réglé',
  CANCELLED: 'Annulé',
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Brouillon',
  PENDING: 'En attente',
  PARTIAL: 'Partiellement réglé',
  PAID: 'Réglé',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulé',
}

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  BRAND: 'Marque',
  B2B: 'B2B',
  INDIVIDUAL: 'Particulier',
  STUDIO: 'Studio',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement BMCE',
  CHECK: 'Chèque',
  MOBILE_PAYMENT: 'Paiement mobile',
}

export const TODO_STATUS_LABELS: Record<TodoStatus, string> = {
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  BLOCKED: 'Bloqué',
  DONE: 'Terminé',
}
```

- [ ] **Commit**

```bash
git add types/index.ts
git commit -m "feat: add global TypeScript types and display label maps"
```

---

## Task 9 : Utilitaire cn() et CurrencyDisplay

**Files:**
- Create: `lib/utils.ts`, `components/shared/CurrencyDisplay.tsx`, `components/shared/StatusBadge.tsx`

- [ ] **Vérifier que `lib/utils.ts` existe** (shadcn/ui l'a créé)

Si absent :

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Écrire le test CurrencyDisplay**

Créer `components/shared/__tests__/CurrencyDisplay.test.tsx` :

```typescript
import { render, screen } from '@testing-library/react'
import { CurrencyDisplay } from '../CurrencyDisplay'

describe('CurrencyDisplay', () => {
  it('formats MAD amounts with 2 decimals', () => {
    render(<CurrencyDisplay amount={1500} />)
    expect(screen.getByText(/1\s*500,00\s*MAD/)).toBeInTheDocument()
  })

  it('formats zero correctly', () => {
    render(<CurrencyDisplay amount={0} />)
    expect(screen.getByText(/0,00\s*MAD/)).toBeInTheDocument()
  })
})
```

- [ ] **Lancer le test — doit échouer**

```bash
npx vitest run components/shared/__tests__/CurrencyDisplay.test.tsx
```

- [ ] **Implémenter `components/shared/CurrencyDisplay.tsx`**

```typescript
interface CurrencyDisplayProps {
  amount: number | string
  className?: string
}

export function CurrencyDisplay({ amount, className }: CurrencyDisplayProps) {
  const formatted = new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount))

  return (
    <span className={className}>
      {formatted} MAD
    </span>
  )
}
```

- [ ] **Implémenter `components/shared/StatusBadge.tsx`**

```typescript
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type StatusVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

const variantClasses: Record<StatusVariant, string> = {
  default: '',
  success: 'bg-green-100 text-green-800 hover:bg-green-100',
  warning: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  danger: 'bg-red-100 text-red-800 hover:bg-red-100',
  info: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  muted: 'bg-slate-100 text-slate-600 hover:bg-slate-100',
}

interface StatusBadgeProps {
  label: string
  variant?: StatusVariant
  className?: string
}

export function StatusBadge({ label, variant = 'default', className }: StatusBadgeProps) {
  return (
    <Badge variant="secondary" className={cn(variantClasses[variant], className)}>
      {label}
    </Badge>
  )
}
```

- [ ] **Relancer le test**

```bash
npx vitest run components/shared/__tests__/CurrencyDisplay.test.tsx
```

Attendu : PASS

- [ ] **Commit**

```bash
git add components/shared/
git commit -m "feat: add CurrencyDisplay and StatusBadge shared components"
```

---

## Task 10 : Layout Dashboard (Sidebar + Header)

**Files:**
- Create: `components/layout/Sidebar.tsx`, `components/layout/Header.tsx`, `app/(dashboard)/layout.tsx`

- [ ] **Créer `components/layout/Sidebar.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Users, ShoppingBag, FileText, Wallet, CheckSquare, LayoutDashboard
} from 'lucide-react'

const navItems = [
  { label: 'Tableau de bord', href: '/', icon: LayoutDashboard },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Commandes', href: '/orders', icon: ShoppingBag },
  { label: 'Factures', href: '/invoices', icon: FileText },
  { label: 'Trésorerie', href: '/treasury', icon: Wallet },
  { label: 'Tâches', href: '/todos', icon: CheckSquare },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <h1 className="font-bold text-lg">FairwairManager</h1>
        <p className="text-slate-400 text-xs mt-1">Fairwear Manufacture</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              pathname === href
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Créer `components/layout/Header.tsx`**

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function Header() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 border-b bg-white flex items-center justify-end px-6">
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        <LogOut size={16} className="mr-2" />
        Déconnexion
      </Button>
    </header>
  )
}
```

- [ ] **Créer `app/(dashboard)/layout.tsx`**

```typescript
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Créer `app/(dashboard)/page.tsx`** (placeholder)

```typescript
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
      <p className="text-slate-500 mt-1">Les KPIs seront disponibles en S6.</p>
    </div>
  )
}
```

- [ ] **Tester manuellement**

```bash
npm run dev
```

Se connecter → vérifier que la sidebar s'affiche, que la navigation fonctionne, que la déconnexion redirige vers /login.

- [ ] **Commit**

```bash
git add app/\(dashboard\)/ components/layout/
git commit -m "feat: add dashboard layout with sidebar navigation and header"
```

---

## Task 11 : Calculs financiers (TVA + timbre)

**Files:**
- Create: `lib/calculations/invoice.ts`, `lib/calculations/__tests__/invoice.test.ts`

- [ ] **Écrire les tests**

Créer `lib/calculations/__tests__/invoice.test.ts` :

```typescript
import { describe, it, expect } from 'vitest'
import {
  calculateTVA,
  calculateStampDuty,
  calculateOrderTotals,
} from '../invoice'

describe('calculateTVA', () => {
  it('calculates 20% TVA on HT amount', () => {
    expect(calculateTVA(1000)).toBe(200)
  })

  it('rounds to 2 decimals', () => {
    expect(calculateTVA(333.33)).toBe(66.67)
  })
})

describe('calculateStampDuty', () => {
  it('calculates 0.25% of TTC', () => {
    expect(calculateStampDuty(1200)).toBe(3)
  })

  it('caps at 10000 MAD', () => {
    expect(calculateStampDuty(8_000_000)).toBe(10000)
  })

  it('returns 0 for zero amount', () => {
    expect(calculateStampDuty(0)).toBe(0)
  })
})

describe('calculateOrderTotals', () => {
  it('sums line totals and computes HT, TVA, TTC', () => {
    const items = [
      { quantity: 10, unitPrice: 100 },
      { quantity: 5, unitPrice: 200 },
    ]
    const result = calculateOrderTotals(items)
    expect(result.totalHT).toBe(2000)
    expect(result.tvaAmount).toBe(400)
    expect(result.totalTTC).toBe(2400)
  })
})
```

- [ ] **Lancer les tests — doivent échouer**

```bash
npx vitest run lib/calculations/__tests__/invoice.test.ts
```

- [ ] **Implémenter `lib/calculations/invoice.ts`**

```typescript
export function calculateTVA(ht: number, rate = 0.2): number {
  return Math.round(ht * rate * 100) / 100
}

export function calculateStampDuty(ttc: number): number {
  const duty = Math.round(ttc * 0.0025 * 100) / 100
  return Math.min(duty, 10000)
}

export function calculateOrderTotals(
  items: { quantity: number; unitPrice: number }[]
): { totalHT: number; tvaAmount: number; totalTTC: number } {
  const totalHT = Math.round(
    items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) * 100
  ) / 100
  const tvaAmount = calculateTVA(totalHT)
  const totalTTC = Math.round((totalHT + tvaAmount) * 100) / 100
  return { totalHT, tvaAmount, totalTTC }
}
```

- [ ] **Relancer les tests**

```bash
npx vitest run lib/calculations/__tests__/invoice.test.ts
```

Attendu : 6/6 PASS

- [ ] **Commit**

```bash
git add lib/calculations/
git commit -m "feat: add invoice calculation functions (TVA, stamp duty, totals)"
```

---

## Task 12 : TanStack Query Provider

**Files:**
- Create: `components/providers/QueryProvider.tsx`, `app/layout.tsx` (modify)

- [ ] **Créer `components/providers/QueryProvider.tsx`**

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

- [ ] **Modifier `app/layout.tsx`** pour enrober avec QueryProvider

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/components/providers/QueryProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FairwairManager',
  description: 'CRM Fairwear Manufacture',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
```

- [ ] **Lancer tous les tests**

```bash
npx vitest run
```

Attendu : tous les tests passent.

- [ ] **Commit final S1**

```bash
git add -A
git commit -m "feat: complete S1 foundations - auth, DB, layout, calculations"
```

---

## Vérification finale S1

- [ ] `npm run build` sans erreur TypeScript
- [ ] Login fonctionne avec un compte Supabase réel
- [ ] Dashboard accessible uniquement après login
- [ ] `/login` redirige vers `/` si déjà connecté
- [ ] Toutes les tables visibles dans Supabase Studio
- [ ] `npx vitest run` : tous les tests passent

**Fin du Plan 1 — Passer au Plan 2 : Clients + Commandes**
