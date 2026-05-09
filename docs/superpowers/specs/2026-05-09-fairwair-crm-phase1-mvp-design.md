# FairwairManager CRM — Design Phase 1 MVP

**Date :** 2026-05-09  
**Périmètre :** Phase 1 MVP (semaines 1–6)  
**Objectif :** Remplacer les feuilles Excel de gestion globale par une application web sécurisée couvrant Clients, Devis/Commandes, Facturation, Trésorerie et Tâches.

---

## 1. Contexte métier

Fairwear Manufacture est un atelier de confection B2B/B2C à Agadir, Maroc. Le système actuel est un fichier Excel de 193 feuilles géré par Safa (responsable commerciale/administrative). Le CRM remplace ce fichier en centralisant : fiches clients, devis, factures, journal de caisse et tâches managériales.

Volume cible : ~200 clients, ~40 commandes simultanées, ~10 employés.

---

## 2. Stack technique

| Couche | Technologie |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| State | Zustand (UI) + TanStack Query (server state) |
| Backend | Next.js API Routes (full-stack monorepo) |
| Base de données | PostgreSQL via Supabase |
| ORM | Prisma |
| Auth | Supabase Auth (JWT) + middleware Next.js |
| Storage | Supabase Storage (PDFs) |
| PDF | @react-pdf/renderer |
| Hosting | Vercel |
| Langue UI | Français uniquement |

---

## 3. Architecture

### 3.1 Structure du repo

```
fairwair-manager/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   └── (dashboard)/
│       ├── layout.tsx              # Sidebar + header
│       ├── page.tsx                # Dashboard KPIs
│       ├── clients/
│       │   ├── page.tsx            # Liste clients
│       │   ├── new/page.tsx
│       │   └── [id]/page.tsx       # Fiche client (onglets)
│       ├── orders/
│       │   ├── page.tsx            # Liste devis/commandes
│       │   ├── new/page.tsx
│       │   └── [id]/page.tsx
│       ├── invoices/
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
│       ├── treasury/
│       │   └── page.tsx            # Journal de caisse
│       └── todos/
│           └── page.tsx
├── components/
│   ├── ui/                         # shadcn/ui (Button, Input, Table…)
│   ├── clients/
│   ├── orders/
│   ├── invoices/
│   ├── treasury/
│   └── shared/                     # DataTable, StatusBadge, CurrencyDisplay
├── lib/
│   ├── prisma.ts
│   ├── supabase.ts
│   ├── auth.ts
│   ├── calculations/
│   │   └── invoice.ts              # TVA 20%, timbre fiscal
│   └── validators/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── types/index.ts
```

### 3.2 Auth & Permissions

- Middleware Next.js intercepte toutes les routes `/(dashboard)/*` et vérifie le token JWT Supabase.
- Rôles : `ADMIN` | `COMMERCIAL` | `PRODUCTION` | `COMPTABLE` | `RH`
- Phase 1 : seuls `ADMIN` et `COMMERCIAL` sont actifs (les autres rôles existent en DB mais ne sont pas utilisés avant Phase 2).
- Supabase RLS activé sur toutes les tables dès le départ.

---

## 4. Modules Phase 1

### S1 — Fondations (semaine 1)

**Objectif :** Projet opérationnel avec auth fonctionnelle et schéma DB complet.

Tâches :
- Initialiser le projet Next.js 15 avec TypeScript, Tailwind, shadcn/ui
- Configurer Prisma + connexion Supabase
- Écrire le schéma Prisma complet (toutes les tables, même celles des phases 2 et 3 — évite les migrations destructives plus tard)
- Lancer les migrations et vérifier la connexion
- Implémenter Supabase Auth : page login, middleware de protection des routes
- Layout dashboard : sidebar avec navigation (Clients, Commandes, Factures, Trésorerie, Tâches)

**Tables créées en S1 :** User, Client, Measurement, Order, OrderItem, Invoice, Payment, CashEntry, Supplier, SupplierPurchase, Todo, Employee, Timesheet, Salary, ProductionPlan, ProductionLog, PriceList

---

### S2 — Module Clients (semaine 2)

**Objectif :** CRUD complet clients avec mensurations.

Fonctionnalités :
- Liste clients : tableau paginé avec recherche instantanée, filtres par type (BRAND / B2B / INDIVIDUAL / STUDIO), tri par nom/société/date
- Création/édition client : formulaire avec tous les champs (société, nom, prénom, email, téléphone, adresse, ville, ICE, TVA, type, notes)
- Fiche client : onglets Infos · Mensurations · Commandes · Factures
- Formulaire mensurations : épaule, poitrine, ceinture, bassin, longueur, longueur de taille, manches (cm)
- Archivage (soft delete via `active: false`)

API Routes :
- `GET/POST /api/clients`
- `GET/PUT/DELETE /api/clients/[id]`
- `GET/PUT /api/clients/[id]/measurements`

---

### S3 — Module Devis & Commandes (semaine 3)

**Objectif :** Créer un devis, le convertir en commande.

Fonctionnalités :
- Création devis : sélection client, ajout de lignes produits (désignation, tailles S/M/L/XL/TU, quantité, prix unitaire), calcul automatique total ligne, sous-total HT, TVA 20%, total TTC
- Numérotation automatique : `DEVIS-2026-001` (séquentiel par année)
- Statuts : QUOTE → CONFIRMED → SOURCING → STUDY → PRODUCTION → READY → DELIVERED → INVOICED → PAID → CANCELLED
- Conversion devis → commande confirmée (changement de statut)
- Liste commandes : filtrable par statut, client, deadline
- Vue détail commande : lignes produits + historique statuts

