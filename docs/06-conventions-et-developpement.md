# 06 — Conventions et développement

Ce document décrit **les conventions réellement observées dans le code**, afin de
guider les évolutions futures en restant cohérent avec l'existant. Aucune règle
n'étant écrite de manière formelle dans le dépôt, ceci est une synthèse de
l'observation.

## 1. Conventions backend (Route Handlers)

**Structure d'un handler** (`app/api/**/route.ts`) :

```ts
export async function GET/POST/PUT/DELETE(request, { params }) {
  // 1. Garde d'authentification (toujours en premier)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // 2. Lecture/parse de l'entrée
  const body = await request.json()
  // 3. Validation Zod
  const parsed = xxxSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }
  // 4. Accès données via prisma
  // 5. Réponse NextResponse.json(...)
}
```

Règles observées :

- `params` est un **Promise** : `const { id } = await params` (Next 16).
- **Validation** : `safeParse` (jamais `parse`), renvoi de `parsed.error.flatten()`.
- **Statuts** : `201` création, `200` lecture/màj, `400` validation/métier,
  `401` non authentifié, `404` introuvable, `409` conflit de config.
- **Messages d'erreur** : en **français**, vocabulaire métier
  (« Une facture existe déjà pour cette commande », « Seul un devis… »).
- **Opérations multi-écritures** : toujours encapsulées dans
  `prisma.$transaction(async (tx) => …)` (ou `$transaction([...])`).
- **Concurrence de numérotation** : boucle de 5 tentatives capturant
  `PrismaClientKnownRequestError` code `P2002` sur le champ `number`
  (factures, avoirs). À reproduire pour toute séquence côté serveur.
- **Champs vides** : les `''` sont convertis en `null` (preprocess Zod ou
  logique explicite).

## 2. Conventions données

- Montants en `Decimal` en base → convertis en `Number()` avant calcul, avec
  **arrondi systématique à 2 décimales** :
  `Math.round(x * 100) / 100`.
- Taux de change : `Decimal(12,6)` → arrondi 6 décimales
  (`roundExchangeRate`).
- Les helpers métier vivent dans `lib/calculations/`, `lib/exchange-rates.ts`,
  `lib/payments.ts`, `lib/treasury/` — **jamais dupliqués dans les routes**.
- Les schémas Zod vivent dans `lib/validators/` et sont partagés entre API et
  formulaires.

## 3. Conventions front (React / Next App Router)

### Pages

Deux patterns coexistent :

- **Page serveur fine** exportant `metadata` et déléguant à un composant client
  (ex. `app/(dashboard)/clients/page.tsx` → `<ClientsTable />`).
- **Page client** directe (`'use client'` en tête, ex.
  `app/(dashboard)/page.tsx`, `treasury/page.tsx`, `todos/page.tsx`).

Les pages protégées sont sous `app/(dashboard)/` ; le layout y est
`force-dynamic` et vérifie la session.

### Composants

- `components/ui/*` : primitives shadcn/Radix (ne pas modifier les conventions
  de nommage).
- `components/shared/*` : composants transverses (`CurrencyDisplay`,
  `StatusBadge`).
- `components/<domaine>/*` : composants métier (clients, orders, invoices…).
- Le style passe par `cn(...)` (`lib/utils.ts`) et des classes Tailwind.
- Les libellés d'enums français viennent de `types/index.ts`
  (`ORDER_STATUS_LABELS`, etc.).

### Data fetching — deux approches

1. **TanStack Query** (pages de liste et détails, mutations avec invalidation).
   Conventions de **clés** observées :
   - `['client', id]`, `['clients', search, type, page, sortBy, sortOrder]`,
     `['clients-select']` (options de formulaire) ;
   - `['order', id]`, `['orders', clientId, status, sortBy, sortOrder]`,
     `['order-edit', id]` ;
   - `['invoice', id]`, `['invoices', clientId, status, month, year]`,
     `['invoice-edit', id]` ;
   - `['exchange-rates']`, `['cash']`, `['todos']`, `['dashboard-kpis']`.
   - Après mutation : `queryClient.invalidateQueries({ queryKey: [...] })`
     sur les clés parentes concernées (ex. invalider `['order', id]` **et**
     `['orders']` après un changement de statut).
   - Réglages globaux : `staleTime: 60_000`, `retry: 1` (`QueryProvider.tsx`).
