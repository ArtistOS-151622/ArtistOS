import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { PwaInstallPrompt } from "@/components/common/pwa/pwa-install-prompt";
import { Toaster } from "@/components/ui/sonner";
import { JsonLd } from "@/components/common/seo/json-ld";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.artistos.in";
const OG_IMAGE = `${APP_URL}/og-image.png`;

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

  title: {
    default: "ArtistOS (artistos.in) — Business Software for Artists",
    template: "%s | ArtistOS (artistos.in)",
  },
  description:
    "ArtistOS is India's #1 business software for artists. Manage appointments, clients, portfolio, payments & WhatsApp marketing. Try ArtistOS free.",

  keywords: [
    "ArtistOS",
    "artistos.in",
    "Artist OS",
    "artist os",
    "artistos",
    "artistos official",
    "artistos india",
    "artist os india",
    "artistos website",
    "artistos app india",
    "artistos crm",
    "artistos login",
    "artistos signup",
    "artistos vs artistos ai",
    "artist app",
    "artist software",
    "nail artist app",
    "nail artist software",
    "mehendi artist app",
    "mehendi artist booking",
    "bridal makeup artist app",
    "bridal artist software",
    "beauty salon management software",
    "beauty salon app India",
    "salon management software India",
    "artist business management",
    "beauty CRM India",
    "nail art portfolio app",
    "makeup artist portfolio website",
    "beauty appointment booking",
    "artist booking software",
    "freelance artist tools",
    "beauty payment tracking",
    "WhatsApp marketing beauty",
    "beauty business dashboard",
    "salon invoice app",
    "beauty freelancer app India",
    "artist business software India",
    "beauty studio management",
    "nail salon booking app",
    "henna artist booking app",
    "artist CRM",
    "CRM for artists",
    "CRM for makeup artists India",
    "best booking app for nail artists",
    "beauty professional software India",
    "salon booking system India",
    "artist management platform",
  ],

  authors: [{ name: "ArtistOS", url: APP_URL }],
  creator: "ArtistOS",
  publisher: "ArtistOS",
  category: "Business Software",

  alternates: {
    canonical: "/",
  },

  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  openGraph: {
    type: "website",
    locale: "en_IN",
    url: APP_URL,
    siteName: "ArtistOS (artistos.in)",
    title: "ArtistOS (artistos.in) — Business Software for Artists",
    description:
      "All-in-one booking, CRM, portfolio, payments & WhatsApp campaigns for nail artists, mehendi artists, bridal artists & beauty professionals. Try ArtistOS free.",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "ArtistOS (artistos.in) — Business Software for Artists",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "ArtistOS (artistos.in) — Business Software for Artists",
    description:
      "India's #1 app for nail artists, mehendi artists, bridal makeup artists & beauty professionals. Bookings, CRM, portfolio, payments & more.",
    images: [OG_IMAGE],
    creator: "@artistos_in",
    site: "@artistos_in",
  },

  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192x192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/icons/icon-180x180.png",
  },

  appleWebApp: {
    capable: true,
    title: "ArtistOS",
    statusBarStyle: "default",
  },

  verification: {
    google: "6TDK87eliXS9Q3w7IlF0eidlwuhc9OhCR5QfygnLZck",
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-IN"
      className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <JsonLd />
      </head>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        {children}
        <PwaInstallPrompt />
        <Toaster position="top-right" duration={3000} richColors />
      </body>
    </html>
  );
}
