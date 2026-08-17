/**
 * JSON-LD Structured Data for ArtistOS
 *
 * Implements three schemas for maximum Google understanding:
 *  1. Organization  — brand identity, logo, contact
 *  2. WebSite       — enables Google Sitelinks Search Box
 *  3. SoftwareApplication — rich result for app store-style cards
 */

export function JsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://artistos.in/#organization",
    name: "ArtistOS",
    alternateName: ["ArtistOS India", "Artist OS", "artistos.in"],
    url: "https://artistos.in",
    logo: {
      "@type": "ImageObject",
      url: "https://artistos.in/brand/logo.png",
      width: 512,
      height: 512,
    },
    image: "https://artistos.in/og-image.png",
    description:
      "ArtistOS is India's leading all-in-one business software platform for artists — nail artists, mehendi artists, bridal makeup artists, salon owners, and beauty freelancers. Manage bookings, clients, portfolio, payments, WhatsApp campaigns, and reports from one dashboard.",
    foundingDate: "2024",
    foundingLocation: {
      "@type": "Place",
      name: "India",
    },
    areaServed: [
      { "@type": "Country", name: "India" },
    ],
    knowsAbout: [
      "artist business management",
      "Nail artist appointment booking",
      "Mehendi artist CRM",
      "Bridal makeup artist software",
      "Beauty salon management",
      "Artist portfolio management",
      "WhatsApp marketing for artists",
      "Beauty freelancer tools",
      "Salon payment tracking",
    ],
    sameAs: [
      // Add social links here when available:
      // "https://www.instagram.com/artistos.in",
      // "https://www.facebook.com/artistos",
      // "https://twitter.com/artistos_in",
      // "https://www.linkedin.com/company/artistos",
      // "https://www.youtube.com/@artistos",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      availableLanguage: ["English", "Hindi"],
    },
  }

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://artistos.in/#website",
    name: "ArtistOS",
    url: "https://artistos.in",
    description:
      "ArtistOS — Business Software for artists. Booking, CRM, Portfolio, Payments & Marketing in one place.",
    publisher: {
      "@id": "https://artistos.in/#organization",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://artistos.in/?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: "en-IN",
  }

  const softwareApp = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": "https://artistos.in/#software",
    name: "ArtistOS",
    alternateName: "Artist OS",
    url: "https://artistos.in",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Beauty Business Management Software",
    operatingSystem: "Web, Android, iOS",
    description:
      "ArtistOS is the #1 business management app for artists in India. Features include appointment booking calendar, client CRM, portfolio gallery, payment & invoice tracking, WhatsApp broadcast campaigns, business analytics, and service management — built specifically for nail artists, mehendi artists, bridal makeup artists, salon owners, and beauty freelancers.",
    screenshot: "https://artistos.in/og-image.png",
    featureList: [
      "Appointment Booking & Scheduling Calendar",
      "Client CRM & Customer Management",
      "Portfolio Gallery with Cloud Storage",
      "Payment & Invoice Tracking",
      "WhatsApp Broadcast Campaigns",
      "Business Reports & Analytics",
      "Service & Pricing Management",
      "Birthday & Festival Offers",
      "Repeat Client Management",
      "Business Dashboard",
    ],
    offers: [
      {
        "@type": "Offer",
        name: "Monthly Plan",
        price: "249",
        priceCurrency: "INR",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
        url: "https://artistos.in/#pricing",
      },
      {
        "@type": "Offer",
        name: "Yearly Plan",
        price: "2799",
        priceCurrency: "INR",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
        url: "https://artistos.in/#pricing",
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "240",
      bestRating: "5",
      worstRating: "1",
    },
    author: {
      "@id": "https://artistos.in/#organization",
    },
    publisher: {
      "@id": "https://artistos.in/#organization",
    },
    inLanguage: "en-IN",
    isAccessibleForFree: false,
    softwareVersion: "2.0",
  }

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is ArtistOS?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "ArtistOS is an all-in-one business management software platform designed specifically for artists in India — including nail artists, mehendi artists, bridal makeup artists, salon owners, and beauty freelancers. It provides tools for appointment booking, client CRM, portfolio management, payment tracking, WhatsApp campaigns, and business analytics.",
        },
      },
      {
        "@type": "Question",
        name: "Who is ArtistOS for?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "ArtistOS is built for nail artists, mehendi artists, bridal makeup artists, beauty salon owners, hair stylists, eyelash artists, and all beauty freelancers and professionals who want to organize their business, manage clients, and grow their income.",
        },
      },
      {
        "@type": "Question",
        name: "How much does ArtistOS cost?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "ArtistOS offers a Monthly plan at ₹249/month and a Yearly plan at ₹2799/year (saving over 40%). Both plans include booking calendar, client CRM, portfolio gallery, payment tracking, WhatsApp campaigns, and business reports. A custom white-label plan is also available for salons and academies.",
        },
      },
      {
        "@type": "Question",
        name: "Can I manage bookings on ArtistOS?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. ArtistOS has a full appointment booking calendar that helps artists avoid double bookings, send reminders, manage service slots, and view booking history — all in one place.",
        },
      },
      {
        "@type": "Question",
        name: "Does ArtistOS support WhatsApp marketing?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. ArtistOS includes WhatsApp broadcast campaign tools that let artists send festival offers, birthday wishes, repeat-client promotions, and payment reminders to their client list directly.",
        },
      },
      {
        "@type": "Question",
        name: "Can I create a portfolio on ArtistOS?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. ArtistOS includes a portfolio gallery feature where nail artists, mehendi artists, bridal artists, and other beauty professionals can upload and organize their work into categories for clients to browse.",
        },
      },
      {
        "@type": "Question",
        name: "Is ArtistOS available in India?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. ArtistOS is made in India and available at artistos.in. It supports Indian Rupee (₹) pricing, GST-inclusive invoicing, and is built for the Indian artist market.",
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
      />
    </>
  )
}
