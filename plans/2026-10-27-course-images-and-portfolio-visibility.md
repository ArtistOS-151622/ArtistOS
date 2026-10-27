# Implementation Plan: Course Images & Portfolio Visibility for Booking & Course Photos

**Date:** 2026-10-27  
**Goal:** 
1. Allow uploading up to 3 images during Course creation and editing (matching the existing 3-slot UI/UX from Booking creation).
2. Automatically create and sync a Portfolio folder named after the Course, containing all uploaded course images.
3. Fix portfolio folder visibility so that Booking folders and their reference images are displayed on the main Portfolio page and in folder previews.

---

## 1. Problem Analysis & Root Cause

### A. Why Booking Images Are Not Displaying in Portfolio
In [`lib/portfolio/folders.ts`](file:///home/priyank/Desktop/artistos/lib/portfolio/folders.ts):
1. **File Counting Excludes Reference Images**:
   ```typescript
   // Line 167 in lib/portfolio/folders.ts:
   .eq("folder_id", folder.id)
   .neq("section", "reference") // <-- Reference images are excluded from count!
   ```
2. **Booking Folders Skipped When File Count is 0**:
   ```typescript
   // Line 181-183 in lib/portfolio/folders.ts:
   if (folder.booking_id !== null && fileCount === 0) {
     continue; // <-- Skips folder if it only has reference images!
   }
   ```
3. **Folder Preview Grid Excludes Reference Images**:
   ```typescript
   // Line 211 in lib/portfolio/folders.ts:
   .neq("section", "reference") // <-- 2x2 folder card preview thumbnail excludes reference images!
   ```
Because of these three filters, when an artist uploads 1–3 reference images during booking creation, the booking folder has `fileCount = 0` (excluding reference), gets skipped from the folders list, and is completely hidden from the Portfolio page.

### B. Course Images Requirement
- During course creation (and editing), artists should be able to upload up to 3 photos (course banners, student work examples, certificate samples, or workshop flyers).
- A corresponding folder in Portfolio should automatically be created (named with the Course Name) containing these photos.
- If the course name is updated, the portfolio folder name should automatically stay in sync.
- Photos count towards the artist's storage quota with full real-time byte progress, thumbnail preview, zoom modal, and storage meter checks.

---

## 2. Technical Architecture & Schema Changes

### A. Database Schema (`portfolio_folders`)
Extend `portfolio_folders` table to support course association:
```sql
ALTER TABLE public.portfolio_folders 
ADD COLUMN IF NOT EXISTS course_id bigint REFERENCES public.courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS portfolio_folders_user_course_idx 
ON public.portfolio_folders (user_id, course_id) WHERE course_id IS NOT NULL;
```
Update `supabase/migrations/20240101000006_create_portfolio_schema.sql` to include `course_id`.

---

## 3. Detailed Component & Backend Changes

### Step 1: Portfolio Folder Visibility Fix ([`lib/portfolio/folders.ts`](file:///home/priyank/Desktop/artistos/lib/portfolio/folders.ts))
1. **Include All Images in `file_count`**:
   Remove `.neq("section", "reference")` from `count` query in `listFolders`. All uploaded files (deliverables and reference photos) count towards the folder's file count.
2. **Remove Booking Folder Skip Filter**:
   Remove `if (folder.booking_id !== null && fileCount === 0) continue` so booking folders with reference images are visible.
3. **Include Images in 2x2 Preview**:
   Remove `.neq("section", "reference")` from `previewData` query in `listFolders` so booking and course photos appear in the folder card icon preview.
4. **Update Automated Tests** ([`tests/portfolio-reference.test.ts`](file:///home/priyank/Desktop/artistos/tests/portfolio-reference.test.ts)):
   Update tests to assert that folders containing reference images are visible and previewed.

---

### Step 2: Course Portfolio Folder Helper ([`lib/portfolio/folders.ts`](file:///home/priyank/Desktop/artistos/lib/portfolio/folders.ts))
Implement `findOrCreateCourseFolder`:
```typescript
export async function findOrCreateCourseFolder(
  supabase: SupabaseClient,
  userId: number,
  courseId: number,
  courseName: string
): Promise<PortfolioFolderRow> {
  // 1. Look for existing folder linked by course_id
  const { data: existingByCourse } = await supabase
    .from("portfolio_folders")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (existingByCourse) {
    // If course was renamed, update folder name
    if (existingByCourse.name !== courseName) {
      await supabase
        .from("portfolio_folders")
        .update({ name: courseName })
        .eq("id", existingByCourse.id);
      existingByCourse.name = courseName;
    }
    return existingByCourse;
  }

  // 2. Look for existing folder by course name
  const existingByName = await findFolderByName(supabase, userId, courseName);
  if (existingByName) {
    await supabase
      .from("portfolio_folders")
      .update({ course_id: courseId })
      .eq("id", existingByName.id);
    return { ...existingByName, course_id: courseId };
  }

  // 3. Create new course folder
  const { data, error } = await supabase
    .from("portfolio_folders")
    .insert({
      user_id: userId,
      course_id: courseId,
      name: courseName,
      created_by: userId,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const retry = await findFolderByName(supabase, userId, courseName);
      if (retry) return retry;
    }
    throw new Error(error.message);
  }

  return data as PortfolioFolderRow;
}
```

---

### Step 3: Upload API Route ([`app/api/portfolio/files/upload/route.ts`](file:///home/priyank/Desktop/artistos/app/api/portfolio/files/upload/route.ts))
1. Accept `course_id` from `formData`.
2. Verify course ownership:
   ```typescript
   if (courseId) {
     const { data: courseCheck } = await supabase
       .from("courses")
       .select("id, name")
       .eq("id", courseId)
       .eq("user_id", session.id)
       .maybeSingle();

     if (!courseCheck) return portfolioError("Course not found or access denied", 403);

     if (!folderId) {
       const folder = await findOrCreateCourseFolder(supabase, session.id, courseId, courseCheck.name);
       folderId = folder.id;
     }
   }
   ```
3. Allow section `"course"` or reuse `"reference"` / default for course images.

---

### Step 4: Course Portfolio API Route ([`app/api/courses/[id]/portfolio/route.ts`](file:///home/priyank/Desktop/artistos/app/api/courses/[id]/portfolio/route.ts))
Create a dedicated route for fetching course portfolio folder & images (mirroring [`app/api/bookings/[id]/portfolio/route.ts`](file:///home/priyank/Desktop/artistos/app/api/bookings/[id]/portfolio/route.ts)):
- **GET**: Returns `{ folder, files }` for the course.
- In `PATCH /api/courses/[id]`:
  If course `name` is updated, sync `portfolio_folders.name`.

---

### Step 5: Shared Upload Helper ([`components/common/courses/course-upload-helper.ts`](file:///home/priyank/Desktop/artistos/components/common/courses/course-upload-helper.ts))
Create `uploadCourseImagesWithProgress` (or general `uploadImagesWithProgress`) using XHR for byte-level progress reporting:
- Uploads up to 3 image files to `/api/portfolio/files/upload` with `course_id`.
- Emits progress percentages (25% to 100%) and error handling with toast notifications.

---

### Step 6: Course Form UI ([`components/common/courses/course-form.tsx`](file:///home/priyank/Desktop/artistos/components/common/courses/course-form.tsx))
1. Add **3-slot Image Upload Section**:
   - 3 slots (same UI design as [`booking-form.tsx`](file:///home/priyank/Desktop/artistos/components/common/bookings/booking-form.tsx)):
     - Click or drag-and-drop to select image.
     - Thumbnail preview with aspect-ratio preservation.
     - Zoom modal on click to inspect full image.
     - Remove button on each slot.
   - Storage quota chip: shows remaining free quota.
   - Quota exceeded alert banner with option to upgrade storage.
2. In Edit mode:
   - Load existing course images from `/api/courses/[id]/portfolio`.
   - Track new files to upload vs removed file IDs to delete.
3. Pass `images: File[]` and `removed_image_ids: number[]` in `onSubmit`.

---

### Step 7: Course Manager & Display Polish ([`components/common/courses/course-manager.tsx`](file:///home/priyank/Desktop/artistos/components/common/courses/course-manager.tsx))
1. In `course-manager.tsx`:
   - When creating course:
     1. `POST /api/courses` -> returns `course.id`.
     2. Upload new images with progress modal/bar using `uploadCourseImagesWithProgress`.
     3. Delete removed image IDs if editing.
2. In `CourseDetailDrawer` ([`components/common/courses/course-detail-drawer.tsx`](file:///home/priyank/Desktop/artistos/components/common/courses/course-detail-drawer.tsx)):
   - Display the course images grid/carousel with zoom preview.
3. In `CourseCard` ([`components/common/courses/course-card.tsx`](file:///home/priyank/Desktop/artistos/components/common/courses/course-card.tsx)):
   - Display course image thumbnail or preview if available.

---

## 4. Verification & Testing Checklist

1. **Portfolio Page Visibility**:
   - Create booking with 1–3 reference images -> Verify booking folder appears on `/portfolio` with preview thumbnails.
   - Open booking folder on `/portfolio/[uuid]` -> Verify all images load, zoom, and download.
2. **Course Creation with Images**:
   - Create course with 1–3 images -> Verify upload progress bar displays smoothly.
   - Verify course appears in `/courses`.
   - Go to `/portfolio` -> Verify a new folder named after the course is visible with images.
3. **Course Editing**:
   - Edit course -> Add 1 image, remove 1 image, change course name.
   - Verify portfolio folder is renamed and images updated in both Course details and Portfolio folder.
4. **Storage Quota Enforcement**:
   - Test storage meter prevents upload if image size exceeds remaining quota.
5. **Automated Tests & Production Build**:
   - Run `pnpm test` -> 100% tests pass.
   - Run `pnpm build` -> Compiles with 0 TypeScript/Next.js errors.
