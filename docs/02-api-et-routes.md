# 02 — API et routes

Le backend est constitué de **Route Handlers** Next.js situés dans
`app/api/**/route.ts`. Chaque handler concerné commence par la même garde :

```ts
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
```

Il n'existe **pas de middleware d'authentification appliqué aux routes API** :
le `proxy.ts` à la racine **exclut explicitement `/api`** de son matcher
(`proxy.ts:67`) et chaque handler refait donc lui-même sa vérification de session.

**Conventions générales :**

- Validation d'entrée via Zod ; échec → `400 { error: 'Données invalides', details }`
  (certains handlers renvoient seulement `{ error: 'Données invalides' }`).
- Ressource absente → `404 { error: '... introuvable' }`.
- Non authentifié → `401 { error: 'Non autorisé' }`.
- Conflit métier → `400` avec message français.
- Création réussie → `201` avec l'objet créé ; mise à jour → `200`.

---

## 1. Clients

### `GET /api/clients` — `app/api/clients/route.ts:7`

Liste paginée et filtrable des clients actifs.

| Paramètre (query) | Type | Défaut | Description |
| --- | --- | --- | --- |
| `search` | string | `''` | Recherche `contains` insensible sur `company`, `firstName`, `lastName`, `email` |
| `type` | `ClientType` | — | Filtre par type valide uniquement |
| `page` | int | `1` | Pagination |
| `limit` | int | `50` | Taille de page |
| `sortBy` | `name`/`type`/`email`/`city`/`orders` | `name` | Tri (avec `nulls: 'last'`) |
| `sortOrder` | `asc`/`desc` | `asc` | Sens du tri |

**Réponse `200`** : `{ clients, total, page, limit, sortBy, sortOrder }`.
`clients` inclut `_count` de `orders` et `invoices`.

### `POST /api/clients` — `app/api/clients/route.ts:91`

Crée un client. **Body** : `clientSchema` (`lib/validators/client.ts`) →
`type`, `company?`, `firstName?`, `lastName?`, `email?`, `phone?`, `address?`,
`city?`, `country` (défaut `MA`), `ice?`, `tvaNumber?`, `notes?`.
Champs texte vides (`''`) convertis en `null`. **Réponse `201`** : le client.

### `GET /api/clients/[id]` — `app/api/clients/[id]/route.ts:6`

Fiche client complète : `measurements`, 20 dernières `orders` (avec `items`),
20 dernières `invoices` (avec `payments`). **Réponse `200`** / `404`.

### `PUT /api/clients/[id]` — `app/api/clients/[id]/route.ts:34`

Met à jour un client (même `clientSchema`). **Réponse `200`**.

### `DELETE /api/clients/[id]` — `app/api/clients/[id]/route.ts:50`

**Suppression logique** : passe `active = false` (pas de suppression physique).
**Réponse `200`** : `{ success: true }`.

### `GET /api/clients/[id]/measurements` — `app/api/clients/[id]/measurements/route.ts:6`

Récupère les mensurations (`Measurement` unique par client). Peut renvoyer
`null` si absentes (`200`).

### `PUT /api/clients/[id]/measurements` — `.../route.ts:16`

Upsert des mensurations. **Body** : `measurementSchema` (`shoulder`, `chest`,
`waist`, `hips`, `length`, `waistLength`, `sleeves`, `notes`). **Réponse `200`**.

---

## 2. Commandes (devis)

### `GET /api/orders` — `app/api/orders/route.ts:9`

| Paramètre | Type | Défaut | Description |
| --- | --- | --- | --- |
| `status` | `OrderStatus` | — | Filtre statut |
| `clientId` | string | — | Filtre client |
| `sortBy` | `reference`/`client`/`status`/`date`/`deadline`/`totalTTC` | `date` | Tri |
| `sortOrder` | `asc`/`desc` | `desc` | Sens |

Inclut `client` (id, company, firstName, lastName) et `items`. **Réponse `200`** : tableau.

### `POST /api/orders` — `app/api/orders/route.ts:44`

Crée un devis. **Body** : `orderSchema` → `type` (`PRODUCT`/`STUDY`, défaut
`PRODUCT`), `clientId` (uuid), `currency` (`MAD`/`EUR`/`GBP`/`USD`, défaut
`MAD`), `fabricSupply` (bool, défaut false — devis de production uniquement),
`deadline?` (`YYYY-MM-DD`), `notes?`, `items` (≥ 1, `orderItemSchema`).

