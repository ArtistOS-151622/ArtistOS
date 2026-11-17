import "../../helpers/env.js"

import assert from "node:assert/strict"
import { test } from "node:test"

import { sanitizeFilename, validateMagicBytes } from "#src/modules/portfolio/security.js"

test("sanitizeFilename strips paths, control and shell characters, and script extensions", () => {
  assert.equal(sanitizeFilename("../../etc/passwd"), "passwd")
  assert.equal(sanitizeFilename("a\u0000b\u001fc.png"), "abc.png")
  assert.equal(sanitizeFilename('bad<name>:"x|y?*$`.jpg'), "bad_name___x_y____.jpg")
  assert.equal(sanitizeFilename("evil.PHP"), "evil.bin")
  assert.equal(sanitizeFilename("photo.final.jpeg"), "photo.final.jpeg")
  assert.equal(sanitizeFilename("मेहंदी डिज़ाइन.png"), "मेहंदी डिज़ाइन.png")
  assert.match(sanitizeFilename(".."), /^file_\d+$/)
})

test("sanitizeFilename keeps the extension when truncating to 100 characters", () => {
  const name = sanitizeFilename(`${"x".repeat(150)}.webp`)
  assert.equal(name.length, 100)
  assert.ok(name.endsWith(".webp"))
})

test("validateMagicBytes matches signatures to MIME types", () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a])
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0])
  const webp = Buffer.from("RIFF0000WEBPVP8 ", "ascii")
  const heic = Buffer.from("0000ftypheic0000", "ascii")

  assert.equal(validateMagicBytes(png, "image/png"), true)
  assert.equal(validateMagicBytes(png, "image/jpeg"), false)
  assert.equal(validateMagicBytes(jpeg, "IMAGE/JPEG"), true)
  assert.equal(validateMagicBytes(webp, "image/webp"), true)
  assert.equal(validateMagicBytes(heic, "image/heic"), true)
  assert.equal(validateMagicBytes(Buffer.from("%PDF-1.7"), "application/pdf"), true)
  assert.equal(validateMagicBytes(Buffer.from("GIF89a"), "image/gif"), true)
  assert.equal(validateMagicBytes(Buffer.from([1, 2]), "image/png"), false)
  // Unlisted types are allowed through (only spoofable formats are checked).
  assert.equal(validateMagicBytes(Buffer.from("hello world"), "text/plain"), true)
})

test("validateMagicBytes rejects SVGs with scripts or event handlers", () => {
  const ok = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle r="1"/></svg>')
  assert.equal(validateMagicBytes(ok, "image/svg+xml"), true)
  for (const evil of ["<svg><script>alert(1)</script></svg>", '<svg onload="x()"></svg>', '<svg><a href="javascript:x"/></svg>']) {
    assert.equal(validateMagicBytes(Buffer.from(evil), "image/svg+xml"), false)
  }
  assert.equal(validateMagicBytes(Buffer.from("not an svg at all"), "image/svg+xml"), false)
})
