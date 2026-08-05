import React from "react"
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer"
import { format } from "date-fns"

// Colors for the invoice
const colors = {
  primary: "#7c3aed",
  primaryLight: "#f3e8ff",
  textDark: "#1a1d2e",
  textMuted: "#6b7280",
  borderLight: "#eaecf5",
  white: "#ffffff",
  bgLight: "#f8f9fa",
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.textDark,
    backgroundColor: colors.bgLight,
    padding: 0,
  },
  card: {
    backgroundColor: colors.white,
    margin: 40,
    padding: 40,
    borderRadius: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryLight,
    paddingBottom: 24,
    marginBottom: 24,
  },
  brand: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
  },
  brandSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  badge: {
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
  },
  value: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
  },
  totalValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    color: colors.primary,
  },
  footer: {
    marginTop: 32,
    textAlign: "center",
    fontSize: 10,
    color: colors.textMuted,
  },
})

type InvoiceProps = {
  invoiceNumber: string
  date: string
  planName: string
  status: string
  amount: number
  userName?: string
  studioName?: string
}

export function InvoicePdf({
  invoiceNumber,
  date,
  planName,
  status,
  amount,
  userName,
  studioName,
}: InvoiceProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>ArtistOS</Text>
              <Text style={styles.brandSub}>artistos.in</Text>
            </View>
            <View style={styles.badge}>
              <Text>INVOICE</Text>
            </View>
          </View>

          <Text style={styles.title}>Invoice #{invoiceNumber}</Text>
          <Text style={styles.date}>Issued: {format(new Date(date), "MMMM d, yyyy")}</Text>

          {/* Details */}
          {(userName || studioName) && (
            <View style={styles.row}>
              <Text style={styles.label}>Billed To</Text>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.value}>{studioName || userName}</Text>
                {studioName && userName && (
                  <Text style={{ ...styles.value, color: colors.textMuted, marginTop: 2 }}>{userName}</Text>
                )}
              </View>
            </View>
          )}
          
          <View style={styles.row}>
            <Text style={styles.label}>Plan</Text>
            <Text style={styles.value}>{planName}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={{ ...styles.value, textTransform: "capitalize" }}>{status}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{format(new Date(date), "MMMM d, yyyy")}</Text>
          </View>
          
          <View style={styles.rowLast}>
            <Text style={styles.label}>Amount Paid</Text>
            <Text style={styles.totalValue}>INR {amount.toLocaleString("en-IN")}</Text>
          </View>

          <Text style={styles.footer}>Thank you for choosing ArtistOS · support@artistos.in</Text>
        </View>
      </Page>
    </Document>
  )
}
