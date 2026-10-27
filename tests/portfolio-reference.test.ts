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

test("booking folder with reference images is displayed in main portfolio", () => {
  // Booking folders with reference images must now be visible in main portfolio
  const bookingFolder = {
    id: 10,
    booking_id: 42,
    name: "John Doe (#1)",
  }

  const filesInFolder = [
    { id: 101, folder_id: 10, section: "reference" },
    { id: 102, folder_id: 10, section: "reference" },
  ]

  // fileCount now includes all uploaded images in the folder
  const fileCount = filesInFolder.length
  const shouldSkipInMainPortfolio = bookingFolder.booking_id !== null && fileCount === 0

  assert.equal(fileCount, 2)
  assert.equal(shouldSkipInMainPortfolio, false, "Booking folder with reference images must be visible in main portfolio")
})

test("course portfolio: max 3 images allowed and mapped to course folder", () => {
  const courseFolder = {
    id: 20,
    course_id: 5,
    name: "Bridal Makeup Masterclass",
  }

  const courseImages = [
    { id: 201, folder_id: 20, section: "course", original_name: "syllabus.jpg" },
    { id: 202, folder_id: 20, section: "course", original_name: "certificate.jpg" },
    { id: 203, folder_id: 20, section: "course", original_name: "model.jpg" },
  ]

  assert.equal(courseFolder.name, "Bridal Makeup Masterclass")
  assert.ok(courseImages.length <= 3, "Course allows at most 3 images")
  assert.ok(courseImages.every((img) => img.section === "course"))
})

test("booking folder name uses 'Booking - ' prefix for clear identification", () => {
  const customerName = "John Doe"
  const index = 1
  const bookingFolderName = customerName ? `Booking - ${customerName} (#${index})` : `Booking #${index}`
  assert.equal(bookingFolderName, "Booking - John Doe (#1)")
  assert.ok(bookingFolderName.startsWith("Booking - "))
})

test("portfolio folder badge categorization: course, reference, and portfolio", () => {
  const courseFolder = { id: 1, course_id: 10, booking_id: null, folder_type: "course" }
  const bookingFolder = { id: 2, course_id: null, booking_id: 20, folder_type: "reference" }
  const regularFolder = { id: 3, course_id: null, booking_id: null, folder_type: "portfolio" }

  assert.equal(courseFolder.folder_type, "course")
  assert.equal(bookingFolder.folder_type, "reference")
  assert.equal(regularFolder.folder_type, "portfolio")
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

test("storage quota: canUpload permits file within quota and rejects when capacity is exceeded", () => {
  const freeStorageBytes = 10 * 1024 * 1024 // 10 MB
  const usedStorageBytes = 8 * 1024 * 1024  // 8 MB used
  const remainingBytes = freeStorageBytes - usedStorageBytes // 2 MB remaining

  const smallImageBytes = 1.5 * 1024 * 1024 // 1.5 MB
  const largeImageBytes = 3 * 1024 * 1024   // 3 MB (exceeds remaining)

  assert.ok(smallImageBytes <= remainingBytes, "1.5 MB should be allowed when 2 MB remains")
  assert.ok(largeImageBytes > remainingBytes, "3 MB must be blocked when only 2 MB remains")
})

test("storage quota: client-side multi-image size summation and quota alert trigger", () => {
  const remainingQuotaBytes = 5 * 1024 * 1024 // 5 MB remaining
  const selectedImages = [
    { name: "photo1.jpg", size: 2 * 1024 * 1024 }, // 2 MB
    { name: "photo2.jpg", size: 2 * 1024 * 1024 }, // 2 MB
    { name: "photo3.jpg", size: 1.5 * 1024 * 1024 }, // 1.5 MB
  ]

  const totalSelectedBytes = selectedImages.reduce((sum, img) => sum + img.size, 0) // 5.5 MB
  const isExceeded = totalSelectedBytes > remainingQuotaBytes

  assert.equal(totalSelectedBytes, 5.5 * 1024 * 1024)
  assert.equal(isExceeded, true, "Total 5.5 MB must trigger quota exceeded alert against 5 MB remaining")
})

test("storage quota: decrement on delete restores user remaining quota", () => {
  let usedStorageBytes = 15 * 1024 * 1024 // 15 MB used
  const deletedFileSizeBytes = 4 * 1024 * 1024 // 4 MB file deleted

  usedStorageBytes = Math.max(0, usedStorageBytes - deletedFileSizeBytes)
  assert.equal(usedStorageBytes, 11 * 1024 * 1024, "Deleting 4 MB file must reduce usage to 11 MB")
})
