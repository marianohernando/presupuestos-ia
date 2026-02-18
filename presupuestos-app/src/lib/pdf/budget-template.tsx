import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

// Usar Helvetica (fuente por defecto de react-pdf)

// Colores del sistema
const colors = {
  primary: '#2563eb',
  secondary: '#64748b',
  success: '#22c55e',
  warning: '#f59e0b',
  text: '#1e293b',
  textMuted: '#64748b',
  border: '#e2e8f0',
  background: '#f8fafc',
  white: '#ffffff',
};

// Estilos
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: colors.text,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  logo: {
    fontSize: 24,
    fontWeight: 700,
    color: colors.primary,
  },
  headerInfo: {
    textAlign: 'right',
  },
  headerLabel: {
    fontSize: 8,
    color: colors.textMuted,
    marginBottom: 2,
  },
  headerValue: {
    fontSize: 10,
    fontWeight: 600,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  clientInfo: {
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 4,
  },
  clientName: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 5,
  },
  clientDetail: {
    fontSize: 9,
    color: colors.textMuted,
    marginBottom: 2,
  },
  summaryBox: {
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 4,
    marginBottom: 15,
  },
  summaryText: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 4,
  },
  tableHeaderCell: {
    color: colors.white,
    fontWeight: 600,
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRowAlt: {
    backgroundColor: colors.background,
  },
  tableCell: {
    fontSize: 9,
  },
  colName: { width: '40%' },
  colQty: { width: '10%', textAlign: 'center' },
  colPrice: { width: '20%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  colHours: { width: '10%', textAlign: 'center' },
  totalsSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalsBox: {
    width: 250,
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 600,
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: colors.primary,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: 700,
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.primary,
  },
  assumptions: {
    marginTop: 10,
  },
  assumptionItem: {
    fontSize: 9,
    marginBottom: 3,
    paddingLeft: 10,
  },
  bullet: {
    color: colors.primary,
  },
  maintenanceBox: {
    backgroundColor: '#f0f9ff',
    padding: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  maintenanceTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.primary,
    marginBottom: 10,
  },
  maintenanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: colors.textMuted,
  },
  validityBox: {
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 4,
    marginTop: 20,
  },
  validityText: {
    fontSize: 9,
    color: '#92400e',
  },
});

// Tipos
interface BudgetItem {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  hours?: number;
  isCustom?: boolean;
}

