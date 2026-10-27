import { type NextRequest } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import { buildShareUrl, findFolderByCourse, findOrCreateCourseFolder } from "@/lib/portfolio/folders"
import { listFilesInFolder } from "@/lib/portfolio/files"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const courseId = Number((await params).id)
  if (Number.isNaN(courseId)) return portfolioError("Invalid course ID", 400)

  const supabase = await createClient()

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, name")
    .eq("id", courseId)
    .eq("user_id", session.id)
    .maybeSingle()

  if (courseError || !course) return portfolioError("Course not found", 404)

  try {
    const isReadOnly = await checkIsReadOnly(supabase, session.id)
    const folder = isReadOnly
      ? await findFolderByCourse(supabase, session.id, courseId)
      : await findOrCreateCourseFolder(supabase, session.id, courseId, course.name)

    if (!folder) {
      return portfolioSuccess("Course portfolio loaded", {
        folder: null,
        files: [],
      })
    }

    const allFiles = await listFilesInFolder(supabase, session.id, folder.id, null, true)

    const enrichedFolder = {
      ...folder,
      share_url: folder.is_shared ? buildShareUrl(folder.uuid) : null,
      file_count: allFiles.length,
      total_size: allFiles.reduce((sum, f) => sum + Number(f.file_size), 0),
    }

    return portfolioSuccess("Course portfolio loaded", {
      folder: enrichedFolder,
      files: allFiles,
    })
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Failed to load course portfolio", 500)
  }
}