`orderItemSchema` est un sur-ensemble : pour `PRODUCT` → tailles
`sizeXS/S/M/L/XL/XXL/XXXL/TU` + `quantity` + `unitPrice` ; pour `STUDY` →
`kind` (`BREAKDOWN`/`FLAT`) avec soit `patronage`/`proto`/`gradationSizes`/
`gradationUnitPrice`, soit `flatPrice`.

- Génère la référence selon le type : `DEVIS-PROD-<année>-<seq 3>` ou
  `DEVIS-BE-<année>-<seq 3>` (`orderReferencePrefix` + `formatOrderReference`),
  en cherchant la dernière référence de l'année **pour ce type**.
- Calcule `totalPrice` par ligne : `quantity × unitPrice` (PRODUCT), `patronage
  + proto + gradationTotal` (STUDY BREAKDOWN) ou `flatPrice` (STUDY FLAT).
- Calcule `totalHT`/`totalTTC` via `calculateOrderTotalsFromPrices` (TVA 20 % si MAD).

**Réponse `201`** : commande avec `items`.

> ⚠ **À vérifier** — La génération de référence n'utilise **pas** de boucle de
> retry ni de contrainte gérée, contrairement aux factures/avoirs : un conflit
> d'unicité `reference` simultané remonterait une erreur non gérée.

### `GET /api/orders/[id]` — `app/api/orders/[id]/route.ts:14`

Détail : `client`, `items`, `production`, `invoice` (avec `payments`).
**Réponse `200`** / `404`.

### `PUT /api/orders/[id]` — `app/api/orders/[id]/route.ts:33`

Deux modes selon la présence de `status` dans le body :

1. **Changement de statut** (`updateStatusSchema` local) : `status` + `notes?` +
   `deadline?` (datetime). Règles métier :
   - `CANCELLED` autorisé **uniquement** si le statut courant est `QUOTE`.
   - Retour à `QUOTE` autorisé **uniquement** si statut courant `CANCELLED`.
2. **Édition complète** (même `orderSchema`) : autorisée **uniquement** si le
   statut courant est `QUOTE`. Supprime les anciens `items` et recrée dans une
   transaction (`$transaction`).

**Réponse `200`** / erreurs `400`/`404`.

### `POST /api/orders/[id]/confirm` — `app/api/orders/[id]/confirm/route.ts:5`

Confirme un devis : exige statut `QUOTE`, puis en **transaction** :
`order.status = 'CONFIRMED'` **et** création d'un `ProductionPlan` vide.
**Réponse `200`** : commande mise à jour.

### `GET /api/orders/[id]/pdf` — `app/api/orders/[id]/pdf/route.ts:10`

Génère le PDF du devis/commande via `OrderPDF` (`@react-pdf/renderer`).
`dynamic = 'force-dynamic'`. **Réponse** : `application/pdf`,
`Content-Disposition: attachment`.

---

## 3. Factures

### `GET /api/invoices` — `app/api/invoices/route.ts:27`

| Paramètre | Description |
| --- | --- |
| `status` | Filtre `InvoiceStatus` |
| `clientId` | Filtre client |
| `year` | Filtre année (UTC) |
| `month` | Filtre mois (combiné avec `year`) |

Inclut `client` (extrait), `order.currency`, `payments`. Tri par `issueDate desc`.
**Réponse `200`** : tableau.

### `POST /api/invoices` — `app/api/invoices/route.ts:74`

Crée une facture à partir d'une commande. **Body** : `createInvoiceSchema` →
`orderId` (uuid), `dueDate?` (datetime), `applyStampDuty` (bool, défaut false),
`notes?`.

- Refuse si la commande a déjà une facture (`400`).
- Calcule `totalHT` (repris de la commande), `tvaRate` via
  `getVATRateForCurrency` (0.20 si MAD, sinon 0), `tvaAmount`, puis
  `stampDuty` (0.25 % plafonné à 10 000) si demandé, et `totalTTC`.
- En **transaction** : vérifie l'absence de facture, génère un numéro
  `PR-<séquence 3>/<année>`, crée la facture avec **jusqu'à 5 tentatives** en
  cas de conflit `P2002` sur `number`, puis passe la commande à `INVOICED`.

**Réponse `201`** : la facture.

### `GET /api/invoices/[id]` — `app/api/invoices/[id]/route.ts:7`

Détail : `client`, `order` (avec `items`), `payments` (triés par date),
`creditNotes` (avec `items`). **Réponse `200`** / `404`.

### `PUT /api/invoices/[id]` — `app/api/invoices/[id]/route.ts:29`

Deux modes :

