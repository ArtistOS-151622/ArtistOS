import * as studentsService from "#src/modules/courses/students/students.service.js"
import { badRequest } from "#src/utils/api-error.js"
import { bodyOf, parsePositiveId, queryParam } from "#src/utils/request.js"

const studentId = (req) => {
  const id = parsePositiveId(req.params.id)
  if (!id) throw badRequest("Invalid student id.")
  return id
}

export async function list(req, res) {
  res.json(
    await studentsService.listStudents(req.artist.id, {
      courseId: queryParam(req, "course_id"),
      status: queryParam(req, "status"),
      paymentStatus: queryParam(req, "payment_status"),
      search: queryParam(req, "search")?.trim() || "",
    })
  )
}

export async function get(req, res) {
  res.json(await studentsService.getStudent(req.artist.id, studentId(req)))
}

export async function create(req, res) {
  res.status(201).json(await studentsService.enrollStudent(req.artist.id, bodyOf(req)))
}

export async function update(req, res) {
  const id = studentId(req)
  res.json(await studentsService.updateStudent(req.artist.id, id, bodyOf(req)))
}

export async function remove(req, res) {
  res.json(await studentsService.deleteStudent(req.artist.id, studentId(req)))
}
