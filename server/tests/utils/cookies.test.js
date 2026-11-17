import "../helpers/env.js"

import assert from "node:assert/strict"
import { test } from "node:test"

import { getAllCookieValues } from "#src/utils/cookies.js"

test("returns every value for a repeated cookie name, in order", () => {
  const header = "artist_session=first; theme=dark; artist_session=second"
  assert.deepEqual(getAllCookieValues(header, "artist_session"), ["first", "second"])
})

test("matches names exactly and handles missing headers", () => {
  assert.deepEqual(getAllCookieValues("xartist_session=a; artist_session_x=b", "artist_session"), [])
  assert.deepEqual(getAllCookieValues(undefined, "artist_session"), [])
  assert.deepEqual(getAllCookieValues("", "artist_session"), [])
})

test("decodes values and strips quotes; keeps undecodable values as-is", () => {
  assert.deepEqual(getAllCookieValues('a=%7Bx%7D; a="quoted"; a=%E0%A4', "a"), ["{x}", "quoted", "%E0%A4"])
})

test("keeps '=' inside values (base64 padding, token parts)", () => {
  assert.deepEqual(getAllCookieValues("t=abc==.def=", "t"), ["abc==.def="])
})
