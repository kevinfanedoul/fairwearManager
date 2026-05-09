# FAIRWEAR MANUFACTURE — Analyse Excel & Conception CRM SaaS
**Reverse Engineering complet · Architecture technique · Roadmap de développement**

---

## PARTIE 1 — ANALYSE MÉTIER DU FICHIER EXCEL

### 1.1 Vue d'ensemble du système

Le fichier Excel représente le système de gestion opérationnel complet de **Fairwear Manufacture**, un atelier de confection situé à **Agadir, Maroc**. Il compte **193 feuilles** couvrant l'intégralité des opérations : clients, production, RH, comptabilité, fournisseurs et TO-DO.

**Nature de l'activité :**
- Atelier de couture B2B et B2C
- Services : Bureau d'Étude (patronage, prototypage, gradation), production à façon, uniformes, broderie, sourcing tissu
- Clients : marques de mode françaises et marocaines, hôtels, restaurants, particuliers
- Volume actif : ~40 commandes simultanées, ~10 employés en production

---

### 1.2 Cartographie des feuilles

#### Feuilles de gestion globale (8 feuilles)

| Feuille | Rôle métier |
|---|---|
| `TO DO` | Liste de tâches managériales avec état (Terminé / Bloqué / Non commencé) et responsable (SAFA) |
| `PLANNING DE PRODUCTION` | Planning global multi-clients : dates, quantités, deadlines, état des étapes (Sourcing / BE / Prod) |
| `PRIX` | Référentiel tarifaire interne (fournisseurs Moussa et Samuel Styltex : DTF, sérigraphie, broderie, étiquettes, t-shirts, hoodies) |
| `CAISSES` | Journal de caisse hebdomadaire : recettes, dépenses, solde, contrôle de caisse — couvre plusieurs mois (Fév à Mai 2026) |
| `CAISSE 0405 au 0905` | Période de caisse complémentaire |
| `pointage personnel` | Feuille RH : pointage journalier par employé, calcul automatique des heures normales/supp, salaires hebdomadaires |
| `BON SANS FACTURE` | Suivi des achats sans justificatif formel (tissus, coursiers, divers) + estimation des charges fixes mensuelles/annuelles |
| `Suivi production` | Planning de production journalier et nominatif : quelle couturière fait quoi chaque jour |
| `Les dates dentrées` | Dates d'entrée des commandes/dossiers en atelier |
| `Suivi fournisseurs` | Journal des achats fournisseurs : ILMATEX, STYLÉTEX, loyer HASSAN ZALI, électricité, assurance, comptable — avec suivi de paiement et transmission comptable |
| `Suivi Clients` | Registre de facturation global : n° facture, client, montant HT/TVA/TTC, mode de règlement, date de règlement, transmission comptable |
| `Quaron` | Feuille fournisseur interne : sous-traitance patronage/gradation avec tarifs et état de paiement |

#### Feuilles clients (181 feuilles)

Chaque client dispose de sa propre feuille structurée de façon quasi-identique :
- **Coordonnées** : Société, Nom, Prénom, Adresse, Téléphone, ICE, Email
- **Mensuration** (clients particuliers) : épaule, poitrine, ceinture, bassin, longueur
- **Commande en cours** : tableau Date / N° Bon / Désignation / Tailles (S/M/L/XL/TU) / Quantité / Prix unitaire / Total / État
- **Facturation** : factures passées numérotées (ex. PR 019/2025), avec décomposition HT/TVA/TTC et suivi des règlements partiels
- **Historique d'achats** (particuliers)

**Profils clients identifiés :**
- Marques françaises (Jennifer Wesoluch / Paradoxal, Bleu Mon Jules, Lacerf, FDP, Nina Vernois, Thomas Series, Romane Bernheim…)
- Clients B2B marocains (Africa Surf Company, Villa Mandalla, Windy Bay, Zahir Riad, Nadi Kanadi, Hotel Amouage…)
- Clients particulières avec mensurations (Zellige, Zahra, Fatiha, Imane, Cathy…)
- Agences / studios de design (AÏA Studio, Emma Conny Brand, Yenna Brand, Vienna Project…)

---

### 1.3 Logique métier identifiée

#### Pipeline de commande en 4 étapes

```
DEVIS → SOURCING → BUREAU D'ÉTUDE (BE) → PRODUCTION → LIVRAISON → FACTURATION
```

Le planning de production trace ces 4 étapes par colonnes avec une case à cocher (x = réalisé).

#### Calculs financiers

