// NOTE: These types require `prisma generate` to be run first.
// Run: node_modules/.bin/prisma generate (with DATABASE_URL set in .env.local)
import type {
  UserRole,
  ClientType,
  OrderStatus,
  InvoiceStatus,
  PaymentMethod,
  CashEntryType,
  TodoStatus,
} from '@prisma/client'

export type { UserRole, ClientType, OrderStatus, InvoiceStatus, PaymentMethod, CashEntryType, TodoStatus }

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  QUOTE: 'Devis',
  CONFIRMED: 'Confirmée',
  SOURCING: 'Sourcing',
  STUDY: "Bureau d'étude",
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
