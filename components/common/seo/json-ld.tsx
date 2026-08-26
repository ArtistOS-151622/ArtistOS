/**
 * JSON-LD Structured Data for ArtistOS
 *
 * Implements comprehensive schemas for maximum search engine understanding,
 * Answer Engine Optimization (AEO), and Generative Engine Optimization (GEO):
 *
 *  1. Organization       — brand identity, logo, contact, NAP consistency
 *  2. LocalBusiness      — physical presence, geo coordinates, opening hours
 *  3. WebSite            — enables Google Sitelinks Search Box
 *  4. SoftwareApplication — rich result for app store-style cards + reviews
 *  5. FAQPage            — targets People Also Ask & Featured Snippets
 *  6. BreadcrumbList     — homepage breadcrumb for sitelinks
 *  7. HowTo             — "How to get started" for Featured Snippets & AI citations
 */

const SITE_URL = "https://artistos.in"
const LOGO_URL = `${SITE_URL}/brand/logo.png`
const OG_IMAGE_URL = `${SITE_URL}/og-image.png`

const CONTACT_EMAIL = "artistoscrm@gmail.com"
const CONTACT_PHONE = "+918320620125"
const ADDRESS = {
  "@type": "PostalAddress" as const,
  streetAddress: "504, RK Empire, 150 Feet Ring Road",
  addressLocality: "Rajkot",
  addressRegion: "Gujarat",
  postalCode: "360004",
  addressCountry: "IN",
}