- **TVA 20%** systématique sur les factures marocaines B2B
- **Timbre fiscal** calculé sur certaines factures (ex. 23,015 DH pour une facture à 9 206 DH TTC)
- **Règlement partiel** possible : plusieurs lignes "Réglé le [date] - [montant]" avec calcul du "Reste à payer"
- **Loyer** : 6 000 DH/mois avec taxe 10% = net 5 400 DH, suivi mensuel

#### Calculs RH (feuille pointage)

- Heures travaillées = (heure fin - heure début - pause) × facteur de conversion décimal
- Heures normales = base hebdomadaire (~43,5h)
- Heures supplémentaires = total - normales
- Salaire calculé automatiquement avec un taux horaire implicite
- Primes ponctuelles ajoutées (ex. 35 DH × 11 chemises = 385 DH pour Hassan)

#### Numérotation des factures

Format : `PR [numéro séquentiel]/[année]` — ex. PR 016/2026  
Les bons de commande internes ont un numéro distinct.

---

### 1.4 Workflows utilisateurs implicites

**Safa (responsable commerciale/administrative) :**
1. Crée ou met à jour la fiche client dans son onglet dédié
2. Renseigne le devis dans la section "Commande en cours"
3. Coche les étapes dans le planning de production
4. Enregistre les règlements dans la fiche client
5. Reporte la facture validée dans "Suivi Clients"
6. Saisit les achats fournisseurs dans "Suivi fournisseurs"
7. Gère la caisse (encaissements + dépenses quotidiennes)
8. Suit les TO-DO avec état

**Responsable production :**
1. Consulte le planning de production
2. Remplit la feuille "Suivi production" (qui fait quoi chaque jour)
3. Met à jour les états dans les onglets clients

**Comptable externe :**
- Reçoit les feuilles "Suivi Clients" et "Suivi Fournisseurs" marquées "Transmis Comptable"

---

## PARTIE 2 — FONCTIONNALITÉS CRM EXTRAITES

### Module Clients

**F01 — Gestion des fiches clients**
- Description : Créer, modifier, archiver les fiches clients avec coordonnées complètes, ICE/TVA, contacts multiples, type de client (B2B/B2C/Marque)
- Objectif : Centraliser toutes les informations clients en un seul endroit
- Priorité : **MVP**
- Données : Société, nom, prénom, adresse, ville, téléphone, email, ICE, TVA, type
- Actions : CRUD, export PDF, recherche, filtre par type/ville/statut
- Permissions : Lecture tous, écriture admin + commercial

**F02 — Mensurations clients particuliers**
- Description : Stocker et versionner les mensurations (épaule, poitrine, ceinture, bassin, longueur, longueur de taille, manches)
- Objectif : Éviter les erreurs de coupe sur les commandes sur mesure
- Priorité : **MVP**
- Automatisations : Rappel si mesures datant de +12 mois

**F03 — Historique d'achats client**
- Description : Timeline chronologique de toutes les commandes, factures et paiements d'un client
- Priorité : **MVP**
- Actions : Filtrer par période, exporter, voir les encours

---

### Module Devis & Commandes

**F04 — Création de devis**
- Description : Générer un devis structuré avec lignes de produits (Désignation, tailles S/M/L/XL/TU, quantité, prix unitaire, total), calcul automatique HT/TVA/TTC
- Objectif : Standardiser et accélérer la création des devis
- Priorité : **MVP**
- Données : N° devis, date, client, lignes produits, total HT, TVA, TTC, état
- Actions : Créer, modifier, envoyer par email, convertir en commande, dupliquer
- Automatisations : Numérotation automatique `DEVIS-[YYYY]-[NNN]`

**F05 — Gestion des commandes en cours**
- Description : Vue de toutes les commandes actives avec état d'avancement, deadline, quantités par taille, montants
- Priorité : **MVP**
- Actions : Changer d'état, assigner à un employé, noter des observations

**F06 — Suivi des règlements partiels**
- Description : Enregistrer des paiements partiels avec date, montant, mode de règlement — calcul automatique du reste à payer
- Priorité : **MVP**
- Données : Facture liée, date règlement, montant, mode (espèces/virement BMCE/chèque), référence virement
- Automatisations : Alerte si facture impayée depuis N jours

---

### Module Facturation

**F07 — Génération de factures**
- Description : Créer des factures numérotées `PR-[NNN]/[YYYY]` en PDF à partir d'une commande validée, avec en-tête société, TVA, timbre fiscal
- Priorité : **MVP**
- Automatisations : Numérotation séquentielle, calcul TVA 20%, calcul timbre fiscal
- Export : PDF téléchargeable et envoyable par email