2. **`fetch` direct + `router.refresh()`** dans certains formulaires CRUD
   (ex. `ClientForm.tsx`) : POST/PUT direct, puis navigation/refresh.

> ⚠ **À vérifier** — Les deux approches étant mélangées, **choisir
> explicitement** le pattern pour toute nouvelle fonctionnalité afin d'éviter les
> désynchronisations de cache. Pour une liste/détail, privilégier TanStack Query.

### Formulaires

- `react-hook-form` + `zodResolver` avec le **même schéma Zod que l'API**,
  composants `Form/FormField/FormItem/FormLabel/FormMessage`
  (`components/ui/form.tsx`).
- Les champs nullable utilisent `nullableFieldProps` (conversion `''` ↔ `null`).
- État de soumission via `form.formState.isSubmitting`, erreur globale dans
  `form.formState.errors.root`.

## 4. Conventions de code générales

- **Aucun commentaire** dans le code (sauf tout premiers fichiers de config).
- TypeScript strict par défaut (config Next) ; alias d'import `@/` → racine.
- Composants en **PascalCase**, fonctions en **camelCase**, fichiers de
  composants en `PascalCase.tsx`.
- Pas de `any` volontaire dans le code métier (quelques `any`/casts isolés dans
  les routes PDF et la page dashboard pour les objets `order`/`invoice`).

## 5. Tests

- **Vitest** + Testing Library, environnement `jsdom`.
- Emplacement : `__tests__/` **colocalisé** à côté du code testé.
- Helpers/JSU : `vitest.setup.ts`.
- Ajouter un test pour toute fonction de `lib/calculations/` ou schéma
  `lib/validators/` modifié.

> ⚠ **À vérifier** — Il n'existe **aucun test** de Route Handler, de transaction
> ou de `deriveInvoiceStatus`. Avant des évolutions sensibles sur la facturation,
> envisager de couvrir ces zones.

## 6. Workflow d'évolution du schéma de données

Lorsqu'un modèle/ champ Prisma change :

```bash
# 1. Modifier prisma/schema.prisma
# 2. Créer + appliquer la migration en développement
npx prisma migrate dev --name <description>
# 3. Régénérer le client et (si besoin) rafraîchir les types
npx prisma generate
# 4. Vérifier que types/index.ts reste cohérent (libellés d'enums)
```

En production (Vercel) : appliquer les migrations (`npx prisma migrate deploy`)
puis redéployer. **Le build n'exécute pas les migrations** ; il exécute
seulement `prisma generate && next build` (`package.json:7`).

## 7. Déploiement

- Cible : **Vercel**, projet `fairwear-manager`
  (`https://fairwear-manager.vercel.app`), rattaché au remote git `origin`
  → **déploiement automatique à chaque push**.
- Variables d'environnement sur Vercel : `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `DATABASE_URL`, `DIRECT_URL` (Preview + Production).
- ⚠ **À vérifier** — Aucune CI (GitHub Actions) ni protection de branche
  observée ; le lint/tests ne sont **pas** exécutés automatiquement avant
  déploiement.

## 8. Checklist pour une nouvelle fonctionnalité backend

1. Schéma Zod dans `lib/validators/` (partagé front/back si pertinent).
2. Logique métier dans `lib/` (calculs / helpers), pas dans la route.
3. Route handler dans `app/api/...` avec garde `getUser()`, validation,
   transaction si multi-écritures.
4. Si création séquentielle : gérer `P2002` avec retry.
5. Mettre à jour `docs/02-api-et-routes.md` et `docs/03-modeles-et-donnees.md`.
6. Test unitaire pour la logique pure.
