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
  brandWrap: { alignItems: 'center', marginBottom: 12 },
  brandTitle: { fontSize: 48, fontFamily: 'Helvetica-Bold', letterSpacing: 1.2 },
  brandSubtitle: { marginTop: -4, fontSize: 21, letterSpacing: 7 },
  orangeBand: { backgroundColor: accent, paddingVertical: 7, paddingHorizontal: 14, textAlign: 'center', marginBottom: 16 },
  orangeBandText: { textAlign: 'center', fontSize: 10.5, fontFamily: 'Helvetica-Bold', lineHeight: 1.45 },
  titleLine: { textAlign: 'center', fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 16 },
  table: { borderWidth: 1, borderColor: line, marginBottom: 10 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: line, backgroundColor: '#fbfbfb' },
  cellBase: { borderRightWidth: 1, borderRightColor: line, paddingVertical: 6, paddingHorizontal: 5, justifyContent: 'center' },
  cellLast: { borderRightWidth: 0 },
  headText: { fontSize: 9.2, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: line, minHeight: 28 },
  rowLast: { borderBottomWidth: 0 },
  textLeft: { fontSize: 9.8, textAlign: 'left' },
  textCenter: { fontSize: 9.8, textAlign: 'center' },
  textRight: { fontSize: 9.8, textAlign: 'right' },
  totalRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: line },
  totalLabel: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  totalValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  infoLine: { textAlign: 'center', fontSize: 10.2, marginTop: 8, marginBottom: 18 },
  lowerBlocks: { flexDirection: 'row', justifyContent: 'space-between', gap: 18, marginBottom: 18 },
  lowerColLeft: { flex: 1.55 },
  lowerColRight: { flex: 1 },
  sectionBand: { backgroundColor: accent, paddingVertical: 4, paddingHorizontal: 8, marginBottom: 7 },
  sectionBandText: { fontSize: 9.5, fontFamily: 'Helvetica-Bold' },
  bodyLine: { fontSize: 9.7, lineHeight: 1.55, marginBottom: 1 },
  statusBox: { minHeight: 120, justifyContent: 'space-between' },
  statusHint: { backgroundColor: accent, paddingVertical: 4, paddingHorizontal: 8 },
  statusHintText: { textAlign: 'center', fontSize: 9.2, fontFamily: 'Helvetica-Bold' },
  stampCircle: { width: 78, height: 78, borderRadius: 39, borderWidth: 1.5, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  stampInner: { textAlign: 'center', fontSize: 9, fontFamily: 'Helvetica-Bold', lineHeight: 1.3 },
  highlightText: { color: '#c65a5a', fontSize: 10.5, fontFamily: 'Helvetica-Bold', textAlign: 'center', lineHeight: 1.5 },
  footerBand: { backgroundColor: accent, height: 16, marginBottom: 10 },
  footerText: { textAlign: 'center', fontSize: 9.5, lineHeight: 1.55, fontFamily: 'Helvetica-Bold' },
  notes: { marginBottom: 12, fontSize: 9.5, color: muted, lineHeight: 1.45 },
})

