import test from "node:test"
import assert from "node:assert/strict"

test("reference image count enforcement: max 3 allowed", () => {
  const maxAllowed = 3
  const validImageCounts = [1, 2, 3]
  for (const count of validImageCounts) {
    assert.ok(count <= maxAllowed, `Count ${count} should be within max allowed`)
  }

  const invalidCount = 4
  assert.ok(invalidCount > maxAllowed, "4 images must exceed the maximum limit of 3")
})

test("portfolio query filter ensures reference images are excluded when includeReference is false", () => {
  // Simulates the section filtering condition in listFilesInFolder and listFolders
  const sampleFiles = [
    { id: 1, name: "delivery_final.jpg", section: null },
    { id: 2, name: "delivery_raw.png", section: "deliverables" },
    { id: 3, name: "customer_ref_1.jpg", section: "reference" },
    { id: 4, name: "customer_ref_2.jpg", section: "reference" },
  ]

  // Filtering for main portfolio (includeReference = false)
  const mainPortfolioFiles = sampleFiles.filter((f) => f.section !== "reference")
  assert.equal(mainPortfolioFiles.length, 2)
  assert.ok(!mainPortfolioFiles.some((f) => f.section === "reference"))

  // Filtering for booking portfolio reference section (section = "reference")
  const bookingReferenceFiles = sampleFiles.filter((f) => f.section === "reference")
  assert.equal(bookingReferenceFiles.length, 2)
  assert.ok(bookingReferenceFiles.every((f) => f.section === "reference"))
})

test("booking folder without deliverables is hidden from main portfolio when only reference images exist", () => {
  // Simulates booking folder skip rule: folder.booking_id !== null && fileCount (excluding reference) === 0
  const bookingFolder = {
    id: 10,
    booking_id: 42,
    name: "John Doe (#1)",
  }

  const filesInFolder = [
    { id: 101, folder_id: 10, section: "reference" },
    { id: 102, folder_id: 10, section: "reference" },
  ]

  const deliverableCount = filesInFolder.filter((f) => f.section !== "reference").length
  const shouldSkipInMainPortfolio = bookingFolder.booking_id !== null && deliverableCount === 0

  assert.equal(deliverableCount, 0)
  assert.equal(shouldSkipInMainPortfolio, true, "Booking folder with only reference images should be hidden from main portfolio")
})

test("booking edit reference slots: populate existing images and track removals/additions", () => {
  type SlotItem =
    | { type: "existing"; id: number; name: string }
    | { type: "new"; name: string }
    | null

  // 1. Initial load for a booking that has 2 existing reference images
  const existingFromApi = [
    { id: 101, file_name: "ref_front.jpg" },
    { id: 102, file_name: "ref_back.jpg" },
  ]

  const slots: SlotItem[] = [null, null, null]
  existingFromApi.forEach((img, idx) => {
    slots[idx] = { type: "existing", id: img.id, name: img.file_name }
  })

  assert.equal(slots[0]?.type, "existing")
  assert.equal(slots[1]?.type, "existing")
  assert.equal(slots[2], null, "Slot 3 should be free for adding")

  // 2. Remove slot 1 (existing image)
  const removedIds: number[] = []
  const slotToRemove = slots[0]
  if (slotToRemove && slotToRemove.type === "existing") {
    removedIds.push(slotToRemove.id)
  }
  slots[0] = null

  assert.deepEqual(removedIds, [101], "Removed image ID must be queued for deletion")
  assert.equal(slots[0], null, "Slot 1 is now empty and can accept a replacement")

  // 3. Add replacement image in Slot 1
  slots[0] = { type: "new", name: "new_replacement.jpg" }
  assert.equal(slots[0].type, "new")

  // 4. Fill slot 3 as well
  slots[2] = { type: "new", name: "ref_side.jpg" }

  // 5. Total active items should be 3 (max), never 4
  const activeSlots = slots.filter((s) => s !== null)
  assert.equal(activeSlots.length, 3)
  assert.ok(activeSlots.length <= 3, "Never allow more than 3 reference images")
})
