# 01 — Architecture générale

## 1. Vue d'ensemble

**FairwairManager** est un CRM (Customer Relationship Management) destiné à une
activité de **manufacture / confection textile**. Il gère le cycle complet
suivant, tel qu'implémenté dans le code :

1. **Clients** — marques, B2B, particuliers, studios, avec mensurations.
2. **Commandes / devis** — lignes d'articles par tailles (S/M/L/XL/TU), prix
   unitaires, totaux HT/TTC, multi-devises (MAD, EUR, GBP, USD).
3. **Confirmation & production** — passage devis → commande confirmée, création
   d'un plan de production.
4. **Facturation** — génération de factures numérotées, TVA, droit de timbre.
5. **Encaissements** — paiements, conversion de devises, mise à jour du statut.
6. **Avoirs** — notes de crédit (retour d'articles ou montant libre).
7. **Trésorerie** — journal de caisse à solde cumulé.
8. **Fournisseurs & achats** — suivi des achats fournisseurs.
9. **Tâches internes** — todos.
10. **Tableau de bord** — KPIs agrégés.

**Cas d'usage principal** : une équipe interne (rôles `ADMIN`, `COMMERCIAL`,
`PRODUCTION`, `COMPTABLE`, `RH`) suit les devis, la production et la facturation
au quotidien depuis une interface web unique.

> ⚠ **À vérifier** — Les rôles `UserRole` existent en base, mais aucune route ni
> page du code n'implémente de contrôle d'accès basé sur le rôle. Tous les
> utilisateurs authentifiés ont accès à toutes les fonctionnalités exposées.

## 2. Stack technique

Versions issues de `package.json` (et `node_modules`).

| Domaine | Technologie | Version |
| --- | --- | --- |
| Runtime | Node.js | `>=20.9.0` (requis par Next) ; Prisma exige `^20.19 \|\| ^22.12 \|\| >=24` |
| Framework | Next.js (App Router) | `16.2.6` |
| UI | React / React DOM | `19.2.4` |
| Langage | TypeScript | `^5` |
| ORM | Prisma Client + `prisma` CLI | `^7.8.0` |
| Driver BDD | `@prisma/adapter-pg` + `pg` | `^7.8.0` / `^8.20.0` |
| Base de données | PostgreSQL | (via `DATABASE_URL`) |
| Auth | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) | `^0.10.3` / `^2.105.4` |
| Validation | Zod | `^4.4.3` |
| Formulaires | react-hook-form + `@hookform/resolvers` | `^7.75.0` / `^5.2.2` |
| Data fetching client | TanStack React Query | `^5.100.9` |
| State client | Zustand | `^5.0.13` |
| Styles | TailwindCSS v4 + `tw-animate-css` | `^4` |
| Composants | shadcn, `@base-ui/react`, Radix UI | — |
| PDF | `@react-pdf/renderer` | `^4.5.1` |
| Dates | `date-fns` | `^4.1.0` |
| Notifications | `sonner` | `^2.0.7` |
| Tests | Vitest + Testing Library (jsdom) | `^4.1.5` |
| Lint | ESLint + `eslint-config-next` | `^9` |

**Base de données** : PostgreSQL, fournie/managée via Supabase (`DATABASE_URL`
= connexion poolée, `DIRECT_URL` = connexion directe). Le client Prisma utilise
l'adaptateur `PrismaPg` (`lib/prisma.ts:8`).

## 3. Structure du dépôt

```
app/
  layout.tsx                 Layout racine (Inter, QueryProvider)
  (auth)/login/              Page + formulaire de connexion
  (dashboard)/               Layout protégé + pages métier
  api/                       Route Handlers (backend)
components/                  UI (clients, orders, invoices, layout, ui, shared)
lib/
  prisma.ts                  Client Prisma singleton
  supabase/                  Clients Supabase (browser + server)
  calculations/             Règles tarifaires & numérotation
  validators/               Schémas Zod
  exchange-rates.ts          Taux par défaut + conversions
  exchange-rate-store.ts     Lecture/écriture des taux en base
  payments.ts, treasury/     Helpers métier
prisma/
  schema.prisma              Modèles
  migrations/                Migrations SQL
  seed.ts, import-data.ts, seed-data.ts
proxy.ts                     « middleware » Next 16 (auth & redirections)
types/index.ts               Libellés des enums (FR)
```

## 4. Diagramme d'architecture

```mermaid
flowchart TB
    subgraph Client["Navigateur (React 19 / Next App Router)"]
        UI["Pages & composants (CSR/SSR)"]
        RQ["TanStack Query (fetch /api/*)"]
        SB["Supabase Browser Client (login)"]
    end

    subgraph Edge["Edge / Requête"]
        PX["proxy.ts (ex-middleware)<br/>refresh session + redirections"]
    end

    subgraph Next["Serveur Next.js 16"]
        RSC["React Server Components<br/>(layouts, pages)"]
        API["Route Handlers app/api/**"]
        PDF["@react-pdf/renderer"]
    end

    subgraph Lib["Couche métier (lib/)"]
        PRISMA["Prisma Client (lib/prisma.ts)"]
        CALC["calculations/"]
        VAL["validators/ (Zod)"]
        FX["exchange-rates + store"]
        TREAS["treasury/create-cash-entry"]
    end

    subgraph External["Services externes"]
        SUPA["Supabase Auth"]
        PG[("PostgreSQL")]
    end

    UI --> RQ
    UI --> RSC
    SB --> SUPA
    PX --> SUPA
    RQ -->|HTTP JSON| API
    RSC --> API
    API --> VAL
    API --> CALC
    API --> FX
    API --> TREAS
    API --> PRISMA
    API --> PDF
    API -->|getUser()| SUPA
    PRISMA --> PG
```

Flux d'authentification détaillé : voir
[04 — Flux et logique métier](./04-flux-et-logic-metier.md).

## 5. Variables d'environnement

### Déclarées dans `.env.example`

| Variable | Usage | Référencée dans le code |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase (client + serveur + proxy + seed) | `lib/supabase/*.ts`, `proxy.ts`, `prisma/seed.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme Supabase | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `proxy.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service (admin) pour créer l'utilisateur admin | `prisma/seed.ts:16` |
| `DATABASE_URL` | Connexion PostgreSQL (poolée, runtime) | `lib/prisma.ts:7`, `prisma.config.ts` |
| `DIRECT_URL` | Connexion PostgreSQL directe (seed/import) | `prisma/seed.ts:6`, `prisma/import-data.ts:12` |

### Utilisées dans le code mais **absentes** de `.env.example`

| Variable | Usage | Source |
| --- | --- | --- |
| `ADMIN_EMAIL` | Email de l'admin créé par le seed (défaut `admin@fairwear.ma`) | `prisma/seed.ts:9` |
| `ADMIN_PASSWORD` | Mot de passe admin (défaut `Admin1234!`) | `prisma/seed.ts:10` |
| `ADMIN_NAME` | Nom admin (défaut `Admin Fairwear`) | `prisma/seed.ts:11` |

> ⚠ **À vérifier** — `.env.example` devrait être complété avec ces trois
> variables `ADMIN_*` pour que le seed soit reproductible sans valeurs par
> défaut codées en dur.
>
> ⚠ **À vérifier** — Le code lit `process.env.DATABASE_URL` et
> `process.env.NEXT_PUBLIC_SUPABASE_URL!` avec l'opérateur `!` (asserstion non
> nulle) : l'absence de ces variables provoquera une erreur d'exécution, sans
> message explicite.