1. `accountingExported` booléen présent → met à jour `accountingExported` et
   `accountingExportedAt`.
2. Sinon `updateInvoiceSchema` (`issueDate`, `dueDate?`, `notes?`) → recalcule
   le statut via `deriveInvoiceStatus` (sauf si déjà `CANCELLED`).

**Réponse `200`** / `400` / `404`.

### `POST /api/invoices/[id]/payments` — `app/api/invoices/[id]/payments/route.ts:11`

Enregistre un encaissement. **Body** : `paymentSchema` → `date` (datetime),
`amount` (> 0), `method` (`CASH`/`BANK_TRANSFER`/`CHECK`/`MOBILE_PAYMENT`),
`reference?`, `notes?`.

- Récupère le taux de change de la devise de la commande
  (`getExchangeRateMap`) et calcule `appliedAmount` (conversion MAD → devise
  facture via `convertMadToInvoiceCurrency`).
- Recalcule le statut via `deriveInvoiceStatus`.
- En **transaction** : crée le `Payment`, met à jour le statut de la facture,
  met à jour la commande (`PAID` ou `INVOICED`), **et** crée une écriture de
  caisse `INCOME` (`createCashEntry`).

**Réponse `201`** : le paiement. (`Payment` stocke toujours `currency: 'MAD'`.)

### `GET /api/invoices/[id]/pdf` — `app/api/invoices/[id]/pdf/route.ts:10`

PDF de la facture via `InvoicePDF`. `force-dynamic`. **Réponse** :
`application/pdf`, `inline`.

### `POST /api/invoices/[id]/credit-notes` — `app/api/invoices/[id]/credit-notes/route.ts:28`

Crée un avoir. **Body** : `createCreditNoteSchema` (`lib/validators/invoice.ts`)
→ `mode` (`RETURN_ITEMS` défaut / `FREE_AMOUNT`), `issueDate` (datetime),
`reason` (≥ 3), `applyStampDuty` (bool), `notes?`, `items` (≥ 1).

Règles de validation :
- `RETURN_ITEMS` : quantité = somme des tailles ; `orderItemId` requis ;
  commande source obligatoire.
- `FREE_AMOUNT` : tailles à 0.
- Refuse si facture `CANCELLED`.
- Contrôle que les quantités retournées par taille et au total ne dépassent pas
  les quantités déjà facturées **moins** les avoirs précédents.
- Le cumul des avoirs ne peut dépasser le TTC de la facture.
- Génère un numéro `AV-<séquence 3>/<année>` (5 tentatives sur conflit).
- Recalcule le statut de la facture et de la commande.

**Réponse `201`** : l'avoir avec `items`, ou `400` avec le message d'erreur.

### `GET /api/invoices/[id]/credit-notes/[creditNoteId]/pdf` — `.../pdf/route.ts:10`

PDF d'un avoir via `CreditNotePDF`. Vérifie l'appartenance (`invoiceId = id`).
`force-dynamic`. **Réponse** : `application/pdf`, `inline`.

---

## 4. Tableau de bord

### `GET /api/dashboard/kpis` — `app/api/dashboard/kpis/route.ts:8`

Calcule en parallèle : taux de change, somme des paiements du mois
(`caMonth`), factures `PENDING`/`PARTIAL`, nombre de commandes actives
(`CONFIRMED`→`READY`), deadlines < 7 jours (statuts non terminés), factures en
retard (> 30 j, `PENDING`/`PARTIAL`), 5 dernières commandes, nombre de todos
actifs.

**Réponse `200`** :
`{ caMonth, pendingInvoicesCount, pendingInvoicesTotal, activeOrdersCount, activeTodosCount, upcomingDeadlines, overdueInvoices, recentOrders }`.
`pendingInvoicesTotal` convertit chaque solde restant en MAD via le taux.

---

## 5. Paramètres — taux de change

### `GET /api/settings/exchange-rates` — `app/api/settings/exchange-rates/route.ts:7`

**Réponse `200`** : `{ rates }` (map `currency → rateToMad`).

### `PUT /api/settings/exchange-rates` — `.../route.ts:16`

**Body** : `exchangeRateListSchema` → `{ rates: [{ currency, rateToMad }] }`
(devises `EUR`/`GBP`/`USD`, taux > 0). Upsert dans une transaction.
**Réponse `200`** : `{ rates }`. `409` si la table `ExchangeRate` n'est pas
disponible (migration non appliquée).

---

## 6. Fournisseurs

### `GET /api/suppliers` — `app/api/suppliers/route.ts:6`

Fournisseurs actifs triés par nom, avec `_count.purchases`. **Réponse `200`**.

