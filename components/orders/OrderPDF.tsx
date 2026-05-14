import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1e293b' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  companyName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  companyInfo: { fontSize: 9, color: '#64748b', marginTop: 4, lineHeight: 1.5 },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  reference: { fontSize: 11, color: '#64748b', textAlign: 'right', marginTop: 4 },
  date: { fontSize: 9, color: '#64748b', textAlign: 'right', marginTop: 2 },
  clientSection: { marginBottom: 24, padding: 12, backgroundColor: '#f8fafc' },
  clientLabel: { fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  clientName: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  clientInfo: { fontSize: 9, color: '#475569', marginTop: 2, lineHeight: 1.5 },
  table: { marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#0f172a', padding: '6 8', borderRadius: 2 },
  tableHeaderText: { color: '#ffffff', fontSize: 9, fontFamily: 'Helvetica-Bold' },
  tableRow: { flexDirection: 'row', padding: '6 8', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tableRowAlt: { flexDirection: 'row', padding: '6 8', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  colDesignation: { flex: 4 },
  colSizes: { flex: 2, textAlign: 'center' },
  colQty: { flex: 1, textAlign: 'center' },
  colPrice: { flex: 2, textAlign: 'right' },
  colTotal: { flex: 2, textAlign: 'right' },
  totalsSection: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  totalsBox: { width: 200 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalsLabel: { color: '#64748b', fontSize: 9 },
  totalsValue: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  totalsTTCRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 1.5, borderTopColor: '#0f172a', marginTop: 4 },
  totalsTTCLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  totalsTTCValue: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  notesSection: { marginTop: 16 },
  notesLabel: { fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  notesText: { fontSize: 9, color: '#475569', lineHeight: 1.5 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#94a3b8' },
})

function formatMAD(amount: number) {
  return `${new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)} MAD`
}

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
}

type OrderPDFProps = {
  order: {
    reference: string
    orderDate: string
    deadline?: string | null
    notes?: string | null
    totalHT: number
    totalTTC: number
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

function sizes(item: OrderPDFItem): string {
  const parts: string[] = []
  if (item.sizeS) parts.push(`S:${item.sizeS}`)
  if (item.sizeM) parts.push(`M:${item.sizeM}`)
  if (item.sizeL) parts.push(`L:${item.sizeL}`)
  if (item.sizeXL) parts.push(`XL:${item.sizeXL}`)
  if (item.sizeTU) parts.push(`TU:${item.sizeTU}`)
  return parts.join(' ') || '—'
}

export function OrderPDF({ order }: OrderPDFProps) {
  const clientName = order.client.company || [order.client.firstName, order.client.lastName].filter(Boolean).join(' ')
  const tvaAmount = Math.max(0, order.totalTTC - order.totalHT)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>FAIRWEAR MANUFACTURE</Text>
            <Text style={styles.companyInfo}>
              Atelier de confection{'\n'}
              Agadir, Maroc{'\n'}
              contact@fairwear.ma
            </Text>
          </View>
          <View>
            <Text style={styles.title}>DEVIS</Text>
            <Text style={styles.reference}>{order.reference}</Text>
            <Text style={styles.date}>
              Émis le {format(new Date(order.orderDate), 'dd/MM/yyyy', { locale: fr })}
            </Text>
            {order.deadline && (
              <Text style={styles.date}>
                Livraison souhaitée : {format(new Date(order.deadline), 'dd/MM/yyyy', { locale: fr })}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.clientSection}>
          <Text style={styles.clientLabel}>Client</Text>
          <Text style={styles.clientName}>{clientName || 'Client sans nom'}</Text>
          <Text style={styles.clientInfo}>
            {[order.client.address, order.client.city].filter(Boolean).join(', ')}
            {order.client.ice ? `\nICE : ${order.client.ice}` : ''}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDesignation]}>Désignation</Text>
            <Text style={[styles.tableHeaderText, styles.colSizes]}>Tailles</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Qté</Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>Prix unit.</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>Total HT</Text>
          </View>
          {order.items.map((item, index) => (
            <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={styles.colDesignation}>{item.designation}</Text>
              <Text style={[styles.colSizes, { fontSize: 8 }]}>{sizes(item)}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatMAD(item.unitPrice)}</Text>
              <Text style={styles.colTotal}>{formatMAD(item.totalPrice)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Total HT</Text>
              <Text style={styles.totalsValue}>{formatMAD(order.totalHT)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>TVA 20%</Text>
              <Text style={styles.totalsValue}>{formatMAD(tvaAmount)}</Text>
            </View>
            <View style={styles.totalsTTCRow}>
              <Text style={styles.totalsTTCLabel}>Total TTC</Text>
              <Text style={styles.totalsTTCValue}>{formatMAD(order.totalTTC)}</Text>
            </View>
          </View>
        </View>

        {order.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Fairwear Manufacture — Agadir, Maroc — Devis valable sous réserve de confirmation
        </Text>
      </Page>
    </Document>
  )
}