**F08 — Registre de facturation (Suivi Clients)**
- Description : Tableau de bord comptable des factures émises avec statut de paiement et transmission au comptable
- Priorité : **MVP**
- Actions : Marquer "Transmis Comptable", filtrer par période, exporter CSV/Excel

**F09 — Bons sans facture**
- Description : Enregistrer les achats sans facture formelle (marchés, coursiers, petites fournitures) avec catégorie et montant
- Priorité : **Important**

---

### Module Production

**F10 — Pipeline de production**
- Description : Vue Kanban ou tableau par client avec étapes Sourcing → Bureau d'Étude → Production → Livraison, chacune avec état (à faire / en cours / fait)
- Objectif : Visibilité en temps réel sur l'avancement de chaque dossier
- Priorité : **MVP**
- Données : Client, date commande, quantité, deadline, responsable, état par étape, observations

**F11 — Planning journalier de production**
- Description : Grille semaine × employé indiquant les tâches réalisées chaque jour par chaque couturière
- Priorité : **Important**
- Actions : Saisie rapide, vue par semaine, historique

**F12 — Suivi des dates d'entrée dossiers**
- Description : Enregistrement de la date d'entrée de chaque commande en atelier pour calcul des délais
- Priorité : **Important**
- Automatisations : Alerte si dossier en retard sur deadline

---

### Module RH

**F13 — Pointage du personnel**
- Description : Saisie journalière des heures de chaque employé (entrée, sortie, pause), calcul automatique total heures, heures normales, heures supplémentaires
- Priorité : **MVP**
- Données : Employé, date, début, fin, pause, total heures, obs (retard, absence)

**F14 — Calcul automatique des salaires**
- Description : Calcul hebdomadaire du salaire sur la base des heures travaillées + primes éventuelles, avec taux horaire paramétrable par employé
- Priorité : **MVP**
- Automatisations : Génération automatique du bulletin de salaire hebdomadaire

**F15 — Suivi des avances sur salaire**
- Description : Enregistrer les avances versées aux employés et les déduire du salaire suivant
- Priorité : **Important**

---

### Module Trésorerie & Comptabilité

**F16 — Journal de caisse**
- Description : Saisie des opérations de caisse quotidiennes (recettes + dépenses), calcul du solde courant, contrôle de clôture
- Priorité : **MVP**
- Données : Date, libellé, recette, dépense, solde cumulé, catégorie

**F17 — Suivi fournisseurs**
- Description : Registre des achats fournisseurs avec numéro de facture, montants HT/TVA/TTC, mode et date de règlement, transmission comptable
- Priorité : **MVP**

**F18 — Suivi loyer**
- Description : Suivi mensuel du loyer avec taxe 10%, paiements effectués, solde restant
- Priorité : **Important**

**F19 — Tableau de charges fixes**
- Description : Estimation mensuelle et annuelle des charges fixes (salaires, loyer, électricité, internet, comptable, transport, etc.)
- Priorité : **Important**

---

### Module Référentiels

**F20 — Référentiel tarifaire**
- Description : Catalogue des prix fournisseurs (broderie, impression DTF, sérigraphie, t-shirts, hoodies) consultable lors de la création de devis
- Priorité : **Important**

**F21 — Catalogue produits**
- Description : Bibliothèque des types de pièces produites (pantalon, robe, veste, tablier, abaya…) avec prix de production standard
- Priorité : **Avancé**

---

### Module Tâches & Collaboration

**F22 — Gestionnaire de tâches**
- Description : Liste de TO-DO assignable à un responsable, avec état (à faire / en cours / terminé / bloqué) et notes
- Priorité : **MVP**
- Automatisations : Notifications si tâche bloquée depuis N jours

**F23 — Système de notifications**
- Description : Alertes internes pour deadlines de production, factures impayées, tâches bloquées, relances clients
- Priorité : **Important**

---

## PARTIE 3 — ARCHITECTURE TECHNIQUE DU CRM

### 3.1 Stack recommandée

