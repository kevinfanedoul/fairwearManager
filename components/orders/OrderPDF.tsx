import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { formatCurrency, type OrderCurrency } from '@/lib/currencies'
import { getVATRateForCurrency } from '@/lib/calculations/invoice'

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
  titleLine: {
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
  infoLine: {
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
  bodyLine: {
    fontSize: 9.7,
    lineHeight: 1.55,
    marginBottom: 1,
  },
  validityBox: {
    minHeight: 120,
    justifyContent: 'space-between',
  },
  validityHint: {
    backgroundColor: accent,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  validityHintText: {
    textAlign: 'center',
    fontSize: 9.2,
    fontFamily: 'Helvetica-Bold',
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
  highlightText: {
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
  notes: {
    marginBottom: 12,
    fontSize: 9.5,
    color: muted,
    lineHeight: 1.45,
  },
})

type OrderPDFItem = {
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

type OrderPDFProps = {
  order: {
    reference: string
    type: 'PRODUCT' | 'STUDY'
    orderDate: string
    deadline?: string | null
    notes?: string | null
    totalHT: number
    totalTTC: number
    currency: OrderCurrency
    client: {
      company?: string | null
      firstName?: string | null
      lastName?: string | null
      address?: string | null
      city?: string | null
      ice?: string | null
    }
    items: OrderPDFItem[]
  }
}

function formatClientName(order: OrderPDFProps['order']) {
  return order.client.company ||
    [order.client.firstName, order.client.lastName].filter(Boolean).join(' ') ||
    'CLIENT'
}

function formatClientAddress(order: OrderPDFProps['order']) {
  return [order.client.address, order.client.city].filter(Boolean).join(' - ') || 'ADRESSE NON RENSEIGNÉE'
}

function sizes(item: OrderPDFItem) {
  const values = [
    item.sizeS ? `S:${item.sizeS}` : null,
    item.sizeM ? `M:${item.sizeM}` : null,
    item.sizeL ? `L:${item.sizeL}` : null,
    item.sizeXL ? `XL:${item.sizeXL}` : null,
    item.sizeTU ? `TU:${item.sizeTU}` : null,
  ].filter(Boolean)

  return values.join(' ') || '—'
}

export function OrderPDF({ order }: OrderPDFProps) {
  const clientName = formatClientName(order)
  const clientAddress = formatClientAddress(order)
  const vatRate = getVATRateForCurrency(order.currency)

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
            {order.client.ice ? `\nICE : ${order.client.ice}` : ''}
          </Text>
        </View>

        <Text style={styles.titleLine}>
          DEVIS N° {order.reference} Le {format(new Date(order.orderDate), 'dd/MM/yyyy', { locale: fr })}
        </Text>

        <View style={styles.table}>
          {order.type === 'STUDY' ? (
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

              {order.items.map((item, index) => (
                <View
                  key={`${item.designation}-${index}`}
                  style={index === order.items.length - 1 ? [styles.row, styles.rowLast] : styles.row}
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
                        <Text style={styles.textRight}>{formatCurrency(item.flatPrice ?? 0, order.currency)}</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={[styles.cellBase, { width: '14%' }]}>
                        <Text style={styles.textRight}>{formatCurrency(item.patronage ?? 0, order.currency)}</Text>
                      </View>
                      <View style={[styles.cellBase, { width: '14%' }]}>
                        <Text style={styles.textRight}>{formatCurrency(item.proto ?? 0, order.currency)}</Text>
                      </View>
                      <View style={[styles.cellBase, { width: '16%' }]}>
                        <Text style={styles.textCenter}>{item.gradationSizes ?? 0} × {formatCurrency(item.gradationUnitPrice ?? 0, order.currency)}</Text>
                      </View>
                      <View style={[styles.cellBase, { width: '14%' }]}>
                        <Text style={styles.textRight}>{formatCurrency(item.gradationTotal ?? 0, order.currency)}</Text>
                      </View>
                      <View style={[styles.cellBase, styles.cellLast, { width: '12%' }]}>
                        <Text style={styles.textRight}>{formatCurrency(item.totalPrice, order.currency)}</Text>
                      </View>
                    </>
                  )}
                </View>
              ))}

              <View style={styles.totalRow}>
                <View style={[styles.cellBase, { width: '74%' }]}>
                  <Text style={styles.totalLabel}>Total HT</Text>
                </View>
                <View style={[styles.cellBase, { width: '14%' }]}>
                  <Text style={styles.textRight}>TVA {Math.round(vatRate * 100)}%</Text>
                </View>
                <View style={[styles.cellBase, styles.cellLast, { width: '12%' }]}>
                  <Text style={styles.totalValue}>{formatCurrency(order.totalHT, order.currency)}</Text>
                </View>
              </View>

              <View style={styles.totalRow}>
                <View style={[styles.cellBase, { width: '88%' }]}>
                  <Text style={styles.totalLabel}>Total TTC</Text>
                </View>
                <View style={[styles.cellBase, styles.cellLast, { width: '12%' }]}>
                  <Text style={styles.totalValue}>{formatCurrency(order.totalTTC, order.currency)}</Text>
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

              {order.items.map((item, index) => (
                <View
                  key={`${item.designation}-${index}`}
                  style={index === order.items.length - 1 ? [styles.row, styles.rowLast] : styles.row}
                >
                  <View style={[styles.cellBase, { width: '30%' }]}>
                    <Text style={styles.textLeft}>{item.designation}</Text>
                  </View>
                  <View style={[styles.cellBase, { width: '20%' }]}>
                    <Text style={styles.textCenter}>{sizes(item)}</Text>
                  </View>
                  <View style={[styles.cellBase, { width: '10%' }]}>
                    <Text style={styles.textCenter}>{item.quantity}</Text>
                  </View>
                  <View style={[styles.cellBase, { width: '18%' }]}>
                    <Text style={styles.textRight}>{formatCurrency(item.unitPrice, order.currency)}</Text>
                  </View>
                  <View style={[styles.cellBase, styles.cellLast, { width: '22%' }]}>
                    <Text style={styles.textRight}>{formatCurrency(item.totalPrice, order.currency)}</Text>
                  </View>
                </View>
              ))}

              <View style={styles.totalRow}>
                <View style={[styles.cellBase, { width: '60%' }]}>
                  <Text style={styles.totalLabel}>Total HT</Text>
                </View>
                <View style={[styles.cellBase, { width: '18%' }]}>
                  <Text style={styles.textRight}>TVA {Math.round(vatRate * 100)}%</Text>
                </View>
                <View style={[styles.cellBase, styles.cellLast, { width: '22%' }]}>
                  <Text style={styles.totalValue}>{formatCurrency(order.totalHT, order.currency)}</Text>
                </View>
              </View>

              <View style={styles.totalRow}>
                <View style={[styles.cellBase, { width: '78%' }]}>
                  <Text style={styles.totalLabel}>Total TTC</Text>
                </View>
                <View style={[styles.cellBase, styles.cellLast, { width: '22%' }]}>
                  <Text style={styles.totalValue}>{formatCurrency(order.totalTTC, order.currency)}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        <Text style={styles.infoLine}>
          {order.deadline
            ? `Livraison souhaitée : ${format(new Date(order.deadline), 'dd/MM/yyyy', { locale: fr })}`
            : 'Devis valable sous réserve de confirmation'}
        </Text>

        <View style={styles.lowerBlocks}>
          <View style={styles.lowerColLeft}>
            <View style={styles.sectionBand}>
              <Text style={styles.sectionBandText}>Conditions et règlement :</Text>
            </View>
            <Text style={styles.bodyLine}>Devis établi par FAIRWEAR MANUFACTURE.</Text>
            <Text style={styles.bodyLine}>Validation par retour signé ou confirmation écrite.</Text>
            <Text style={styles.bodyLine}>Règlement selon conditions convenues entre les parties.</Text>
            <Text style={styles.bodyLine}>Production lancée après validation définitive du devis.</Text>
            <Text style={styles.bodyLine}>Les prix sont exprimés en {order.currency}.</Text>
          </View>

          <View style={styles.lowerColRight}>
            <View style={styles.validityBox}>
              <View style={styles.validityHint}>
                <Text style={styles.validityHintText}>Bon pour accord et validation client</Text>
              </View>
              <View style={{ alignItems: 'center', marginTop: 18 }}>
                <View style={styles.stampCircle}>
                  <Text style={styles.stampInner}>FAIRWEAR{'\n'}MANUFACTURE</Text>
                </View>
                <Text style={styles.highlightText}>
                  Devis édité le{'\n'}
                  {format(new Date(order.orderDate), 'dd/MM/yyyy', { locale: fr })}{'\n'}
                  {formatCurrency(order.totalTTC, order.currency)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {order.notes && (
          <Text style={styles.notes}>{order.notes}</Text>
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
