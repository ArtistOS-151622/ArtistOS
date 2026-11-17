import * as coursesService from "#src/modules/courses/courses.service.js"
import { portfolioError, sendPortfolio } from "#src/shared/portfolio/response.js"
import { badRequest } from "#src/utils/api-error.js"
import { bodyOf, parsePositiveId, queryParam } from "#src/utils/request.js"

const courseId = (req) => {
  const id = parsePositiveId(req.params.id)
  if (!id) throw badRequest("Invalid course id.")
  return id
}

export async function list(req, res) {
  res.json(await coursesService.listCourses(req.artist.id, { search: queryParam(req, "search")?.trim() || "" }))
}

export async function get(req, res) {
  res.json(await coursesService.getCourse(req.artist.id, courseId(req)))
}

export async function create(req, res) {
  res.status(201).json(await coursesService.createCourse(req.artist.id, bodyOf(req)))
}

export async function update(req, res) {
  const id = courseId(req)
  res.json(await coursesService.updateCourse(req.artist.id, id, bodyOf(req)))
}

export async function remove(req, res) {
  res.json(await coursesService.deleteCourse(req.artist.id, courseId(req)))
}

export async function portfolio(req, res) {
  // Same rule as before: anything numeric passes here; a non-matching id is a 404 below.
  const id = Number(req.params.id)
  if (Number.isNaN(id)) throw portfolioError("Invalid course ID", 400)
  sendPortfolio(res, "Course portfolio loaded", await coursesService.getCoursePortfolio(req.artist.id, id))
}
