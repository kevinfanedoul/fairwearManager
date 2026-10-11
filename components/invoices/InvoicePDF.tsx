import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { formatCurrency, type OrderCurrency } from '@/lib/currencies'

const accent = '#f4a46f'
const dark = '#111827'
const muted = '#5b6472'
const line = '#1f2937'

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingHorizontal: 34,
    paddingBottom: 26,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: dark,
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 48,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.2,
  },
  brandSubtitle: {
    marginTop: -4,
    fontSize: 21,
    letterSpacing: 7,
  },
  orangeBand: {
    backgroundColor: accent,
    paddingVertical: 7,
    paddingHorizontal: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  orangeBandText: {
    textAlign: 'center',
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.45,
  },
  invoiceLine: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 16,
  },
  table: {
    borderWidth: 1,
    borderColor: line,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: line,
    backgroundColor: '#fbfbfb',
  },
  cellBase: {
    borderRightWidth: 1,
    borderRightColor: line,
    paddingVertical: 6,
    paddingHorizontal: 5,
    justifyContent: 'center',
  },
  cellLast: {
    borderRightWidth: 0,
  },
  headText: {
    fontSize: 9.2,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: line,
    minHeight: 28,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  textLeft: {
    fontSize: 9.8,
    textAlign: 'left',
  },
  textCenter: {
    fontSize: 9.8,
    textAlign: 'center',
  },
  textRight: {
    fontSize: 9.8,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: line,
  },
  totalLabel: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  totalValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  amountWords: {
    textAlign: 'center',
    fontSize: 10.2,
    marginTop: 8,
    marginBottom: 18,
  },
  lowerBlocks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 18,
    marginBottom: 18,
  },
  lowerColLeft: {
    flex: 1.55,
  },
  lowerColRight: {
    flex: 1,
  },
  sectionBand: {
    backgroundColor: accent,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 7,
  },
  sectionBandText: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
  },
  bankLine: {
    fontSize: 9.7,
    lineHeight: 1.55,
    marginBottom: 1,
  },
  paymentBox: {
    minHeight: 120,
    justifyContent: 'space-between',
  },
  paymentHint: {
    backgroundColor: accent,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  paymentHintText: {
    textAlign: 'center',
    fontSize: 9.2,
    fontFamily: 'Helvetica-Bold',
  },
  paymentStatus: {
    alignItems: 'center',
    marginTop: 18,
  },
  stampCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  stampInner: {
    textAlign: 'center',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.3,
  },
  paidText: {
    color: '#c65a5a',
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    lineHeight: 1.5,
  },
  footerBand: {
    backgroundColor: accent,
    height: 16,
    marginBottom: 10,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 9.5,
    lineHeight: 1.55,
    fontFamily: 'Helvetica-Bold',
  },
})

interface InvoiceItem {
  designation: string
  sizeS: number
  sizeM: number
  sizeL: number
  sizeXL: number
  sizeTU: number
  quantity: number
  unitPrice: number
  totalPrice: number
  patronage: number | null
  proto: number | null
  gradationSizes: number | null
  gradationUnitPrice: number | null
  gradationTotal: number | null
  kind: 'BREAKDOWN' | 'FLAT'
  flatPrice: number | null
}

interface InvoicePDFProps {
  invoice: {
    number: string
    issueDate: string
    dueDate?: string | null
    totalHT: number
    tvaRate: number
    tvaAmount: number
    stampDuty: number
    totalTTC: number
    notes?: string | null
    currency: OrderCurrency
    client: {
      company?: string | null
      firstName?: string | null
      lastName?: string | null
      address?: string | null
      city?: string | null
      ice?: string | null
    }
    order?: {
      type: 'PRODUCT' | 'STUDY'
      currency: OrderCurrency
      items: InvoiceItem[]
    } | null
  }
}

function formatClientName(invoice: InvoicePDFProps['invoice']) {
  return invoice.client.company ||
    [invoice.client.firstName, invoice.client.lastName].filter(Boolean).join(' ') ||
    'CLIENT'
}