```
Frontend         → Next.js 14 (App Router) + React + TypeScript
UI               → Tailwind CSS + shadcn/ui
State            → Zustand + React Query (TanStack Query)
Backend          → Next.js API Routes (full-stack) OU Node.js séparé (Express/Fastify)
Base de données  → PostgreSQL (Supabase)
ORM              → Prisma
Auth             → Supabase Auth (JWT + RLS)
Stockage         → Supabase Storage (PDFs factures, pièces jointes)
Emails           → Resend (envoi devis/factures)
PDF              → Puppeteer OU React-PDF (@react-pdf/renderer)
Queue/Jobs       → Inngest OU Trigger.dev (tâches asynchrones, rappels)
Hosting          → Vercel (frontend) + Supabase (backend/DB)
Monitoring       → Sentry
```

### 3.2 Architecture globale

```
┌─────────────────────────────────────────────────┐
│                   CLIENTS                       │
│   Browser / Mobile (PWA)                        │
└────────────────┬────────────────────────────────┘
                 │ HTTPS
┌────────────────▼────────────────────────────────┐
│              NEXT.JS APP                        │
│   App Router (RSC + Client Components)         │
│   API Routes /api/...                           │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│           SUPABASE BACKEND                      │
│   PostgreSQL + RLS + Realtime                   │
│   Auth (JWT)                                    │
│   Storage (fichiers)                            │
└─────────────────────────────────────────────────┘
```

### 3.3 Authentification & Permissions

**Rôles utilisateurs :**

| Rôle | Description | Accès |
|---|---|---|
| `admin` | Gérant / Safa | Accès total |
| `commercial` | Responsable devis/clients | Clients, devis, commandes, facturation |
| `production` | Chef atelier | Planning production, suivi production |
| `comptable` | Comptable externe | Lecture seule Suivi Clients + Suivi Fournisseurs |
| `rh` | Responsable RH | Pointage, salaires |

**Row Level Security (RLS) Supabase** : chaque table filtre automatiquement selon le rôle JWT.

---

## PARTIE 4 — MODÉLISATION BASE DE DONNÉES

### Schéma Prisma

