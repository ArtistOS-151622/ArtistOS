import React from "react"
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"

// Colors matching the provided image exactly
const colors = {
  primary: "#3b0764", // Very dark purple for header and grand total box
  primaryText: "#4c1d95", // Purple text for titles and table headers
  secondaryBg: "#f5f3ff", // Light purple background for blocks
  textDark: "#1e293b",
  textMuted: "#475569",
  textRed: "#b91c1c", // Red for deductions
  borderLight: "#e2e8f0",
  bgStripe: "#f8fafc",
  white: "#ffffff",
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.textDark,
  },
  // Top Banner
  topBanner: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 25,
    paddingHorizontal: 40,
  },
  logoBox: {
    backgroundColor: colors.white,
    borderRadius: 6,
    padding: 10,
    width: 80,
    height: 80,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 60,
    height: 60,
    objectFit: "contain",
  },
  logoFallbackText: {
    color: colors.primary,
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
  },
  studioInfo: {
    alignItems: "flex-end",
  },
  studioText: {
    color: colors.white,
    fontSize: 10,
    marginBottom: 4,
  },

  // Title
  titleContainer: {
    paddingVertical: 25,
    alignItems: "center",
  },
  invoiceTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    letterSpacing: 1,
  },

  // Info Blocks
  infoBlocksContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    marginBottom: 30,
  },
  infoBlock: {
    backgroundColor: colors.secondaryBg,
    borderRadius: 8,
    padding: 16,
    width: "48%",
  },
  infoBlockTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  infoBlockTextBold: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  infoBlockText: {
    fontSize: 9,
    color: colors.textMuted,
    marginBottom: 3,
    lineHeight: 1.4,
  },

  // Table
  tableContainer: {
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
    paddingBottom: 8,
    marginBottom: 4,
  },
  tableHeaderCell: {
    color: colors.primary,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
  },
  tableRowStripe: {
    backgroundColor: colors.bgStripe,
  },
  col1: { width: "50%", paddingLeft: 4 },
  col2: { width: "15%", textAlign: "center" },
  col3: { width: "15%", textAlign: "right" },
  col4: { width: "20%", textAlign: "right", paddingRight: 4 },

  // Totals
  totalsContainer: {
    paddingHorizontal: 40,
    alignItems: "flex-end",
  },
  totalsWrapper: {
    width: "48%",
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    padding: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  totalText: {
    fontSize: 10,
  },
  totalValue: {
    fontSize: 10,
    textAlign: "right",
  },
  deductionText: {
    fontSize: 10,
    color: colors.textRed,
  },
  deductionValue: {
    fontSize: 10,
    color: colors.textRed,
    textAlign: "right",
  },
  grandTotalBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  grandTotalText: {
    color: colors.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 10,
    alignItems: "center",
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 9,
  },

  // Watermark
  watermarkContainer: {
    position: "absolute",
    top: 0,
    left: -60,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    transform: "rotate(-45deg)",
  },
  watermarkImage: {
    width: 300,
    height: 300,
    opacity: 0.08,
    objectFit: "contain",
  },
})

export type QuotationData = {
  booking: any
  artist: any
  calculations: {
    subTotal: number
    discount: number
    grandTotal: number
    totalPaid: number
    dueAmount: number
  }
  artistosLogoUrl?: string
}

export const QuotationPDF = ({ booking, artist, calculations, artistosLogoUrl }: QuotationData) => {
  const { subTotal, discount, grandTotal, totalPaid } = calculations

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return "Rs. " + amount.toLocaleString("en-IN")
  }

  // Combine services and charges for table iteration
  const allItems = [
    ...(booking.services || []).map((s: any) => ({ ...s, isAddon: false })),
    ...(booking.additional_charges || []).map((c: any) => ({
      service_name: c.charge_name,
      quantity: c.quantity,
      price: c.rate,
      isAddon: true
    }))
  ]

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* TOP BANNER */}
        <View style={styles.topBanner}>
          <View style={styles.logoBox}>
            {artist.studio_logo_url ? (
              <Image src={artist.studio_logo_url} style={styles.logoImage} />
            ) : (
              <Text style={styles.logoFallbackText}>
                {artist.artist_name?.substring(0, 2).toUpperCase() || "AS"}
              </Text>
            )}
          </View>

          <View style={styles.studioInfo}>
            <Text style={[styles.studioText, { fontFamily: "Helvetica-Bold", fontSize: 18, marginBottom: 6 }]}>
              {artist.studio_name || artist.artist_name || "Artist Studio"}
            </Text>
            {artist.phone && <Text style={[styles.studioText, { fontSize: 13 }]}>{artist.phone}</Text>}
          </View>
        </View>

        {/* TITLE */}
        <View style={styles.titleContainer}>
          <Text style={styles.invoiceTitle}>INVOICE</Text>
        </View>

        {/* INFO BLOCKS */}
        <View style={styles.infoBlocksContainer}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoBlockTitle}>BILL TO</Text>
            <Text style={styles.infoBlockTextBold}>{booking.customer.customer_name}</Text>
            <Text style={styles.infoBlockText}>{booking.customer.phone}</Text>
            <Text style={styles.infoBlockText}>{booking.booking_address}</Text>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.infoBlockTitle}>BOOKING</Text>
            <Text style={styles.infoBlockText}>Date: {formatDate(booking.booking_date)}</Text>
            <Text style={styles.infoBlockText}>
              Timing: {booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}
            </Text>
          </View>
        </View>

        {/* ITEMS TABLE */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.col1, styles.tableHeaderCell]}>SERVICE</Text>
            <Text style={[styles.col2, styles.tableHeaderCell]}>QTY</Text>
            <Text style={[styles.col3, styles.tableHeaderCell]}>RATE</Text>
            <Text style={[styles.col4, styles.tableHeaderCell]}>AMOUNT</Text>
          </View>

          {allItems.map((item: any, index: number) => (
            <View style={[styles.tableRow, index % 2 === 1 ? styles.tableRowStripe : {}]} key={index}>
              <Text style={styles.col1}>{item.service_name}</Text>
              <Text style={styles.col2}>{item.quantity}</Text>
              <Text style={styles.col3}>{formatCurrency(item.price)}</Text>
              <Text style={styles.col4}>{formatCurrency(item.price * item.quantity)}</Text>
            </View>
          ))}
        </View>

        {/* TOTALS */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsWrapper}>
            <View style={styles.totalRow}>
              <Text style={styles.totalText}>Gross Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(subTotal)}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.deductionText}>Advance Payment</Text>
              <Text style={styles.deductionValue}>-{formatCurrency(totalPaid)}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.deductionText}>Discount</Text>
              <Text style={styles.deductionValue}>-{formatCurrency(discount)}</Text>
            </View>

            <View style={styles.grandTotalBox}>
              <Text style={styles.grandTotalText}>Grand Total</Text>
              <Text style={styles.grandTotalText}>{formatCurrency(grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Terms: Advance payment is non-refundable • Balance due on day of service • Rescheduling needs 24 hrs notice.
          </Text>
        </View>

        {/* WATERMARK */}
        {artistosLogoUrl && (
          <View style={styles.watermarkContainer}>
            <Image src={artistosLogoUrl} style={styles.watermarkImage} />
          </View>
        )}

      </Page>
    </Document>
  )
}