function formatClientAddress(invoice: InvoicePDFProps['invoice']) {
  return [invoice.client.address, invoice.client.city].filter(Boolean).join(' - ') || 'ADRESSE NON RENSEIGNÉE'
}

function formatAmountForWords(amount: number, currency: OrderCurrency) {
  const label = currency === 'MAD' ? 'Dirhams' : currency === 'EUR' ? 'Euros' : currency
  return `${formatCurrency(amount, currency)} (${label})`
}

function quantityLabel(item: InvoiceItem) {
  return String(item.quantity || 0)
}

function sizes(item: InvoiceItem) {
  const values = [
    item.sizeS ? `S:${item.sizeS}` : null,
    item.sizeM ? `M:${item.sizeM}` : null,
    item.sizeL ? `L:${item.sizeL}` : null,
    item.sizeXL ? `XL:${item.sizeXL}` : null,
    item.sizeTU ? `TU:${item.sizeTU}` : null,
  ].filter(Boolean)

  return values.join(' ') || '—'
}

export function InvoicePDF({ invoice }: InvoicePDFProps) {
  const clientName = formatClientName(invoice)
  const clientAddress = formatClientAddress(invoice)
  const currency = invoice.order?.currency ?? invoice.currency
  const items = invoice.order?.items ?? []

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.brandWrap}>
          <Text style={styles.brandTitle}>FAIRWEAR</Text>
          <Text style={styles.brandSubtitle}>MANUFACTURE</Text>
        </View>

        <View style={styles.orangeBand}>
          <Text style={styles.orangeBandText}>
            CLIENT : {clientName.toUpperCase()}{'\n'}
            {clientAddress.toUpperCase()}
            {invoice.client.ice ? `\nICE : ${invoice.client.ice}` : ''}
          </Text>
        </View>

        <Text style={styles.invoiceLine}>
          FACTURE N° {invoice.number} Le {format(new Date(invoice.issueDate), 'dd/MM/yyyy', { locale: fr })}
        </Text>

        <View style={styles.table}>
          {invoice.order?.type === 'STUDY' ? (
            <>
              <View style={styles.tableHeader}>
                <View style={[styles.cellBase, { width: '30%' }]}>
                  <Text style={styles.headText}>Désignation</Text>
                </View>
                <View style={[styles.cellBase, { width: '14%' }]}>
                  <Text style={styles.headText}>Patronage</Text>
                </View>
                <View style={[styles.cellBase, { width: '14%' }]}>
                  <Text style={styles.headText}>Prototype</Text>
                </View>
                <View style={[styles.cellBase, { width: '16%' }]}>
                  <Text style={styles.headText}>Gradation</Text>
                </View>
                <View style={[styles.cellBase, { width: '14%' }]}>
                  <Text style={styles.headText}>Total grad.</Text>
                </View>
                <View style={[styles.cellBase, styles.cellLast, { width: '12%' }]}>
                  <Text style={styles.headText}>Total</Text>
                </View>
              </View>

              {items.map((item, index) => (
                <View
                  key={`${item.designation}-${index}`}
                  style={index === items.length - 1 ? [styles.row, styles.rowLast] : styles.row}
                >
                  <View style={[styles.cellBase, { width: '30%' }]}>
                    <Text style={styles.textLeft}>{item.designation}</Text>
                  </View>
                  {item.kind === 'FLAT' ? (
                    <>
                      <View style={[styles.cellBase, { width: '58%' }]}>
                        <Text style={styles.textRight}>Tarif unique</Text>
                      </View>
                      <View style={[styles.cellBase, styles.cellLast, { width: '12%' }]}>
                        <Text style={styles.textRight}>{formatCurrency(item.flatPrice ?? 0, currency)}</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={[styles.cellBase, { width: '14%' }]}>
                        <Text style={styles.textRight}>{formatCurrency(item.patronage ?? 0, currency)}</Text>
                      </View>
                      <View style={[styles.cellBase, { width: '14%' }]}>
                        <Text style={styles.textRight}>{formatCurrency(item.proto ?? 0, currency)}</Text>
                      </View>
                      <View style={[styles.cellBase, { width: '16%' }]}>
                        <Text style={styles.textCenter}>{item.gradationSizes ?? 0} × {formatCurrency(item.gradationUnitPrice ?? 0, currency)}</Text>
                      </View>
                      <View style={[styles.cellBase, { width: '14%' }]}>
                        <Text style={styles.textRight}>{formatCurrency(item.gradationTotal ?? 0, currency)}</Text>
                      </View>
                      <View style={[styles.cellBase, styles.cellLast, { width: '12%' }]}>
                        <Text style={styles.textRight}>{formatCurrency(item.totalPrice, currency)}</Text>
                      </View>
                    </>
                  )}
                </View>
              ))}

              <View style={styles.totalRow}>
                <View style={[styles.cellBase, { width: '88%' }]}>
                  <Text style={styles.totalLabel}>Total HT</Text>
                </View>
                <View style={[styles.cellBase, styles.cellLast, { width: '12%' }]}>
                  <Text style={styles.totalValue}>{formatCurrency(invoice.totalHT, currency)}</Text>
                </View>
              </View>

              {invoice.tvaRate > 0 && (
                <View style={styles.totalRow}>
                  <View style={[styles.cellBase, { width: '88%' }]}>
                    <Text style={styles.totalLabel}>TVA {Math.round(invoice.tvaRate * 100)}%</Text>
                  </View>
                  <View style={[styles.cellBase, styles.cellLast, { width: '12%' }]}>
                    <Text style={styles.totalValue}>{formatCurrency(invoice.tvaAmount, currency)}</Text>
                  </View>
                </View>
              )}

              <View style={styles.totalRow}>
                <View style={[styles.cellBase, { width: '88%' }]}>
                  <Text style={styles.totalLabel}>
                    Total TTC
                    {invoice.stampDuty > 0 ? ` (timbre ${formatCurrency(invoice.stampDuty, currency)} inclus)` : ''}
                  </Text>
                </View>
                <View style={[styles.cellBase, styles.cellLast, { width: '12%' }]}>
                  <Text style={styles.totalValue}>{formatCurrency(invoice.totalTTC, currency)}</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.tableHeader}>
                <View style={[styles.cellBase, { width: '30%' }]}>
                  <Text style={styles.headText}>Désignation</Text>
                </View>
                <View style={[styles.cellBase, { width: '20%' }]}>
                  <Text style={styles.headText}>Tailles</Text>
                </View>
                <View style={[styles.cellBase, { width: '10%' }]}>
                  <Text style={styles.headText}>Qté</Text>
                </View>
                <View style={[styles.cellBase, { width: '18%' }]}>
                  <Text style={styles.headText}>Prix unit.</Text>
                </View>
                <View style={[styles.cellBase, styles.cellLast, { width: '22%' }]}>
                  <Text style={styles.headText}>Total</Text>
                </View>
              </View>

              {items.map((item, index) => (
                <View
                  key={`${item.designation}-${index}`}
                  style={index === items.length - 1 ? [styles.row, styles.rowLast] : styles.row}
                >
                  <View style={[styles.cellBase, { width: '30%' }]}>
                    <Text style={styles.textLeft}>{item.designation}</Text>
                  </View>
                  <View style={[styles.cellBase, { width: '20%' }]}>
                    <Text style={styles.textCenter}>{sizes(item)}</Text>
                  </View>
                  <View style={[styles.cellBase, { width: '10%' }]}>
                    <Text style={styles.textCenter}>{quantityLabel(item)}</Text>
                  </View>
                  <View style={[styles.cellBase, { width: '18%' }]}>
                    <Text style={styles.textRight}>{formatCurrency(item.unitPrice, currency)}</Text>
                  </View>
                  <View style={[styles.cellBase, styles.cellLast, { width: '22%' }]}>
                    <Text style={styles.textRight}>{formatCurrency(item.totalPrice, currency)}</Text>
                  </View>
                </View>
              ))}

              <View style={styles.totalRow}>
                <View style={[styles.cellBase, { width: '78%' }]}>
                  <Text style={styles.totalLabel}>Total HT</Text>
                </View>
                <View style={[styles.cellBase, styles.cellLast, { width: '22%' }]}>
                  <Text style={styles.totalValue}>{formatCurrency(invoice.totalHT, currency)}</Text>
                </View>
              </View>

              {invoice.tvaRate > 0 && (
                <View style={styles.totalRow}>
                  <View style={[styles.cellBase, { width: '78%' }]}>
                    <Text style={styles.totalLabel}>TVA {Math.round(invoice.tvaRate * 100)}%</Text>
                  </View>
                  <View style={[styles.cellBase, styles.cellLast, { width: '22%' }]}>
                    <Text style={styles.totalValue}>{formatCurrency(invoice.tvaAmount, currency)}</Text>
                  </View>
                </View>
              )}

              <View style={styles.totalRow}>
                <View style={[styles.cellBase, { width: '78%' }]}>
                  <Text style={styles.totalLabel}>
                    Total TTC
                    {invoice.stampDuty > 0 ? ` (timbre ${formatCurrency(invoice.stampDuty, currency)} inclus)` : ''}
                  </Text>
                </View>
                <View style={[styles.cellBase, styles.cellLast, { width: '22%' }]}>
                  <Text style={styles.totalValue}>{formatCurrency(invoice.totalTTC, currency)}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        <Text style={styles.amountWords}>
          Arrêtée la présente facture à la somme de : {formatAmountForWords(invoice.totalTTC, currency)}
        </Text>

        <View style={styles.lowerBlocks}>
          <View style={styles.lowerColLeft}>
            <View style={styles.sectionBand}>
              <Text style={styles.sectionBandText}>Modalités de paiement :</Text>
            </View>
            <Text style={styles.bankLine}>Par virement bancaire à : FAIRWEAR MANUFACTURE</Text>
            <Text style={styles.bankLine}>Domiciliation : BANK OF AFRICA - 16 Rue Farhat Hachad</Text>
            <Text style={styles.bankLine}>Agence : Cité Dakhla - AGADIR</Text>
            <Text style={styles.bankLine}>Compte IBAN : MA64 0110 1000 0015 2100 0045 9751</Text>
            <Text style={styles.bankLine}>BIC : BMCEMAMC</Text>
            {invoice.dueDate && (
              <Text style={[styles.bankLine, { marginTop: 5 }]}>
                Échéance de règlement : {format(new Date(invoice.dueDate), 'dd/MM/yyyy', { locale: fr })}
              </Text>
            )}
          </View>

          <View style={styles.lowerColRight}>
            <View style={styles.paymentBox}>
              <View style={styles.paymentHint}>
                <Text style={styles.paymentHintText}>En votre aimable règlement à réception</Text>
              </View>
              <View style={styles.paymentStatus}>
                <View style={styles.stampCircle}>
                  <Text style={styles.stampInner}>FAIRWEAR{'\n'}MANUFACTURE</Text>
                </View>
                <Text style={styles.paidText}>
                  Facture éditée le{'\n'}
                  {format(new Date(invoice.issueDate), 'dd/MM/yyyy', { locale: fr })}{'\n'}
                  {formatCurrency(invoice.totalTTC, currency)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {invoice.notes && (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 9.5, color: muted, lineHeight: 1.45 }}>{invoice.notes}</Text>
          </View>
        )}

        <View style={styles.footerBand} />
        <Text style={styles.footerText}>
          Patente : 45310826 - I.F : 53995462 - ICE : 003359806000026 - RC : 141071{'\n'}
          Siège/Atelier : Rue 325 Magasin n° 23 - Cité Riad Salam - 80000 AGADIR{'\n'}
          Tél : +212 7.80.41.95.46  Tél Fixe : 05.29.48.46.94{'\n'}
          Tél : +33 6.24.98.45.80  Mail : contact@fairwearmanufacture.com
        </Text>
      </Page>
    </Document>
  )
}
