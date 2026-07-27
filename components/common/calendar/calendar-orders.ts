export type ArtistOrder = {
  id: number
  title: string
  client: string
  service: string
  artist: string
  status: "confirmed" | "pending" | "paid"
  start: Date
  end: Date
}

export const artistOrders: ArtistOrder[] = [
  {
    id: 1,
    title: "Riya M. - Bridal mehendi",
    client: "Riya M.",
    service: "Bridal mehendi",
    artist: "Ayesha Henna Studio",
    status: "confirmed",
    start: new Date(2026, 6, 14, 10, 0),
    end: new Date(2026, 6, 14, 13, 0),
  },
  {
    id: 2,
    title: "Neha S. - Nail extensions",
    client: "Neha S.",
    service: "Nail extensions",
    artist: "Artist Studio",
    status: "paid",
    start: new Date(2026, 6, 14, 15, 0),
    end: new Date(2026, 6, 14, 16, 30),
  },
  {
    id: 3,
    title: "Anjali P. - Party makeup",
    client: "Anjali P.",
    service: "Party makeup",
    artist: "Riya Makeovers",
    status: "pending",
    start: new Date(2026, 6, 15, 11, 30),
    end: new Date(2026, 6, 15, 13, 0),
  },
  {
    id: 4,
    title: "Kavya D. - Side mehendi",
    client: "Kavya D.",
    service: "Side mehendi",
    artist: "Ayesha Henna Studio",
    status: "confirmed",
    start: new Date(2026, 6, 16, 17, 0),
    end: new Date(2026, 6, 16, 18, 0),
  },
  {
    id: 5,
    title: "Mira K. - Bridal trial",
    client: "Mira K.",
    service: "Bridal trial",
    artist: "Artist Studio",
    status: "paid",
    start: new Date(2026, 6, 17, 9, 30),
    end: new Date(2026, 6, 17, 11, 0),
  },
]