### `POST /api/suppliers` — `app/api/suppliers/route.ts:19`

**Body** : `supplierSchema` → `name`, `type?`, `phone?`, `email?`, `city?`,
`ice?`, `notes?`. **Réponse `201`**.

### `GET /api/suppliers/[id]/purchases` — `app/api/suppliers/[id]/purchases/route.ts:6`

Achats du fournisseur, triés par date desc. **Réponse `200`**.

### `POST /api/suppliers/[id]/purchases` — `.../route.ts:19`

**Body** : `supplierPurchaseSchema` → `date`, `invoiceNumber?`, `description`,
`amountHT`, `tvaRate` (défaut 0.20), `stamps` (défaut 0), `paymentMethod?`,
`paymentDate?`, `amountPaid` (défaut 0), `notes?`.
Calcule `tvaAmount` et `totalTTC = amountHT + tvaAmount + stamps`.
**Réponse `201`**.

> ⚠ **À vérifier** — La création d'un achat fournisseur **ne crée pas**
> d'écriture de caisse `EXPENSE` (contrairement aux paiements clients). Le
> journal `CashEntry` n'est donc pas alimenté par les achats.

---

## 7. Tâches (todos)

### `GET /api/todos` — `app/api/todos/route.ts:6`

Tous les todos, triés `status asc`, `createdAt desc`, avec `owner` (id, name).
**Réponse `200`**.

### `POST /api/todos` — `app/api/todos/route.ts:18`

**Body** : `todoSchema` → `title`, `status` (défaut `TODO`), `ownerId?`,
`dueDate?`, `notes?`. **Réponse `201`**.

### `PUT /api/todos/[id]` — `app/api/todos/[id]/route.ts:6`

`todoSchema.partial()`. Ne met à jour que `title`/`status`/`notes` (⚠ `ownerId`
et `dueDate` ne sont **pas** appliqués lors d'un PUT). **Réponse `200`**.

### `DELETE /api/todos/[id]` — `app/api/todos/[id]/route.ts:29`

Suppression **physique**. **Réponse `200`** : `{ success: true }`.

---

## 8. Trésorerie (caisse)

### `GET /api/treasury/cash` — `app/api/treasury/cash/route.ts:7`

Paramètres optionnels `from` / `to` (dates) filtrant `date`. Tri par date asc.
**Réponse `200`** : tableau de `CashEntry`.

### `POST /api/treasury/cash` — `app/api/treasury/cash/route.ts:27`

**Body** : `cashEntrySchema` → `date`, `label`, `amount` (> 0), `type`
(`INCOME`/`EXPENSE`), `category?`, `reference?`.
En transaction via `createCashEntry` : calcule le `balance` cumulé (solde
précédent + ou − montant). **Réponse `201`** : l'écriture avec `balance`.

---

## 9. Routes de pages (frontend)

Ces routes ne sont pas des endpoints JSON mais des pages Next.js.

| Route | Fichier | Rôle |
| --- | --- | --- |
| `/login` | `app/(auth)/login/page.tsx` | Connexion (redirige vers `/` si connecté) |
| `/` | `app/(dashboard)/page.tsx` | Tableau de bord (KPIs) |
| `/clients` | `app/(dashboard)/clients/page.tsx` | Liste clients |
| `/clients/new` | `.../clients/new/page.tsx` | Création client |
| `/clients/[id]` | `.../clients/[id]/page.tsx` | Fiche client |
| `/clients/[id]/edit` | `.../clients/[id]/edit/page.tsx` | Édition client |
| `/orders` | `app/(dashboard)/orders/page.tsx` | Liste commandes |
| `/orders/new` | `.../orders/new/page.tsx` | Nouveau devis |
| `/orders/[id]` | `.../orders/[id]/page.tsx` | Détail commande |
| `/orders/[id]/edit` | `.../orders/[id]/edit/page.tsx` | Édition devis |
| `/invoices` | `app/(dashboard)/invoices/page.tsx` | Liste factures |
| `/invoices/[id]` | `.../invoices/[id]/page.tsx` | Détail facture |
| `/invoices/[id]/edit` | `.../invoices/[id]/edit/page.tsx` | Édition facture |
| `/treasury` | `app/(dashboard)/treasury/page.tsx` | Trésorerie |
| `/todos` | `app/(dashboard)/todos/page.tsx` | Tâches |

Le layout `app/(dashboard)/layout.tsx` est `force-dynamic` et redirige vers
`/login` si aucune session n'est trouvée (double protection avec `proxy.ts`).
