import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

/*
 * Booking quotation/invoice PDF. Converted from components/pdf/quotation-pdf.tsx
 * (JSX → React.createElement, alias `h`) so the server runs without a build step.
 * Keep the two in sync until the Next.js copy is deleted at cleanup.
 */

const h = React.createElement;
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
};
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
    maxWidth: 320,
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
});
export const QuotationPDF = ({ booking, artist, calculations, artistosLogoUrl }) => {
  const { subTotal, discount, grandTotal, totalPaid } = calculations;
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };
  const formatCurrency = (amount) => {
    return "Rs. " + amount.toLocaleString("en-IN");
  };
  // Combine services and charges for table iteration
  const allItems = [
    ...(booking.services || []).map((s) => ({ ...s, isAddon: false })),
    ...(booking.additional_charges || []).map((c) => ({
      service_name: c.charge_name,
      quantity: c.quantity,
      price: c.rate,
      isAddon: true
    }))
  ];
  return (h(Document, null,
    h(Page, { size: "A4", style: styles.page },
      h(View, { style: styles.topBanner },
        h(View, { style: styles.logoBox }, artist.studio_logo_url ? (h(Image, { src: artist.studio_logo_url, style: styles.logoImage })) : (h(Text, { style: styles.logoFallbackText }, artist.artist_name?.substring(0, 2).toUpperCase() || "AS"))),
        h(View, { style: styles.studioInfo },
          h(Text, { style: [styles.studioText, { fontFamily: "Helvetica-Bold", fontSize: 18, marginBottom: 6 }] }, artist.studio_name || artist.artist_name || "Artist Studio"),
          artist.phone && h(Text, { style: [styles.studioText, { fontSize: 13 }] }, artist.phone),
          artist.address && (h(Text, { style: [styles.studioText, { textAlign: "right", lineHeight: 1.4 }] }, artist.address)))),
      h(View, { style: styles.titleContainer },
        h(Text, { style: styles.invoiceTitle }, "INVOICE")),
      h(View, { style: styles.infoBlocksContainer },
        h(View, { style: styles.infoBlock },
          h(Text, { style: styles.infoBlockTitle }, "BILL TO"),
          h(Text, { style: styles.infoBlockTextBold }, booking.customer.customer_name),
          h(Text, { style: styles.infoBlockText }, booking.customer.phone),
          h(Text, { style: styles.infoBlockText }, booking.booking_address)),
        h(View, { style: styles.infoBlock },
          h(Text, { style: styles.infoBlockTitle }, "BOOKING"),
          h(Text, { style: styles.infoBlockText },
            "Date: ",
            formatDate(booking.booking_date)),
          h(Text, { style: styles.infoBlockText },
            "Timing: ",
            booking.start_time.substring(0, 5),
            " - ",
            booking.end_time.substring(0, 5)))),
      h(View, { style: styles.tableContainer },
        h(View, { style: styles.tableHeader },
          h(Text, { style: [styles.col1, styles.tableHeaderCell] }, "SERVICE"),
          h(Text, { style: [styles.col2, styles.tableHeaderCell] }, "QTY"),
          h(Text, { style: [styles.col3, styles.tableHeaderCell] }, "RATE"),
          h(Text, { style: [styles.col4, styles.tableHeaderCell] }, "AMOUNT")),
        allItems.map((item, index) => (h(View, { style: [styles.tableRow, index % 2 === 1 ? styles.tableRowStripe : {}], key: index },
          h(Text, { style: styles.col1 }, item.service_name),
          h(Text, { style: styles.col2 }, item.quantity),
          h(Text, { style: styles.col3 }, formatCurrency(item.price)),
          h(Text, { style: styles.col4 }, formatCurrency(item.price * item.quantity)))))),
      h(View, { style: styles.totalsContainer },
        h(View, { style: styles.totalsWrapper },
          h(View, { style: styles.totalRow },
            h(Text, { style: styles.totalText }, "Gross Total"),
            h(Text, { style: styles.totalValue }, formatCurrency(subTotal))),
          h(View, { style: styles.totalRow },
            h(Text, { style: styles.deductionText }, "Advance Payment"),
            h(Text, { style: styles.deductionValue },
              "-",
              formatCurrency(totalPaid))),
          h(View, { style: styles.totalRow },
            h(Text, { style: styles.deductionText }, "Discount"),
            h(Text, { style: styles.deductionValue },
              "-",
              formatCurrency(discount))),
          h(View, { style: styles.grandTotalBox },
            h(Text, { style: styles.grandTotalText }, "Grand Total"),
            h(Text, { style: styles.grandTotalText }, formatCurrency(grandTotal))))),
      h(View, { style: styles.footer },
        h(Text, { style: styles.footerText }, "Terms: Advance payment is non-refundable \u2022 Balance due on day of service \u2022 Rescheduling needs 24 hrs notice.")),
      artistosLogoUrl && (h(View, { style: styles.watermarkContainer },
        h(Image, { src: artistosLogoUrl, style: styles.watermarkImage }))))));
};
