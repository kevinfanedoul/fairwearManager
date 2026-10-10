# 05 — Guide d'installation et scripts

## 1. Prérequis

- **Node.js** `>=20.9.0` (exigé par Next.js 16 ; `node_modules/next/package.json`).
  Prisma `7` requiert `^20.19 || ^22.12 || >=24`.
- Un projet **Supabase** (URL + clés) et une base **PostgreSQL** accessible
  (fournie par Supabase).
- `npm` (un `package-lock.json` est présent ; aucun `yarn.lock`/`pnpm-lock.yaml`).

## 2. Scripts `npm`

Définis dans `package.json:5-13` :

| Script | Commande | Utilité |
| --- | --- | --- |
| `npm run dev` | `next dev` | Serveur de développement (http://localhost:3000) |
| `npm run build` | `prisma generate && next build` | Génère le client Prisma puis build de production |
| `npm run start` | `next start` | Démarre le build de production |
| `npm run lint` | `eslint` | Analyse ESLint (`eslint.config.mjs`) |
| `npm run test` | `vitest run` | Exécute la suite de tests une fois |
| `npm run test:watch` | `vitest` | Tests en mode watch |
| `npm run seed` | `npx tsx prisma/seed.ts` | Crée l'admin Supabase + `User` Prisma |

`package.json` définit aussi `"prisma": { "seed": "npx tsx prisma/seed.ts" }`
(`package.json:61-63`).

**Non exposés en script npm** (à lancer directement) :

| Commande | Utilité |
| --- | --- |
| `npx prisma migrate dev` | Applique/crée les migrations en développement |
| `npx prisma migrate deploy` | Applique les migrations en production |
| `npx prisma generate` | Génère le client Prisma |
| `npx tsx prisma/import-data.ts` | Importe les données historiques (`seed-data.ts`) |

## 3. Variables d'environnement

Créer un fichier `.env` à la racine (voir `.env.example`) :

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
DIRECT_URL=
```

Pour le **seed**, ajouter (non présentes dans `.env.example`) :

```
ADMIN_EMAIL=admin@fairwear.ma        # défaut si absent
ADMIN_PASSWORD=Admin1234!            # défaut si absent
ADMIN_NAME=Admin Fairwear            # défaut si absent
```

> ⚠ **À vérifier** — Ces trois variables `ADMIN_*` ne figurent pas dans
> `.env.example`, alors qu'elles sont lues par `prisma/seed.ts:9-11`.

## 4. Procédure de lancement en local

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer l'environnement
cp .env.example .env
# puis renseigner les variables (Supabase + PostgreSQL)

# 3. Appliquer les migrations et générer le client Prisma
npx prisma migrate deploy     # ou: npx prisma migrate dev
npx prisma generate

# 4. (Optionnel) Créer l'utilisateur admin via Supabase
npm run seed

# 5. (Optionnel) Importer les données historiques
npx tsx prisma/import-data.ts

# 6. Démarrer le serveur de développement
npm run dev
```

L'accès à l'application se fait sur http://localhost:3000 ; la page de connexion
est `/login`.

> ⚠ **À vérifier** — `prisma.config.ts` définit une URL de repli
> (`postgresql://dummy:dummy@localhost/dummy`) si `DATABASE_URL` est absent
> (`prisma.config.ts:12`) : les commandes Prisma ne diront pas clairement que la
> base n'est pas configurée.

## 5. Base de données et migrations

- Schéma : `prisma/schema.prisma` (18 modèles, 7 enums).
- 3 migrations dans `prisma/migrations/` :
  1. `20260510200352_init` — schéma initial.
  2. `20260531120000_exchange_rates_and_payment_conversion` — table
     `ExchangeRate` + champs de conversion paiement.
  3. `20260531153000_add_credit_notes` — modèles `CreditNote`/`CreditNoteItem`.

## 6. Tests

- **Framework** : Vitest (`vitest.config.ts`), environnement `jsdom`,
  `globals: true`, `setupFiles: ['./vitest.setup.ts']` (importe
  `@testing-library/jest-dom`). Alias `@` → racine du projet.
- **Commande** : `npm run test` (ou `npm run test:watch`).

Fichiers de test présents (7) :

| Fichier | Couvre |
| --- | --- |
| `lib/calculations/__tests__/invoice.test.ts` | Calculs TVA / timbre / totaux |
| `lib/calculations/__tests__/invoice-number.test.ts` | Format numéro facture |
| `lib/calculations/__tests__/order-reference.test.ts` | Format référence commande |
| `lib/validators/__tests__/client.test.ts` | Schéma Zod client |
| `lib/validators/__tests__/order.test.ts` | Schéma Zod commande |
| `lib/__tests__/prisma.test.ts` | Client Prisma |
| `components/shared/__tests__/CurrencyDisplay.test.tsx` | Composant d'affichage devise |

> ⚠ **À vérifier** — Les Route Handlers, les flux de facturation/avoir/paiement
> et `deriveInvoiceStatus` ne sont **pas couverts** par des tests.

## 7. Lint & vérifications

```bash
npm run lint
npm run test
```

Il n'existe **pas** de script `typecheck` dédié ; `tsc` est disponible via
`typescript` (`npx tsc --noEmit` si besoin).

## 8. Déploiement

Aucun fichier de configuration de déploiement (Docker, Vercel, CI) n'est présent
dans le dépôt. Le `README.md` est le modèle générique `create-next-app` et ne
décrit pas le déploiement réel du projet.

> ⚠ **À vérifier** — Aucune documentation de déploiement ni configuration CI
> n'existe : le `README.md` générique est obsolète vis-à-vis de ce projet.