API Routes :
- `GET/POST /api/orders`
- `GET/PUT/DELETE /api/orders/[id]`
- `POST /api/orders/[id]/confirm`

**Calculs (lib/calculations/invoice.ts) :**
- `totalHT = sum(quantité × prix_unitaire)`
- `tvaAmount = totalHT × 0.20`
- `totalTTC = totalHT + tvaAmount`
- Timbre fiscal : `0.25% × totalTTC`, plafonné à 10 000 MAD (applicable sur factures finales uniquement)

---

### S4 — Module Facturation (semaine 4)

**Objectif :** Générer des factures PDF numérotées et suivre les paiements.

Fonctionnalités :
- Génération facture depuis une commande confirmée
- Numérotation automatique : `PR-016/2026` (séquentiel par année)
- Template PDF @react-pdf : en-tête Fairwear Manufacture, coordonnées client, lignes produits, HT/TVA/timbre/TTC
- Stockage PDF dans Supabase Storage, URL sauvegardée en DB
- Enregistrement paiements partiels : date, montant, mode (CASH / BANK_TRANSFER / CHECK), référence virement
- Calcul automatique "Reste à payer" = totalTTC − somme(paiements)
- Mise à jour automatique du statut facture : PENDING → PARTIAL → PAID
- Registre factures : tableau avec statuts colorés, filtre par statut/période
- Marquage "Transmis Comptable" (flag `accountingExported`)

API Routes :
- `GET/POST /api/invoices`
- `GET/PUT /api/invoices/[id]`
- `GET /api/invoices/[id]/pdf`
- `POST /api/invoices/[id]/payments`

---

### S5 — Module Trésorerie (semaine 5)

**Objectif :** Journal de caisse et registre fournisseurs.

Fonctionnalités :
- Journal de caisse : saisie opérations (libellé, montant, type INCOME/EXPENSE, catégorie), solde cumulé recalculé à chaque entrée
- Vue par période (semaine/mois) avec totaux recettes, dépenses, solde
- Registre fournisseurs : liste des achats avec numéro facture, montants HT/TVA/TTC, paiement (date, mode, montant payé), transmission comptable
- CRUD fournisseurs (nom, type, téléphone, email, ICE)

API Routes :
- `GET/POST /api/treasury/cash`
- `GET/POST /api/suppliers`
- `GET/POST /api/suppliers/[id]/purchases`

---

### S6 — Module Tâches + Dashboard (semaine 6)

**Objectif :** TO-DO opérationnel et tableau de bord KPIs.

Fonctionnalités TO-DO :
- Création tâche : titre, statut (TODO / IN_PROGRESS / BLOCKED / DONE), responsable (User), date limite, notes
- Vue liste avec filtres par statut/responsable
- Changement de statut en 1 clic

Dashboard KPIs :
- CA du mois en cours (somme paiements reçus sur le mois)
- Factures en attente (nombre + montant total)
- Commandes actives en production
- Tâches en cours et bloquées
- Widget "Deadlines proches" : commandes à livrer dans les 7 jours (surlignage rouge si dépassée)
- Widget "Impayés" : factures non réglées depuis +30 jours
- Mini-liste 5 dernières commandes

API Routes :
- `GET/POST /api/todos`
- `PUT /api/todos/[id]`
- `GET /api/dashboard/kpis`

---

## 5. Modèle de données — tables Phase 1 actives

Les tables suivantes sont créées dès S1 mais seulement utilisées en Phase 1 :

| Table | Utilisée dès |
|---|---|
| User | S1 |
| Client | S2 |
| Measurement | S2 |
| Order, OrderItem | S3 |
| Invoice, Payment | S4 |
| CashEntry | S5 |
| Supplier, SupplierPurchase | S5 |
| Todo | S6 |

Tables créées en S1 mais actives en Phase 2 : Employee, Timesheet, Salary, ProductionPlan, ProductionLog, PriceList.

---

## 6. Conventions de développement

- **Langue :** Interface entièrement en français. Code source (variables, fonctions, routes) en anglais.
- **Monnaie :** MAD (Dirham marocain), affichage avec séparateur de milliers et 2 décimales.
- **Dates :** Format `DD/MM/YYYY` à l'affichage, ISO 8601 en DB.
- **Composants :** shadcn/ui comme base, extensions dans `components/shared/`.
- **Validation :** Zod sur toutes les API Routes (entrée) et formulaires (react-hook-form + zodResolver).
- **Erreurs :** Réponses API structurées `{ error: string, details?: object }`.

---

## 7. Hors périmètre Phase 1

- Module Production (Kanban, planning journalier) → Phase 2 S7-S8
- Module RH (pointage, salaires) → Phase 2 S9-S10
- Emails automatiques (Resend) → Phase 3 S15
- Import Excel → Phase 3 S16
- Notifications push → Phase 2 S12
- PWA mobile → Phase 3 S17

---

## 8. Critères de succès Phase 1

- [ ] Login sécurisé fonctionnel (JWT Supabase)
- [ ] CRUD clients complet avec mensurations
- [ ] Devis créé → converti en commande en < 3 clics
- [ ] Facture PDF générée avec numérotation correcte
- [ ] Paiements partiels avec reste à payer calculé automatiquement
- [ ] Journal de caisse avec solde en temps réel
- [ ] Dashboard avec les 4 KPIs principaux
- [ ] Déployé sur Vercel et accessible via HTTPS