```prisma
// ============================================================
// FAIRWEAR CRM — Schema Prisma
// ============================================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
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

  todos     Todo[]
  tasks     ProductionPlanningItem[]
  timesheets Timesheet[]
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
  id            String     @id @default(uuid())
  type          ClientType @default(BRAND)
  company       String?
  firstName     String?
  lastName      String?
  email         String?
  phone         String?
  address       String?
  city          String?
  country       String     @default("MA")
  ice           String?    // Identifiant Commun de l'Entreprise (Maroc)
  tvaNumber     String?
  notes         String?
  active        Boolean    @default(true)
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  measurements  Measurement?
  orders        Order[]
  invoices      Invoice[]
  purchaseHistory PurchaseHistory[]

  @@index([company])
  @@index([lastName])
}

enum ClientType {
  BRAND        // Marque de mode
  B2B          // Professionnel local (hôtel, restaurant…)
  INDIVIDUAL   // Particulier
  STUDIO       // Studio de design
}

model Measurement {
  id              String   @id @default(uuid())
  clientId        String   @unique
  client          Client   @relation(fields: [clientId], references: [id])
  shoulder        Float?   // Épaule (cm)
  chest           Float?   // Poitrine
  waist           Float?   // Ceinture
  hips            Float?   // Bassin
  length          Float?   // Longueur
  waistLength     Float?   // Longueur de taille
  sleeves         Float?   // Manches
  notes           String?
  updatedAt       DateTime @updatedAt
}

// ─── COMMANDES & DEVIS ──────────────────────────────────────

model Order {
  id            String      @id @default(uuid())
  reference     String      @unique // "DEVIS-2026-042"
  clientId      String
  client        Client      @relation(fields: [clientId], references: [id])
  status        OrderStatus @default(QUOTE)
  orderDate     DateTime    @default(now())
  deadline      DateTime?
  totalHT       Decimal     @db.Decimal(12, 2) @default(0)
  totalTTC      Decimal     @db.Decimal(12, 2) @default(0)
  currency      String      @default("MAD")
  notes         String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  items         OrderItem[]
  production    ProductionPlan?
  invoice       Invoice?
  payments      Payment[]

  @@index([clientId])
  @@index([status])
}

enum OrderStatus {
  QUOTE           // Devis envoyé
  CONFIRMED       // Commande confirmée
  SOURCING        // Sourcing en cours
  STUDY           // Bureau d'étude en cours
  PRODUCTION      // En production
  READY           // Prêt à livrer
  DELIVERED       // Livré
  INVOICED        // Facturé
  PAID            // Réglé
  CANCELLED       // Annulé
}

model OrderItem {
  id          String  @id @default(uuid())
  orderId     String
  order       Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  designation String
  sizeS       Int?    @default(0)
  sizeM       Int?    @default(0)
  sizeL       Int?    @default(0)
  sizeXL      Int?    @default(0)
  sizeTU      Int?    @default(0)
  quantity    Int     @default(0)
  unitPrice   Decimal @db.Decimal(10, 2)
  totalPrice  Decimal @db.Decimal(10, 2)
  notes       String?

  @@index([orderId])
}

// ─── FACTURATION ────────────────────────────────────────────

model Invoice {
  id                String        @id @default(uuid())
  number            String        @unique // "PR-016-2026"
  clientId          String
  client            Client        @relation(fields: [clientId], references: [id])
  orderId           String?       @unique
  order             Order?        @relation(fields: [orderId], references: [id])
  issueDate         DateTime      @default(now())
  dueDate           DateTime?
  totalHT           Decimal       @db.Decimal(12, 2)
  tvaRate           Decimal       @db.Decimal(5, 4) @default(0.20)
  tvaAmount         Decimal       @db.Decimal(12, 2)
  stampDuty         Decimal       @db.Decimal(8, 2) @default(0)
  totalTTC          Decimal       @db.Decimal(12, 2)
  status            InvoiceStatus @default(PENDING)
  pdfUrl            String?
  accountingExported Boolean      @default(false)
  accountingExportedAt DateTime?
  notes             String?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  payments          Payment[]

  @@index([clientId])
  @@index([status])
}

enum InvoiceStatus {
  DRAFT
  PENDING       // En attente de règlement
  PARTIAL       // Partiellement réglée
  PAID          // Réglée
  OVERDUE       // En retard
  CANCELLED
}

model Payment {
  id          String        @id @default(uuid())
  invoiceId   String?
  invoice     Invoice?      @relation(fields: [invoiceId], references: [id])
  orderId     String?
  order       Order?        @relation(fields: [orderId], references: [id])
  date        DateTime
  amount      Decimal       @db.Decimal(12, 2)
  method      PaymentMethod
  reference   String?       // Référence virement BMCE
  notes       String?
  createdAt   DateTime      @default(now())
}

enum PaymentMethod {
  CASH
  BANK_TRANSFER  // Virement BMCE
  CHECK
  MOBILE_PAYMENT
}

// ─── PRODUCTION ─────────────────────────────────────────────

model ProductionPlan {
  id              String   @id @default(uuid())
  orderId         String   @unique
  order           Order    @relation(fields: [orderId], references: [id])
  sourcingDone    Boolean  @default(false)
  sourcingDate    DateTime?
  studyDone       Boolean  @default(false)
  studyDate       DateTime?
  productionDone  Boolean  @default(false)
  productionDate  DateTime?
  deliveryDone    Boolean  @default(false)
  deliveryDate    DateTime?
  notes           String?
  updatedAt       DateTime @updatedAt
}

model ProductionLog {
  id          String   @id @default(uuid())
  weekStart   DateTime
  employeeId  String
  employee    Employee @relation(fields: [employeeId], references: [id])
  dayOfWeek   Int      // 1=Lundi ... 6=Samedi
  tasks       String   // Description libre des tâches du jour
  orderId     String?
  createdAt   DateTime @default(now())

  @@index([weekStart, employeeId])
}

// ─── RH ─────────────────────────────────────────────────────

model Employee {
  id          String   @id @default(uuid())
  name        String
  role        String?  // Ex: "Couturière", "Patroniste"
  hourlyRate  Decimal  @db.Decimal(8, 2)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())

  timesheets  Timesheet[]
  productionLogs ProductionLog[]
  salaries    Salary[]
}

model Timesheet {
  id            String   @id @default(uuid())
  employeeId    String
  employee      Employee @relation(fields: [employeeId], references: [id])
  date          DateTime
  startTime     DateTime
  endTime       DateTime
  breakDuration Float    @default(0.5)
  totalHours    Float
  notes         String?
  recordedBy    String?
  createdAt     DateTime @default(now())

  @@index([employeeId, date])
}

model Salary {
  id              String   @id @default(uuid())
  employeeId      String
  employee        Employee @relation(fields: [employeeId], references: [id])
  weekStart       DateTime
  weekEnd         DateTime
  normalHours     Float
  overtimeHours   Float
  baseSalary      Decimal  @db.Decimal(10, 2)
  bonuses         Decimal  @db.Decimal(10, 2) @default(0)
  advances        Decimal  @db.Decimal(10, 2) @default(0)
  totalPaid       Decimal  @db.Decimal(10, 2)
  paidAt          DateTime?
  notes           String?
  createdAt       DateTime @default(now())
}

// ─── TRÉSORERIE ─────────────────────────────────────────────

model CashEntry {
  id          String          @id @default(uuid())
  date        DateTime
  label       String
  amount      Decimal         @db.Decimal(10, 2)
  type        CashEntryType
  category    String?
  reference   String?
  balance     Decimal         @db.Decimal(12, 2)
  periodStart DateTime?
  periodEnd   DateTime?
  createdAt   DateTime        @default(now())
}

enum CashEntryType {
  INCOME      // Recette
  EXPENSE     // Dépense
}

// ─── FOURNISSEURS ────────────────────────────────────────────

model Supplier {
  id          String   @id @default(uuid())
  name        String
  type        String?  // tissu, impression, logistique, services
  phone       String?
  email       String?
  city        String?
  ice         String?
  active      Boolean  @default(true)
  notes       String?
  createdAt   DateTime @default(now())

  purchases   SupplierPurchase[]
}

model SupplierPurchase {
  id                String        @id @default(uuid())
  supplierId        String
  supplier          Supplier      @relation(fields: [supplierId], references: [id])
  date              DateTime
  invoiceNumber     String?
  description       String
  amountHT          Decimal       @db.Decimal(10, 2)
  tvaRate           Decimal       @db.Decimal(5, 4) @default(0.20)
  tvaAmount         Decimal       @db.Decimal(10, 2) @default(0)
  totalTTC          Decimal       @db.Decimal(10, 2)
  stamps            Decimal       @db.Decimal(8, 2) @default(0)
  paymentMethod     PaymentMethod?
  paymentDate       DateTime?
  amountPaid        Decimal       @db.Decimal(10, 2) @default(0)
  accountingExported Boolean      @default(false)
  notes             String?
  createdAt         DateTime      @default(now())

  @@index([supplierId])
}

// ─── TÂCHES ─────────────────────────────────────────────────

model Todo {
  id          String     @id @default(uuid())
  title       String
  status      TodoStatus @default(TODO)
  ownerId     String?
  owner       User?      @relation(fields: [ownerId], references: [id])
  notes       String?
  dueDate     DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
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
  category    String   // "Broderie", "DTF", "T-shirt", etc.
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

---

## PARTIE 5 — ROADMAP DE DÉVELOPPEMENT

### Phase 1 — MVP (semaines 1–6)

**Objectif :** Remplacer les 10 feuilles de gestion globale + CRUD clients de base.

| Semaine | Tâches | Complexité |
|---|---|---|
| S1 | Setup projet (Next.js, Supabase, Prisma, Auth) + migrations DB | Faible |
| S2 | Module Clients : CRUD, recherche, fiche client + mensurations | Faible |
| S3 | Module Devis/Commandes : création devis, lignes produits, calcul HT/TVA/TTC | Moyenne |
| S4 | Module Facturation : génération PDF, numérotation auto, suivi paiements | Haute |
| S5 | Module Trésorerie : journal de caisse, solde en temps réel | Moyenne |
| S6 | Module Tâches : TO-DO avec état et responsable + tableau de bord principal | Faible |

**Livrables Phase 1 :**
- Application web sécurisée avec login
- Gestion de 200+ clients importés depuis Excel
- Devis → Facture → Paiement
- Journal de caisse
- Dashboard : CA du mois, factures en attente, tâches en cours

---

### Phase 2 — Beta (semaines 7–12)

**Objectif :** Couvrir la production et les RH.

| Semaine | Tâches | Complexité |
|---|---|---|
| S7 | Module Production : pipeline Kanban 4 étapes par commande | Haute |
| S8 | Planning journalier production (grille semaine × employé) | Moyenne |
| S9 | Module RH : pointage journalier, calcul heures | Moyenne |
| S10 | Module Salaires : calcul hebdo automatique, primes, avances | Haute |
| S11 | Module Fournisseurs : registre achats, transmission comptable | Moyenne |
| S12 | Notifications internes : deadlines, impayés, tâches bloquées | Moyenne |

---

### Phase 3 — Production (semaines 13–18)

**Objectif :** Scalabilité, IA, intégrations.

| Semaine | Tâches | Complexité |
|---|---|---|
| S13 | Reporting avancé : CA par client, par mois, charges vs recettes | Haute |
| S14 | Export comptable (CSV Sage-compatible) | Moyenne |
| S15 | Emails automatiques : envoi devis/facture par Resend | Faible |
| S16 | Import initial depuis Excel (migration données) | Haute |
| S17 | App mobile PWA optimisée | Moyenne |
| S18 | Audit logs, RGPD, backup automatique | Haute |

---

## PARTIE 6 — STRUCTURE DU PROJET

```
fairwear-crm/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Dashboard principal
│   │   ├── clients/
│   │   │   ├── page.tsx                # Liste clients
│   │   │   ├── [id]/page.tsx           # Fiche client
│   │   │   └── new/page.tsx
│   │   ├── orders/
│   │   │   ├── page.tsx                # Liste commandes/devis
│   │   │   ├── [id]/page.tsx           # Détail commande
│   │   │   └── new/page.tsx
│   │   ├── invoices/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── production/
│   │   │   ├── page.tsx                # Kanban production
│   │   │   └── planning/page.tsx       # Planning journalier
│   │   ├── hr/
│   │   │   ├── timesheet/page.tsx
│   │   │   └── salaries/page.tsx
│   │   ├── treasury/
│   │   │   ├── cash/page.tsx           # Journal de caisse
│   │   │   └── suppliers/page.tsx
│   │   ├── todos/page.tsx
│   │   └── settings/page.tsx
│   └── api/
│       ├── clients/route.ts
│       ├── orders/route.ts
│       ├── invoices/
│       │   ├── route.ts
│       │   └── [id]/pdf/route.ts       # Génération PDF
│       ├── production/route.ts
│       ├── hr/
│       │   ├── timesheet/route.ts
│       │   └── salaries/route.ts
│       └── treasury/route.ts
│
├── components/
│   ├── ui/                             # shadcn/ui components
│   ├── clients/
│   │   ├── ClientCard.tsx
│   │   ├── ClientForm.tsx
│   │   ├── MeasurementsForm.tsx
│   │   └── ClientHistory.tsx
│   ├── orders/
│   │   ├── OrderForm.tsx
│   │   ├── OrderItemsTable.tsx
│   │   └── PaymentTracker.tsx
│   ├── invoices/
│   │   ├── InvoicePDF.tsx              # Template PDF @react-pdf
│   │   └── InvoiceList.tsx
│   ├── production/
│   │   ├── KanbanBoard.tsx
│   │   ├── KanbanCard.tsx
│   │   └── WeeklyGrid.tsx
│   ├── hr/
│   │   ├── TimesheetGrid.tsx
│   │   └── SalaryCard.tsx
│   ├── treasury/
│   │   ├── CashJournal.tsx
│   │   └── CashBalance.tsx
│   └── shared/
│       ├── DataTable.tsx
│       ├── SearchBar.tsx
│       ├── StatusBadge.tsx
│       └── CurrencyDisplay.tsx
│
├── lib/
│   ├── prisma.ts
│   ├── supabase.ts
│   ├── auth.ts
│   ├── pdf/
│   │   └── invoice-template.ts
│   ├── calculations/
│   │   ├── invoice.ts                  # Calculs TVA, timbre
│   │   └── salary.ts                   # Calculs heures/salaires
│   └── validators/
│       ├── client.ts
│       └── order.ts
│
├── hooks/
│   ├── useClients.ts
│   ├── useOrders.ts
│   ├── useProduction.ts
│   └── usePayments.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                         # Import initial depuis Excel
│   └── migrations/
│
└── types/
    └── index.ts
