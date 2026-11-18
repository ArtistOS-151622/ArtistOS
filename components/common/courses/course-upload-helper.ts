import { toast } from "sonner"

import { api, getErrorMessage, isApiError } from "@/lib/api"

/** The upload API answers 402 when the file would exceed the storage quota. */
const QUOTA_EXCEEDED_STATUS = 402

export type UploadProgressState = {
  percentage: number
  message: string
}

export type UploadProgressCallback = (progress: UploadProgressState) => void

/**
 * Uploads course images to /api/portfolio/files/upload with real-time byte-level progress tracking.
 */
export async function uploadCourseImagesWithProgress(
  files: File[],
  courseId: number,
  onProgress: UploadProgressCallback
): Promise<void> {
  if (!files || files.length === 0) return

  const totalBytes = files.reduce((sum, f) => sum + Math.max(1, f.size), 0)
  const loadedPerFile = new Array(files.length).fill(0)

  const updateProgress = () => {
    const totalLoaded = loadedPerFile.reduce((sum, b) => sum + b, 0)
    const fraction = totalBytes > 0 ? totalLoaded / totalBytes : 1
    // Map upload phase between 25% and 92%
    const currentPercent = Math.min(92, Math.round(25 + fraction * 67))
    onProgress({
      percentage: currentPercent,
      message: `Uploading course images (${currentPercent}%)...`,
    })
  }

  onProgress({
    percentage: 25,
    message: `Uploading course ${files.length > 1 ? "images" : "image"} to cloud...`,
  })

  await Promise.all(
    files.map(async (file, index) => {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("course_id", String(courseId))
      formData.append("section", "course")

      try {
        await api.post("/api/portfolio/files/upload", formData, {
          timeout: 0,
          onUploadProgress: (event) => {
            loadedPerFile[index] = event.loaded
            updateProgress()
          },
        })
      } catch (err) {
        if (isApiError(err) && err.status === QUOTA_EXCEEDED_STATUS) {
          toast.error(`Storage quota exceeded: "${file.name}" was not uploaded.`)
        } else if (isApiError(err) && err.status === 0) {
          toast.error(`Network error uploading "${file.name}"`)
        } else {
          toast.error(getErrorMessage(err, `Failed to upload "${file.name}"`))
        }
      } finally {
        loadedPerFile[index] = file.size
        updateProgress()
      }
    })
  )

  onProgress({
    percentage: 98,
    message: "Finalizing course...",
  })

  await new Promise((r) => setTimeout(r, 200))

  onProgress({
    percentage: 100,
    message: "Upload complete!",
  })

  await new Promise((r) => setTimeout(r, 350))
}