interface BudgetPDFData {
  // Info presupuesto
  budgetNumber: string;
  version: number;
  date: string;
  validUntil: string;
  // Cliente
  clientName: string;
  clientCompany?: string;
  clientEmail?: string;
  // Contenido
  summary: string;
  scope?: string;
  items: BudgetItem[];
  // Totales
  subtotal: number;
  discount: number;
  taxes: number;
  total: number;
  // Mantenimiento
  maintenance?: {
    tokens?: number;
    hours?: number;
    monthly?: number;
  };
  // Supuestos y condiciones
  assumptions?: string[];
  risks?: string[];
  conditions?: string[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function BudgetPDF({ data }: { data: BudgetPDFData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>PresupuestosIA</Text>
          <View style={styles.headerInfo}>
            <Text style={styles.headerLabel}>Presupuesto Nº</Text>
            <Text style={styles.headerValue}>{data.budgetNumber}</Text>
            <Text style={styles.headerLabel}>Versión</Text>
            <Text style={styles.headerValue}>{data.version}</Text>
            <Text style={styles.headerLabel}>Fecha</Text>
            <Text style={styles.headerValue}>{data.date}</Text>
          </View>
        </View>

        {/* Cliente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{data.clientName}</Text>
            {data.clientCompany && (
              <Text style={styles.clientDetail}>{data.clientCompany}</Text>
            )}
            {data.clientEmail && (
              <Text style={styles.clientDetail}>{data.clientEmail}</Text>
            )}
          </View>
        </View>

        {/* Resumen */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen del proyecto</Text>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>{data.summary}</Text>
          </View>
          {data.scope && (
            <>
              <Text style={{ fontSize: 11, fontWeight: 600, marginTop: 10, marginBottom: 5 }}>
                Alcance
              </Text>
              <Text style={styles.summaryText}>{data.scope}</Text>
            </>
          )}
        </View>

        {/* Desglose */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Desglose de servicios</Text>
          <View style={styles.table}>
            {/* Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colName]}>Concepto</Text>
              <Text style={[styles.tableHeaderCell, styles.colHours]}>Horas</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>Cant.</Text>
              <Text style={[styles.tableHeaderCell, styles.colPrice]}>Precio unit.</Text>
              <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
            </View>
            {/* Rows */}
            {data.items.map((item, index) => (
              <View
                key={index}
                style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <View style={styles.colName}>
                  <Text style={[styles.tableCell, { fontWeight: 600 }]}>{item.name}</Text>
                  {item.description && (
                    <Text style={[styles.tableCell, { color: colors.textMuted, fontSize: 8, marginTop: 2 }]}>
                      {item.description}
                    </Text>
                  )}
                </View>
                <Text style={[styles.tableCell, styles.colHours]}>
                  {item.hours ? `${item.hours}h` : '-'}
                </Text>
                <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
                <Text style={[styles.tableCell, styles.colPrice]}>
                  {formatCurrency(item.unitPrice)}
                </Text>
                <Text style={[styles.tableCell, styles.colTotal, { fontWeight: 600 }]}>
                  {formatCurrency(item.unitPrice * item.quantity)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totales */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(data.subtotal)}</Text>
            </View>
            {data.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Descuento</Text>
                <Text style={[styles.totalValue, { color: colors.success }]}>
                  -{formatCurrency(data.discount)}
                </Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>IVA (21%)</Text>
              <Text style={styles.totalValue}>{formatCurrency(data.taxes)}</Text>
            </View>
            <View style={styles.grandTotal}>
              <Text style={styles.grandTotalLabel}>TOTAL</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(data.total)}</Text>
            </View>
          </View>
        </View>

        {/* Mantenimiento */}
        {data.maintenance && (
          <View style={[styles.section, { marginTop: 20 }]}>
            <Text style={styles.sectionTitle}>Plan de mantenimiento</Text>
            <View style={styles.maintenanceBox}>
              <Text style={styles.maintenanceTitle}>Incluido (mensual)</Text>
              {data.maintenance.tokens && (
                <View style={styles.maintenanceItem}>
                  <Text style={styles.tableCell}>Tokens IA</Text>
                  <Text style={styles.tableCell}>{data.maintenance.tokens.toLocaleString()}</Text>
                </View>
              )}
              {data.maintenance.hours && (
                <View style={styles.maintenanceItem}>
                  <Text style={styles.tableCell}>Bolsa de horas</Text>
                  <Text style={styles.tableCell}>{data.maintenance.hours}h</Text>
                </View>
              )}
              {data.maintenance.monthly && (
                <View style={[styles.maintenanceItem, { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#bae6fd' }]}>
                  <Text style={[styles.tableCell, { fontWeight: 600 }]}>Cuota mensual</Text>
                  <Text style={[styles.tableCell, { fontWeight: 600 }]}>
                    {formatCurrency(data.maintenance.monthly)}/mes
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Supuestos */}
        {data.assumptions && data.assumptions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Supuestos y condiciones</Text>
            <View style={styles.assumptions}>
              {data.assumptions.map((assumption, index) => (
                <Text key={index} style={styles.assumptionItem}>
                  <Text style={styles.bullet}>• </Text>
                  {assumption}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Validez */}
        <View style={styles.validityBox}>
          <Text style={styles.validityText}>
            Este presupuesto tiene validez hasta el {data.validUntil}. 
            Los precios no incluyen IVA salvo indicación expresa. 
            Condiciones de pago: 50% al inicio, 50% a la entrega.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generado con PresupuestosIA
          </Text>
          <Text style={styles.footerText}>
            Página 1 de 1
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export type { BudgetPDFData, BudgetItem };
