export type CourseLearnedService = {
  id: number
  service_name: string
  duration_minutes: number
  price: number
}

export type Course = {
  id: number
  name: string
  duration: string
  fee: number
  description?: string | null
  batch_timing?: string | null
  start_date?: string | null
  max_students?: number | null
  is_active: boolean
  created_at: string
  services?: CourseLearnedService[]
  students_count?: number
  total_collected?: number
  total_pending?: number
}

export type CourseStudent = {
  id: number
  user_id: number
  course_id: number
  name: string
  phone: string
  address: string
  email?: string | null
  total_fee: number
  paid_fee: number
  pending_fee: number
  payment_status: "full_paid" | "partial" | "unpaid"
  enrollment_date: string
  status: "enrolled" | "ongoing" | "completed" | "cancelled"
  certificate_issued: boolean
  notes?: string | null
  created_at: string
  course?: {
    id: number
    name: string
    duration: string
    fee: number
    batch_timing?: string | null
  }
}

export type CourseStats = {
  total_courses: number
  total_students: number
  total_collected: number
  total_pending: number
}

export type CourseFormValues = {
  name: string
  duration: string
  fee: string
  description: string
  batch_timing: string
  start_date: string
  max_students: string
  service_ids: number[]
}

export type StudentFormValues = {
  course_id: string
  name: string
  phone: string
  address: string
  email: string
  total_fee: string
  paid_fee: string
  enrollment_date: string
  status: "enrolled" | "ongoing" | "completed" | "cancelled"
  certificate_issued: boolean
  notes: string
}
