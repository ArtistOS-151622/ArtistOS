import assert from "node:assert/strict"
import test from "node:test"

import { isGoogleMapsUrl } from "../lib/validation/google-maps-url.ts"

test("accepts supported Google Maps links", () => {
  const links = [
    "https://www.google.com/maps/place/Rajkot",
    "https://maps.google.com/?q=Rajkot",
    "https://www.google.co.in/maps/place/Rajkot",
    "https://maps.app.goo.gl/abc123",
    "https://goo.gl/maps/abc123",
  ]

  for (const link of links) assert.equal(isGoogleMapsUrl(link), true, link)
})

test("rejects non-map, insecure, and lookalike links", () => {
  const links = [
    "https://google.com/",
    "http://www.google.com/maps/place/Rajkot",
    "https://google.com.evil.example/maps/place/Rajkot",
    "https://example.com/maps/place/Rajkot",
    "not a link",
  ]

  for (const link of links) assert.equal(isGoogleMapsUrl(link), false, link)
})
