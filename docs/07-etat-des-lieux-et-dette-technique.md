# 07 — État des lieux et dette technique

Inventaire des constats relevés lors de la rétro-documentation. Chaque point
indique une référence dans le code. Les éléments marqués **⚠ À vérifier**
nécessitent une décision produit/technique. Rien ici n'est un jugement : c'est
un aide-mémoire pour prioriser les évolutions.

## 1. Fonctionnalités présentes en base mais non exposées

Modèles Prisma sans route API ni page :

| Modèle | Usage prévu | Référence |
| --- | --- | --- |
| `Employee` | RH (employés, taux horaire) | `schema.prisma:269` |
| `Timesheet` | Saisie de temps | `schema.prisma:281` |
| `Salary` | Paie hebdomadaire | `schema.prisma:298` |
| `ProductionPlanningItem` | Planning hebdo par utilisateur | `schema.prisma:256` |
| `PriceList` | Tarifs fournisseurs | `schema.prisma:397` |

> `ProductionPlan` est bien créé à la confirmation de devis, mais **aucune route
> ne met à jour ses jalons** (sourcing/étude/production/livraison).

## 2. Cohérence de la logique métier

- **Transitions de commande inatteignables** : `SOURCING`, `STUDY`,
  `PRODUCTION`, `READY`, `DELIVERED` existent et sont filtrables, mais aucune
  règle ne les atteint automatiquement ; seul un `PUT` explicite les positionne
  (`app/api/orders/[id]/route.ts:50`). ⚠ **À vérifier** — le workflow de
  production est-il volontairement manuel ?
- **Référence commande sans retry** : contrairement aux factures/avoirs,
  `POST /api/orders` ne gère pas le conflit `P2002` sur `reference`
  (`app/api/orders/route.ts:58`). Risque de collision en création concurrente.
- **`Todo` PUT incomplet** : `ownerId` et `dueDate` ne sont **pas** appliqués
  lors d'un PUT (`app/api/todos/[id]/route.ts:18`).
- **Solde de caisse** : `createCashEntry` calcule le solde à partir de la
  **dernière écriture par date** (`orderBy: date desc, createdAt desc`), pas par
  ordre d'insertion → une écriture antidatée peut produire un solde
  chronologiquement incohérent (`lib/treasury/create-cash-entry.ts:17`).
- **Achats fournisseurs non trésorés** : la création d'un `SupplierPurchase`
  ne génère **pas** d'écriture `CashEntry` (`EXPENSE`), contrairement aux
  encaissements clients (`app/api/suppliers/[id]/purchases/route.ts:35`).
- **`Payment.orderId` jamais renseigné** : le champ existe mais les paiements ne
  portent que `invoiceId` (`app/api/invoices/[id]/payments/route.ts:43`).
- **`Invoice.pdfUrl` jamais renseigné** : le PDF est généré à la volée, non
  stocké (`schema.prisma:151`).
- **`SupplierPurchase.accountingExported`** déclaré, non piloté par l'API.

## 3. Sécurité et accès

- **Aucun contrôle de rôle** : `UserRole` existe (`ADMIN`, `COMMERCIAL`, …) mais
  aucune route/page ne vérifie le rôle. Tout utilisateur authentifié a accès à
  tout. ⚠ **À vérifier** — intentionnel ou à implémenter ?
- **Authentification dupliquée** : la vérification `getUser()` est répétée dans
  ~22 handlers + 2 layouts + `proxy.ts` (pas de middleware API, `/api` est exclu
  du matcher). Fonctionnel, mais toute nouvelle route doit **penser** à la garde.
- **Assertions non nulles** sur les env (`process.env.X!`) : absence de variable
  → erreur peu explicite.

## 4. Configuration et environnement

- **`ADMIN_*` absentes de `.env.example`** alors que lues par `prisma/seed.ts`
  (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`).
- **URL de repli trompeuse** dans `prisma.config.ts:12`
  (`postgresql://dummy:dummy@localhost/dummy`).
- **Vercel — projet doublon** : `fairwear-manager` (actif) et
  `fairwair-manager` (ancien, orthographe sans « e ») coexistent.
- **Pas de CI** : ni GitHub Actions ni vérification de branche ; lint/tests non
  exécutés avant déploiement automatique.
- **README générique** : `README.md` est le modèle `create-next-app`, obsolète
  vis-à-vis du projet réel.
- **`.env` présent localement** mais ignoré par git (bon point).

## 5. Conventions non écrites / incohérences

- **Zustand déclaré mais inutilisé** : présent dans `package.json` mais aucun
  import dans le code. Ne pas s'en servir par défaut.
- **Deux patterns de data-fetching** : TanStack Query (majoritaire) et
  `fetch` direct + `router.refresh()` (`ClientForm.tsx`). À harmoniser.
- **Pas de script `typecheck`** : seul `eslint` est exposé.
- **`any`/casts isolés** dans les routes PDF et la page dashboard.

## 6. Tests

- **Zones non couvertes critiques** : Route Handlers, transactions,
  `deriveInvoiceStatus`, conversion de devises, création d'avoir.
- Couverture actuelle : calculs (facture, numéros, référence), schémas Zod
  (client, order), `CurrencyDisplay`, client Prisma (7 fichiers).

## 7. Points techniques récurrents à connaître

- Le **PDF n'est pas un fichier stocké** : génération `@react-pdf/renderer` à
  chaque requête, routes `force-dynamic`.
- **Multi-devises** : les paiements sont saisis en MAD et convertis via
  `appliedAmount` ; le `Payment.currency` reste toujours `'MAD'`.
- **TVA** : uniquement 20 % pour MAD, 0 % pour les devises étrangères
  (`lib/calculations/invoice.ts:3`).
- **Numérotation** : `DEVIS-AAAA-000`, `PR-000/AAAA`, `AV-000/AAAA`, séquence
  par année.

## 8. Suggestion de priorisation (proposition)

1. Implémenter (ou acter) le **contrôle de rôle** — impact sécurité.
2. Décider du **workflow de statuts de commande** (automatique vs manuel) et de
   l'édition des jalons de production.
3. Unifier le **pattern de data-fetching**.
4. Ajouter **retry** sur la référence de commande.
5. Décider du **lien achats fournisseurs ↔ trésorerie**.
6. Nettoyer les **env** (`ADMIN_*`, repli `prisma.config.ts`) et le **README** /
   projet Vercel doublon.
7. Compléter les **tests** sur la facturation.

> Ces propositions découlent strictement des constats ci-dessus ; elles ne
> préjugent pas des choix produit.