type CreditNotePDFItem = {
  designation: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

type CreditNotePDFProps = {
  creditNote: {
    number: string
    issueDate: string
    reason: string
    notes?: string | null
    totalHT: number
    tvaRate: number
    tvaAmount: number
    stampDuty: number
    totalTTC: number
    currency: OrderCurrency
    invoiceNumber: string
    client: {
      company?: string | null
      firstName?: string | null
      lastName?: string | null
      address?: string | null
      city?: string | null
      ice?: string | null
    }
    items: CreditNotePDFItem[]
  }
}

function formatClientName(creditNote: CreditNotePDFProps['creditNote']) {
  return creditNote.client.company ||
    [creditNote.client.firstName, creditNote.client.lastName].filter(Boolean).join(' ') ||
    'CLIENT'
}

function formatClientAddress(creditNote: CreditNotePDFProps['creditNote']) {
  return [creditNote.client.address, creditNote.client.city].filter(Boolean).join(' - ') || 'ADRESSE NON RENSEIGNÉE'
}

export function CreditNotePDF({ creditNote }: CreditNotePDFProps) {
  const clientName = formatClientName(creditNote)
  const clientAddress = formatClientAddress(creditNote)

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
            {creditNote.client.ice ? `\nICE : ${creditNote.client.ice}` : ''}
          </Text>
        </View>

        <Text style={styles.titleLine}>
          AVOIR N° {creditNote.number} Le {format(new Date(creditNote.issueDate), 'dd/MM/yyyy', { locale: fr })}
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={[styles.cellBase, { width: '44%' }]}>
              <Text style={styles.headText}>Désignation</Text>
            </View>
            <View style={[styles.cellBase, { width: '12%' }]}>
              <Text style={styles.headText}>Qté</Text>
            </View>
            <View style={[styles.cellBase, { width: '20%' }]}>
              <Text style={styles.headText}>Prix unit.</Text>
            </View>
            <View style={[styles.cellBase, styles.cellLast, { width: '24%' }]}>
              <Text style={styles.headText}>Total</Text>
            </View>
          </View>

          {creditNote.items.map((item, index) => (
            <View key={`${item.designation}-${index}`} style={index === creditNote.items.length - 1 ? [styles.row, styles.rowLast] : styles.row}>
              <View style={[styles.cellBase, { width: '44%' }]}>
                <Text style={styles.textLeft}>{item.designation}</Text>
              </View>
              <View style={[styles.cellBase, { width: '12%' }]}>
                <Text style={styles.textCenter}>{item.quantity}</Text>
              </View>
              <View style={[styles.cellBase, { width: '20%' }]}>
                <Text style={styles.textRight}>{formatCurrency(item.unitPrice, creditNote.currency)}</Text>
              </View>
              <View style={[styles.cellBase, styles.cellLast, { width: '24%' }]}>
                <Text style={styles.textRight}>{formatCurrency(item.totalPrice, creditNote.currency)}</Text>
              </View>
            </View>
          ))}

          <View style={styles.totalRow}>
            <View style={[styles.cellBase, { width: '56%' }]}>
              <Text style={styles.totalLabel}>Total HT</Text>
            </View>
            <View style={[styles.cellBase, { width: '20%' }]}>
              <Text style={styles.textRight}>TVA {Math.round(creditNote.tvaRate * 100)}%</Text>
            </View>
            <View style={[styles.cellBase, styles.cellLast, { width: '24%' }]}>
              <Text style={styles.totalValue}>{formatCurrency(creditNote.totalHT, creditNote.currency)}</Text>
            </View>
          </View>

          <View style={styles.totalRow}>
            <View style={[styles.cellBase, { width: '76%' }]}>
              <Text style={styles.totalLabel}>
                Total TTC
                {creditNote.stampDuty > 0 ? ` (timbre ${formatCurrency(creditNote.stampDuty, creditNote.currency)} inclus)` : ''}
              </Text>
            </View>
            <View style={[styles.cellBase, styles.cellLast, { width: '24%' }]}>
              <Text style={styles.totalValue}>{formatCurrency(creditNote.totalTTC, creditNote.currency)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.infoLine}>
          Motif : {creditNote.reason} · Référence facture : {creditNote.invoiceNumber}
        </Text>

        <View style={styles.lowerBlocks}>
          <View style={styles.lowerColLeft}>
            <View style={styles.sectionBand}>
              <Text style={styles.sectionBandText}>Référence d’avoir :</Text>
            </View>
            <Text style={styles.bodyLine}>Document émis par FAIRWEAR MANUFACTURE.</Text>
            <Text style={styles.bodyLine}>Cet avoir est rattaché à la facture {creditNote.invoiceNumber}.</Text>
            <Text style={styles.bodyLine}>Il vient en déduction des montants dus par le client.</Text>
            <Text style={styles.bodyLine}>Montants exprimés en {creditNote.currency}.</Text>
          </View>

          <View style={styles.lowerColRight}>
            <View style={styles.statusBox}>
              <View style={styles.statusHint}>
                <Text style={styles.statusHintText}>Document d’avoir client</Text>
              </View>
              <View style={{ alignItems: 'center', marginTop: 18 }}>
                <View style={styles.stampCircle}>
                  <Text style={styles.stampInner}>FAIRWEAR{'\n'}MANUFACTURE</Text>
                </View>
                <Text style={styles.highlightText}>
                  Avoir édité le{'\n'}
                  {format(new Date(creditNote.issueDate), 'dd/MM/yyyy', { locale: fr })}{'\n'}
                  {formatCurrency(creditNote.totalTTC, creditNote.currency)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {creditNote.notes && (
          <Text style={styles.notes}>{creditNote.notes}</Text>
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
