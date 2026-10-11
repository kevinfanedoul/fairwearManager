# FairwairManager — Documentation technique

> Rétro-documentation générée **à partir du code source réel** du dépôt.
> Aucun composant, route ou comportement non présent dans le code n'a été inventé.
> Les informations manquantes ou ambiguës sont signalées par le bloc **⚠ À vérifier**.

## Sommaire

| Document | Contenu |
| --- | --- |
| [01 — Architecture générale](./01-architecture-generale.md) | Vue d'ensemble, cas d'usage, stack, diagramme Mermaid, variables d'environnement. |
| [02 — API et routes](./02-api-et-routes.md) | Cartographie complète des Route Handlers, middlewares, paramètres, réponses. |
| [03 — Modèles et données](./03-modeles-et-donnees.md) | ORM Prisma, entités, relations, enums, index. |
| [04 — Flux et logique métier](./04-flux-et-logic-metier.md) | Flux critiques et diagrammes de séquence. |
| [05 — Guide d'installation et scripts](./05-guide-installation-et-scripts.md) | Scripts npm, lancement local, tests. |
| [06 — Conventions et développement](./06-conventions-et-developpement.md) | Conventions back/front, query keys, tests, workflow migration, déploiement. |
| [07 — État des lieux et dette technique](./07-etat-des-lieux-et-dette-technique.md) | Constats, incohérences, points à décider. |

## Aperçu général

**FairwairManager** est un CRM de gestion de production textile / confection
(contexte marocain : devise MAD, TVA, droit de timbre). Il couvre le cycle
commercial : clients → devis/commandes → production → facturation → encaissements
→ trésorerie, ainsi que des tâches internes (todos) et le suivi fournisseurs.

### Nature technique du projet

Il s'agit d'une **application full-stack Next.js 16 (App Router)** et **non**
d'une API Node.js isolée (pas d'Express, Fastify ou NestJS). Le « backend » est
composé de :

- **Route Handlers** dans `app/api/**/route.ts` ;
- un **client Prisma** partagé (`lib/prisma.ts`) ;
- **Supabase** pour l'authentification (`@supabase/ssr`) ;
- un fichier **`proxy.ts`** à la racine, qui est le **remplacement du
  `middleware.ts`** dans cette version de Next.js (voir `AGENTS.md` et
  `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`).

### Pile résumée

Next.js `16.2.6` · React `19.2.4` · TypeScript `5` · Prisma `7.8` + PostgreSQL ·
Supabase SSR · Zod `4` · TanStack Query `5` · Zustand `5` · TailwindCSS `4` ·
shadcn/`@base-ui/react` · `@react-pdf/renderer` `4` · Vitest `4`.

### Périmètre de l'API

22 fichiers de routes couvrant : clients & mensurations, commandes (devis),
factures, paiements, avoirs (credit notes), tableau de bord (KPIs), taux de
change, fournisseurs & achats, todos, trésorerie (caisse).

### Glossaire des statuts

- **Commande (`OrderStatus`)** : `QUOTE` (devis), `CONFIRMED`, `SOURCING`,
  `STUDY`, `PRODUCTION`, `READY`, `DELIVERED`, `INVOICED`, `PAID`, `CANCELLED`.
- **Facture (`InvoiceStatus`)** : `DRAFT`, `PENDING`, `PARTIAL`, `PAID`,
  `OVERDUE`, `CANCELLED`.
- **Todo (`TodoStatus`)** : `TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`.
- **Rôle utilisateur (`UserRole`)** : `ADMIN`, `COMMERCIAL`, `PRODUCTION`,
  `COMPTABLE`, `RH`.
- **Type de commande (`OrderType`)** : `PRODUCT` (devis de production),
  `STUDY` (devis bureau d'études).
- **Type de ligne (`OrderItemKind`)** : `BREAKDOWN` (patronage + prototype +
  gradation), `FLAT` (tarif unique).

## Avertissements transverses

- ⚠ **À vérifier** — Le projet est étiqueté « Node.js » dans la demande, mais il
  s'agit d'une app Next.js. Toute la documentation backend décrit donc des Route
  Handlers Next.js, pas un serveur HTTP autonome.
- ⚠ **À vérifier** — Les modèles Prisma `Employee`, `Timesheet`, `Salary`,
  `ProductionPlanningItem` et `PriceList` existent en base mais **aucune route
  API ne les expose** : fonctionnalités prévues mais non branchées.
- ⚠ **À vérifier** — `.env.example` ne déclare pas `ADMIN_EMAIL`,
  `ADMIN_PASSWORD`, `ADMIN_NAME`, pourtant lus par `prisma/seed.ts`.
- ⚠ **À vérifier** — Le fichier historique `FAIRWEAR_CRM_Analyse_Complete.md` et
  `docs/superpowers/` existent déjà ; ils n'ont pas été utilisés comme source
  (documentation basée uniquement sur le code).