export function JsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "ArtistOS",
    alternateName: ["ArtistOS India", "Artist OS", "artistos.in", "Artist-OS"],
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: LOGO_URL,
      width: 512,
      height: 512,
    },
    image: OG_IMAGE_URL,
    description:
      "ArtistOS is India's leading all-in-one business software platform for artists — nail artists, mehendi artists, bridal makeup artists, salon owners, and beauty freelancers. Manage bookings, clients, portfolio, payments, WhatsApp campaigns, and reports from one dashboard.",
    foundingDate: "2024",
    foundingLocation: {
      "@type": "Place",
      name: "Rajkot, Gujarat, India",
    },
    address: ADDRESS,
    telephone: CONTACT_PHONE,
    email: CONTACT_EMAIL,
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
      "CRM for artists",
      "booking software for beauty professionals",
    ],
    sameAs: [
      "https://www.instagram.com/artistoscrm/",
      "https://www.facebook.com/profile.php?id=61593919465435",
      // "https://twitter.com/artistos_in",
      // "https://www.linkedin.com/company/artistos",
      "https://www.youtube.com/channel/UCTmnBHWzQdpNR5CMoQwKcoQ",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: CONTACT_PHONE,
        email: CONTACT_EMAIL,
        contactType: "customer support",
        availableLanguage: ["English", "Hindi", "Gujarati"],
        areaServed: "IN",
      },
      {
        "@type": "ContactPoint",
        telephone: CONTACT_PHONE,
        email: CONTACT_EMAIL,
        contactType: "sales",
        availableLanguage: ["English", "Hindi"],
        areaServed: "IN",
      },
    ],
  }

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#localbusiness`,
    name: "ArtistOS",
    alternateName: "Artist OS",
    url: SITE_URL,
    image: OG_IMAGE_URL,
    logo: LOGO_URL,
    description:
      "ArtistOS is India's #1 all-in-one business management software for beauty professionals. Booking calendar, client CRM, portfolio gallery, payment tracking, WhatsApp campaigns, and business analytics — built for nail artists, mehendi artists, bridal makeup artists, and salon owners.",
    telephone: CONTACT_PHONE,
    email: CONTACT_EMAIL,
    address: ADDRESS,
    geo: {
      "@type": "GeoCoordinates",
      latitude: 22.2868,
      longitude: 70.7965,
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "10:00",
      closes: "19:00",
    },
    priceRange: "₹249 - ₹2799",
    currenciesAccepted: "INR",
    paymentAccepted: "UPI, Credit Card, Debit Card, Net Banking",
    areaServed: {
      "@type": "Country",
      name: "India",
    },
    parentOrganization: {
      "@id": `${SITE_URL}/#organization`,
    },
  }

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: "ArtistOS",
    alternateName: "Artist OS",
    url: SITE_URL,
    description:
      "ArtistOS — India's #1 business software for artists. Booking, CRM, Portfolio, Payments & WhatsApp Marketing in one place.",
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: "en-IN",
  }

  const softwareApp = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#software`,
    name: "ArtistOS",
    alternateName: "Artist OS",
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Beauty Business Management Software",
    operatingSystem: "Web, Android, iOS",
    description:
      "ArtistOS is the #1 business management app for artists in India. Features include appointment booking calendar, client CRM, portfolio gallery, payment & invoice tracking, WhatsApp broadcast campaigns, business analytics, and service management — built specifically for nail artists, mehendi artists, bridal makeup artists, salon owners, and beauty freelancers.",
    screenshot: OG_IMAGE_URL,
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
      "Shareable Portfolio Links",
      "Inquiry Management",
    ],
    offers: [
      {
        "@type": "Offer",
        name: "Free Trial",
        price: "0",
        priceCurrency: "INR",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/signup`,
        description: "1-month free trial with all features, no credit card required",
      },
      {
        "@type": "Offer",
        name: "Monthly Plan",
        price: "249",
        priceCurrency: "INR",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/#pricing`,
      },
      {
        "@type": "Offer",
        name: "Yearly Plan",
        price: "2799",
        priceCurrency: "INR",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/#pricing`,
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "240",
      bestRating: "5",
      worstRating: "1",
    },
    review: [
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Riya Mehta" },
        reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
        reviewBody:
          "I used to lose track of who booked what between WhatsApp and my diary. Now every client's history is in one place — I stopped double-booking completely, and my repeat clients went from 12 to 31 in four months.",
        datePublished: "2025-06-15",
      },
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Ayesha Khan" },
        reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
        reviewBody:
          "Before Karva Chauth I sent one broadcast to my repeat clients. Nine of them booked the same week. I'd have never remembered to message them all one by one.",
        datePublished: "2025-07-20",
      },
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Kavya Pillai" },
        reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
        reviewBody:
          "Running two artists plus myself, I never knew who owed what. The dues report showed ₹25,000 pending that I'd genuinely forgotten about. Collected most of it in two weeks.",
        datePublished: "2025-08-10",
      },
    ],
    author: {
      "@id": `${SITE_URL}/#organization`,
    },
    publisher: {
      "@id": `${SITE_URL}/#organization`,
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
          text: "ArtistOS is an all-in-one business management software platform designed specifically for artists in India — including nail artists, mehendi artists, bridal makeup artists, salon owners, and beauty freelancers. It provides tools for appointment booking, client CRM, portfolio management, payment tracking, WhatsApp campaigns, and business analytics. Visit artistos.in to learn more.",
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
          text: "ArtistOS offers a Monthly plan at ₹249/month and a Yearly plan at ₹2799/year (saving over 40%). Both plans include booking calendar, client CRM, portfolio gallery, payment tracking, WhatsApp campaigns, and business reports. A custom white-label plan is also available for salons and academies. Start with a free 1-month trial at artistos.in/signup — no credit card required.",
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
          text: "Yes. ArtistOS includes WhatsApp broadcast campaign tools that let artists send festival offers, birthday wishes, repeat-client promotions, and payment reminders to their client list directly from the platform.",
        },
      },
      {
        "@type": "Question",
        name: "Can I create a portfolio on ArtistOS?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. ArtistOS includes a portfolio gallery feature where nail artists, mehendi artists, bridal artists, and other beauty professionals can upload and organize their work into categories for clients to browse. You can share a private portfolio link with any client.",
        },
      },
      {
        "@type": "Question",
        name: "Is ArtistOS available in India?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. ArtistOS is made in India and available at artistos.in. It supports Indian Rupee (₹) pricing and is built specifically for the Indian artist and beauty market.",
        },
      },
      {
        "@type": "Question",
        name: "What is the best CRM for makeup artists in India?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "ArtistOS (artistos.in) is widely regarded as the best CRM for makeup artists in India. It combines appointment booking, client management, portfolio gallery, payment tracking, and WhatsApp marketing in a single platform designed specifically for Indian beauty professionals — starting at just ₹249/month.",
        },
      },
      {
        "@type": "Question",
        name: "What is the best booking app for nail artists?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "ArtistOS is the #1 booking app for nail artists in India. It features a smart calendar to prevent double bookings, client CRM with full history, a portfolio gallery for nail art designs, payment tracking, and WhatsApp broadcast campaigns — all in one app at artistos.in.",
        },
      },
    ],
  }

  const breadcrumbList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
    ],
  }

  const howTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Get Started with ArtistOS",
    description:
      "Get your beauty business organized in 3 simple steps with ArtistOS — India's #1 business software for artists.",
    totalTime: "PT5M",
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "INR",
      value: "0",
    },
    step: [
      {
        "@type": "HowToStep",
        name: "Sign up for free",
        text: "Visit artistos.in/signup and create your free account using your phone number. No credit card required — you get a full 1-month free trial with all features.",
        url: `${SITE_URL}/signup`,
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Set up your services and clients",
        text: "Add your beauty services (nail art, mehendi, bridal makeup, etc.) with pricing and duration. Import or add your existing clients to the CRM — names, contacts, and booking preferences.",
        url: `${SITE_URL}/login`,
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Start booking and growing",
        text: "Use the booking calendar to schedule appointments, track payments, upload portfolio photos, and send WhatsApp campaigns to your clients. Watch your repeat bookings grow automatically.",
        url: `${SITE_URL}/login`,
        position: 3,
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }}
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbList) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howTo) }}
      />
    </>
  )
}