```

---

## PARTIE 7 — UX/UI — ÉCRANS PRINCIPAUX

### Dashboard
- KPIs : CA du mois, factures en attente (nb + montant), commandes en production, tâches en cours
- Widget "Deadlines proches" (commandes à livrer dans les 7 jours)
- Widget "Impayés" (factures +30 jours)
- Mini-liste des dernières commandes

### Vue Clients
- Tableau avec filtres : type, ville, encours, date dernière commande
- Recherche instantanée
- Bouton "Nouvelle commande" depuis la fiche client

### Vue Commandes / Kanban Production
- 6 colonnes : Devis → Confirmé → Sourcing → BE → Production → Livré
- Cartes avec : client, quantité, deadline (code couleur rouge si dépassée)
- Drag & drop pour changer d'étape

### Vue Facturation
- Tableau avec filtre par statut (Tout / En attente / Partiellement réglé / Payé / En retard)
- Bouton "Exporter comptable" pour les factures marquées à transmettre
- Preview PDF inline

### Fiche Client complète
- Onglets : Infos · Mensurations · Commandes · Factures · Historique
- Timeline des interactions et paiements

### Pointage RH
- Grille semaine × employé (9 colonnes)
- Saisie heure début/fin/pause par cellule
- Calcul automatique visible en bas : total heures, heures sup, salaire estimé

---

## PARTIE 8 — AUTOMATISATIONS & IA

### Automatisations immédiatement utiles

| Trigger | Action | Priorité |
|---|---|---|
| Commande confirmée | Créer automatiquement un plan de production | MVP |
| Facture générée | Numérotation séquentielle automatique + calcul timbre | MVP |
| Paiement enregistré | Mise à jour statut facture (Partial/Paid) | MVP |
| Date pointage saisie | Calcul automatique heures + salaire estimé | MVP |
| Deadline commande J-3 | Notification interne à la production | Phase 2 |
| Facture non payée +30j | Alerte commerciale + email de relance automatique | Phase 2 |
| Tâche marquée "Bloquée" | Notification au manager | Phase 2 |

### Automatisations avancées (Phase 3)

- **Scoring client** : calcul automatique de la valeur client (CA total, fréquence, retards de paiement)
- **Suggestion de prix** : sur la base du référentiel tarifaire, suggérer un prix de production lors de la création d'un devis
- **Rapport hebdomadaire auto** : synthèse PDF envoyée chaque lundi à la direction (CA semaine, production en cours, impayés)
- **Prédiction de charge** : estimer les semaines surchargées selon les deadlines actives
- **IA rédaction** : pré-remplissage des désignations de devis à partir du type de pièce sélectionné

---

## PARTIE 9 — SÉCURITÉ & RGPD

### RBAC (Role-Based Access Control)

| Action | ADMIN | COMMERCIAL | PRODUCTION | COMPTABLE | RH |
|---|---|---|---|---|---|
| Voir clients | ✓ | ✓ | lecture | — | — |
| Créer/modifier client | ✓ | ✓ | — | — | — |
| Créer devis/facture | ✓ | ✓ | — | — | — |
| Voir factures | ✓ | ✓ | — | ✓ (lecture) | — |
| Export comptable | ✓ | ✓ | — | ✓ | — |
| Gérer production | ✓ | lecture | ✓ | — | — |
| Pointage/salaires | ✓ | — | — | — | ✓ |
| Paramètres | ✓ | — | — | — | — |

### Sécurité technique
- RLS Supabase sur toutes les tables
- Tokens JWT avec expiration + refresh
- Audit log : toutes les actions critiques (création facture, modification paiement, suppression) sont tracées avec `userId`, `action`, `timestamp`, `previousValue`
- Backup automatique quotidien via Supabase (point-in-time recovery)
- HTTPS only, CSP headers

### RGPD
- Droit à l'effacement : anonymisation possible des données client (nom → "CLIENT_SUPPRIMÉ")
- Export données client en JSON sur demande
- Pas de partage données tiers sans consentement explicite
- Données hébergées en Europe (Supabase EU region)

---

## PARTIE 10 — RECOMMANDATIONS & RISQUES

### Risques techniques

| Risque | Impact | Mitigation |
|---|---|---|
| Migration des 193 feuilles Excel → DB | Élevé | Script de migration semi-auto + validation manuelle par lots |
| Données incohérentes dans Excel (formats mixtes, dates numériques) | Moyen | Validation stricte lors de l'import |
| Résistance au changement des utilisatrices | Élevé | Formation courte + interface épurée + import du carnet existant |
| Calculs salaires critiques (paie hebdo) | Élevé | Tests unitaires exhaustifs + validation manuelle en parallèle les 4 premières semaines |

### Améliorations non couvertes par Excel

1. **Historique de modification** : savoir qui a changé quoi et quand
2. **Accès mobile** : saisir du pointage depuis le téléphone
3. **Multi-utilisateurs simultanés** : plus de conflit sur le fichier
4. **Recherche cross-client** : trouver en 1 seconde tous les clients qui ont commandé des "pantalons"
5. **Reporting dynamique** : CA par type de client, par produit, par mois
6. **Alertes proactives** : ne plus oublier de relancer un client

### Priorités MVP absolues

1. Fiche client + historique commandes/factures
2. Création devis → facture PDF avec numérotation
3. Suivi paiements partiels + statut facture
4. Journal de caisse
5. Planning de production Kanban
6. Pointage + calcul salaires hebdo

---

*Document généré à partir de l'analyse complète du fichier Excel SUIVI_COMMANDES_CLIENTS_1_.xlsx — 193 feuilles, Fairwear Manufacture, Agadir*
