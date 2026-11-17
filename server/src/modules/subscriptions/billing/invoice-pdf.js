import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";

/*
 * Billing invoice PDF. Converted from components/pdf/invoice-pdf.tsx
 * (JSX → React.createElement, alias `h`) so the server runs without a build step.
 * Keep the two in sync until the Next.js copy is deleted at cleanup.
 */

const h = React.createElement;
// Colors for the invoice
const colors = {
  primary: "#7c3aed",
  primaryLight: "#f3e8ff",
  textDark: "#1a1d2e",
  textMuted: "#6b7280",
  borderLight: "#eaecf5",
  white: "#ffffff",
  bgLight: "#f8f9fa",
};
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
});
export function InvoicePdf({ invoiceNumber, date, planName, status, amount, userName, studioName, }) {
  return (h(Document, null,
    h(Page, { size: "A4", style: styles.page },
      h(View, { style: styles.card },
        h(View, { style: styles.header },
          h(View, null,
            h(Text, { style: styles.brand }, "ArtistOS"),
            h(Text, { style: styles.brandSub }, "artistos.in")),
          h(View, { style: styles.badge },
            h(Text, null, "INVOICE"))),
        h(Text, { style: styles.title },
          "Invoice #",
          invoiceNumber),
        h(Text, { style: styles.date },
          "Issued: ",
          format(new Date(date), "MMMM d, yyyy")),
        (userName || studioName) && (h(View, { style: styles.row },
          h(Text, { style: styles.label }, "Billed To"),
          h(View, { style: { alignItems: "flex-end" } },
            h(Text, { style: styles.value }, studioName || userName),
            studioName && userName && (h(Text, { style: { ...styles.value, color: colors.textMuted, marginTop: 2 } }, userName))))),
        h(View, { style: styles.row },
          h(Text, { style: styles.label }, "Plan"),
          h(Text, { style: styles.value }, planName)),
        h(View, { style: styles.row },
          h(Text, { style: styles.label }, "Status"),
          h(Text, { style: { ...styles.value, textTransform: "capitalize" } }, status)),
        h(View, { style: styles.row },
          h(Text, { style: styles.label }, "Date"),
          h(Text, { style: styles.value }, format(new Date(date), "MMMM d, yyyy"))),
        h(View, { style: styles.rowLast },
          h(Text, { style: styles.label }, "Amount Paid"),
          h(Text, { style: styles.totalValue },
            "INR ",
            amount.toLocaleString("en-IN"))),
        h(Text, { style: styles.footer }, "Thank you for choosing ArtistOS \u00B7 support@artistos.in")))));
}
