"use client"

import { useEffect, useState } from "react"
import {
  BookOpen,
  CreditCard,
  DollarSign,
  Filter,
  GraduationCap,
  Plus,
  Search,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import type {
  Course,
  CourseFormValues,
  CourseLearnedService,
  CourseStats,
  CourseStudent,
  StudentFormValues,
} from "@/components/common/courses/course-types"
import { CourseCard } from "@/components/common/courses/course-card"
import { CourseForm } from "@/components/common/courses/course-form"
import { CourseDetailDrawer } from "@/components/common/courses/course-detail-drawer"
import { StudentCard } from "@/components/common/courses/student-card"
import { StudentForm } from "@/components/common/courses/student-form"
import { StudentPaymentModal } from "@/components/common/courses/student-payment-modal"
import { AppModal } from "@/components/common/shared/app-modal"
import { ConfirmDialog } from "@/components/common/shared/confirm-dialog"
import { SkeletonCard } from "@/components/common/shared/skeleton-card"
import { HeaderPortal } from "@/components/common/dashboard/dashboard-header-context"
import { useGuardContext } from "@/components/common/subscription/subscription-guard-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function CourseManager() {
  const { isReadOnly } = useGuardContext()

  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<CourseStudent[]>([])
  const [services, setServices] = useState<CourseLearnedService[]>([])
  const [stats, setStats] = useState<CourseStats>({
    total_courses: 0,
    total_students: 0,
    total_collected: 0,
    total_pending: 0,
  })

  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState("")

  // Active Tab: 'courses' | 'students'
  const [activeTab, setActiveTab] = useState<string>("courses")

  // Search & Filter state
  const [search, setSearch] = useState("")
  const [courseFilter, setCourseFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")

  // Modals state
  const [courseModalOpen, setCourseModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null)

  const [studentModalOpen, setStudentModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<CourseStudent | null>(null)
  const [deletingStudent, setDeletingStudent] = useState<CourseStudent | null>(null)
  const [paymentStudent, setPaymentStudent] = useState<CourseStudent | null>(null)
  const [preselectedCourse, setPreselectedCourse] = useState<Course | null>(null)

  const [selectedCourseDetail, setSelectedCourseDetail] = useState<Course | null>(null)

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true)
      const [coursesRes, studentsRes, servicesRes] = await Promise.all([
        fetch("/api/courses"),
        fetch("/api/courses/students"),
        fetch("/api/services"),
      ])

      const coursesData = await coursesRes.json()
      const studentsData = await studentsRes.json()
      const servicesData = await servicesRes.json()

      if (coursesData.courses) setCourses(coursesData.courses)
      if (coursesData.stats) setStats(coursesData.stats)
      if (studentsData.students) setStudents(studentsData.students)
      if (servicesData.services) setServices(servicesData.services)
    } catch (err: any) {
      setError(err?.message || "Failed to load courses data.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 1. Course Handlers
  const handleSaveCourse = async (values: CourseFormValues) => {
    if (isReadOnly) {
      toast.error("Your subscription has expired. Please upgrade to manage courses.")
      return
    }

    setFormLoading(true)
    try {
      const url = editingCourse ? `/api/courses/${editingCourse.id}` : "/api/courses"
      const method = editingCourse ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          fee: Number(values.fee),
          max_students: values.max_students ? Number(values.max_students) : null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save course.")

      toast.success(editingCourse ? "Course updated successfully." : "Course created successfully.")
      setCourseModalOpen(false)
      setEditingCourse(null)
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || "Failed to save course.")
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteCourse = async () => {
    if (!deletingCourse) return
    if (isReadOnly) {
      toast.error("Your subscription has expired. Please upgrade to delete courses.")
      return
    }

    setFormLoading(true)
    try {
      const res = await fetch(`/api/courses/${deletingCourse.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete course.")

      toast.success("Course deleted successfully.")
      setDeletingCourse(null)
      if (selectedCourseDetail?.id === deletingCourse.id) {
        setSelectedCourseDetail(null)
      }
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete course.")
    } finally {
      setFormLoading(false)
    }
  }

  // 2. Student Handlers
  const handleSaveStudent = async (values: StudentFormValues) => {
    if (isReadOnly) {
      toast.error("Your subscription has expired. Please upgrade to enroll students.")
      return
    }

    setFormLoading(true)
    try {
      const url = editingStudent ? `/api/courses/students/${editingStudent.id}` : "/api/courses/students"
      const method = editingStudent ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          course_id: Number(values.course_id),
          total_fee: Number(values.total_fee),
          paid_fee: Number(values.paid_fee),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save student.")

      toast.success(editingStudent ? "Student record updated." : "Student enrolled successfully.")
      setStudentModalOpen(false)
      setEditingStudent(null)
      setPreselectedCourse(null)
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || "Failed to save student.")
    } finally {
      setFormLoading(false)
    }
  }

  const handleRecordPayment = async (studentId: number, addAmount: number) => {
    if (isReadOnly) {
      toast.error("Your subscription has expired. Please upgrade to record payments.")
      return
    }

    setFormLoading(true)
    try {
      const res = await fetch(`/api/courses/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ add_payment: addAmount }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to record installment payment.")

      toast.success("Payment recorded successfully.")
      setPaymentStudent(null)
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || "Failed to record payment.")
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteStudent = async () => {
    if (!deletingStudent) return
    if (isReadOnly) {
      toast.error("Your subscription has expired. Please upgrade to manage students.")
      return
    }

    setFormLoading(true)
    try {
      const res = await fetch(`/api/courses/students/${deletingStudent.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete student record.")

      toast.success("Student removed successfully.")
      setDeletingStudent(null)
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete student.")
    } finally {
      setFormLoading(false)
    }
  }

  // Filtered lists
  const filteredCourses = courses.filter((c) => {
    if (!search.trim()) return true
    return c.name.toLowerCase().includes(search.toLowerCase())
  })

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search) ||
      (s.course?.name || "").toLowerCase().includes(search.toLowerCase())

    const matchesCourse = courseFilter === "all" || String(s.course_id) === courseFilter
    const matchesPayment = paymentFilter === "all" || s.payment_status === paymentFilter

    return matchesSearch && matchesCourse && matchesPayment
  })

  return (
    <div className="w-full max-w-full min-w-0 space-y-3.5 sm:space-y-5 overflow-x-hidden">
      {/* Topbar Actions Portal */}
      <HeaderPortal
        actions={
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <Button
              variant="outline"
              onClick={() => {
                if (isReadOnly) {
                  toast.error("Your subscription has expired. Please upgrade to enroll students.")
                  return
                }
                setEditingStudent(null)
                setPreselectedCourse(null)
                setStudentModalOpen(true)
              }}
              disabled={courses.length === 0}
              className="h-9 sm:h-11 rounded-xl sm:rounded-2xl border-slate-200 bg-white/80 hover:bg-white text-slate-800 shadow-sm text-xs sm:text-sm font-bold px-2.5 sm:px-4 transition-all"
            >
              <Users className="size-3.5 sm:size-4 mr-1 sm:mr-2 text-[#7c3aed]" />
              <span className="hidden xs:inline">Enroll </span>Student
            </Button>

            <Button
              onClick={() => {
                if (isReadOnly) {
                  toast.error("Your subscription has expired. Please upgrade to create courses.")
                  return
                }
                setEditingCourse(null)
                setCourseModalOpen(true)
              }}
              className="h-9 sm:h-11 rounded-xl sm:rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-purple-950/10 text-xs sm:text-sm font-bold px-3 sm:px-5 transition-all"
            >
              <Plus className="size-3.5 sm:size-4 mr-1 sm:mr-1.5" /> New Course
            </Button>
          </div>
        }
      />

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3.5 lg:grid-cols-4 w-full min-w-0">
        <div className="rounded-2xl border border-white/80 bg-white/85 p-2.5 sm:p-4 shadow-sm backdrop-blur-md flex items-center justify-between min-w-0 overflow-hidden">
          <div className="min-w-0 flex-1 mr-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">Total Courses</span>
            <span className="text-base sm:text-2xl font-black text-slate-900 mt-0.5 block truncate">{stats.total_courses}</span>
          </div>
          <div className="size-8 sm:size-10 rounded-xl bg-purple-100 text-[#7c3aed] flex items-center justify-center font-bold shrink-0">
            <BookOpen className="size-4 sm:size-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/85 p-2.5 sm:p-4 shadow-sm backdrop-blur-md flex items-center justify-between min-w-0 overflow-hidden">
          <div className="min-w-0 flex-1 mr-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">Active Students</span>
            <span className="text-base sm:text-2xl font-black text-slate-900 mt-0.5 block truncate">{stats.total_students}</span>
          </div>
          <div className="size-8 sm:size-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <GraduationCap className="size-4 sm:size-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/85 p-2.5 sm:p-4 shadow-sm backdrop-blur-md flex items-center justify-between min-w-0 overflow-hidden">
          <div className="min-w-0 flex-1 mr-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">Fees Collected</span>
            <span className="text-base sm:text-2xl font-black text-emerald-700 mt-0.5 block truncate">
              ₹{stats.total_collected.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="size-8 sm:size-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <DollarSign className="size-4 sm:size-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/85 p-2.5 sm:p-4 shadow-sm backdrop-blur-md flex items-center justify-between min-w-0 overflow-hidden">
          <div className="min-w-0 flex-1 mr-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">Pending Due</span>
            <span className="text-base sm:text-2xl font-black text-amber-700 mt-0.5 block truncate">
              ₹{stats.total_pending.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="size-8 sm:size-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <CreditCard className="size-4 sm:size-5" />
          </div>
        </div>
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0">
        {/* Top Control Bar: Tabs + Search & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4 bg-white/70 p-2 sm:p-3 rounded-2xl sm:rounded-3xl border border-white/80 backdrop-blur-md shadow-sm w-full min-w-0">
          {/* Tabs Switcher */}
          <TabsList className="bg-slate-100/90 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl w-full sm:w-auto grid grid-cols-2 sm:inline-flex shrink-0 h-auto sm:h-13 items-center">
            <TabsTrigger
              value="courses"
              className="rounded-lg sm:rounded-xl text-xs sm:text-base font-extrabold data-[state=active]:bg-white data-[state=active]:text-[#7c3aed] data-[state=active]:shadow-md py-1.5 sm:py-2.5 px-3 sm:px-6 transition-all sm:h-10 inline-flex items-center justify-center gap-1.5 sm:gap-2.5 cursor-pointer"
            >
              <BookOpen className="size-4 sm:size-5 text-[#7c3aed]" /> Courses ({courses.length})
            </TabsTrigger>
            <TabsTrigger
              value="students"
              className="rounded-lg sm:rounded-xl text-xs sm:text-base font-extrabold data-[state=active]:bg-white data-[state=active]:text-[#7c3aed] data-[state=active]:shadow-md py-1.5 sm:py-2.5 px-3 sm:px-6 transition-all sm:h-10 inline-flex items-center justify-center gap-1.5 sm:gap-2.5 cursor-pointer"
            >
              <Users className="size-4 sm:size-5 text-[#7c3aed]" /> Students ({students.length})
            </TabsTrigger>
          </TabsList>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full flex-1 sm:max-w-lg min-w-0">
            <div className="relative flex-1 min-w-[140px]">
              <Search className="pointer-events-none absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 size-4 sm:size-4.5 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  activeTab === "courses" ? "Search courses..." : "Search student..."
                }
                className="pl-9 sm:pl-10 h-9 sm:h-12 rounded-xl sm:rounded-2xl border-slate-200 bg-white text-xs sm:text-sm focus-visible:ring-purple-500 w-full shadow-sm"
              />
            </div>

            {/* In Students Tab: Extra Filters */}
            {activeTab === "students" && (
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                {/* Course Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center gap-1.5 h-9 sm:h-12 rounded-xl sm:rounded-2xl border border-slate-200 bg-white px-2.5 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700 outline-none hover:bg-slate-50 transition max-w-[130px] sm:max-w-[190px] shadow-sm">
                    <Filter className="size-3.5 sm:size-4 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {courseFilter === "all"
                        ? "All Courses"
                        : courses.find((c) => String(c.id) === courseFilter)?.name || "Course"}
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuRadioGroup value={courseFilter} onValueChange={setCourseFilter}>
                      <DropdownMenuRadioItem value="all">All Courses</DropdownMenuRadioItem>
                      {courses.map((c) => (
                        <DropdownMenuRadioItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Payment Status Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center gap-1.5 h-9 sm:h-12 rounded-xl sm:rounded-2xl border border-slate-200 bg-white px-2.5 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700 outline-none hover:bg-slate-50 transition shadow-sm">
                    <span>
                      {paymentFilter === "all"
                        ? "All Fees"
                        : paymentFilter === "full_paid"
                        ? "Paid"
                        : paymentFilter === "partial"
                        ? "Partial"
                        : "Unpaid"}
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuRadioGroup value={paymentFilter} onValueChange={setPaymentFilter}>
                      <DropdownMenuRadioItem value="all">All Payment Statuses</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="full_paid">Fully Paid</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="partial">Partial Due</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="unpaid">Unpaid</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>

        {/* Tab 1: Courses Content */}
        <TabsContent value="courses" className="mt-4 w-full min-w-0">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 w-full min-w-0">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-10 text-center flex flex-col items-center justify-center">
              <div className="size-16 rounded-2xl bg-purple-50 text-[#7c3aed] flex items-center justify-center mb-3">
                <BookOpen className="size-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No courses found</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                {search ? "No courses match your search criteria." : "Create your first workshop or academy course to start enrolling students!"}
              </p>
              <Button
                onClick={() => {
                  if (isReadOnly) {
                    toast.error("Your subscription has expired. Please upgrade to create courses.")
                    return
                  }
                  setEditingCourse(null)
                  setCourseModalOpen(true)
                }}
                className="rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-sm text-xs font-bold"
              >
                <Plus className="size-3.5 mr-1" /> Create First Course
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 w-full min-w-0">
              {filteredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onViewDetails={(c) => setSelectedCourseDetail(c)}
                  onEdit={(c) => {
                    if (isReadOnly) {
                      toast.error("Your subscription has expired. Please upgrade to edit courses.")
                      return
                    }
                    setEditingCourse(c)
                    setCourseModalOpen(true)
                  }}
                  onDelete={(c) => {
                    if (isReadOnly) {
                      toast.error("Your subscription has expired. Please upgrade to delete courses.")
                      return
                    }
                    setDeletingCourse(c)
                  }}
                  onAddStudent={(c) => {
                    if (isReadOnly) {
                      toast.error("Your subscription has expired. Please upgrade to enroll students.")
                      return
                    }
                    setEditingStudent(null)
                    setPreselectedCourse(c)
                    setStudentModalOpen(true)
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Students Content */}
        <TabsContent value="students" className="mt-4 w-full min-w-0">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 w-full min-w-0">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-10 text-center flex flex-col items-center justify-center">
              <div className="size-16 rounded-2xl bg-purple-50 text-[#7c3aed] flex items-center justify-center mb-3">
                <Users className="size-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No students found</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                {search || courseFilter !== "all" || paymentFilter !== "all"
                  ? "Try changing your search or filter options."
                  : "Enroll your first student into a course to track their admission and fees!"}
              </p>
              {courses.length > 0 && (
                <Button
                  onClick={() => {
                    if (isReadOnly) {
                      toast.error("Your subscription has expired. Please upgrade to enroll students.")
                      return
                    }
                    setEditingStudent(null)
                    setPreselectedCourse(null)
                    setStudentModalOpen(true)
                  }}
                  className="rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-sm text-xs font-bold"
                >
                  <Plus className="size-3.5 mr-1" /> Enroll Student
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 w-full min-w-0">
              {filteredStudents.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  onEdit={(st) => {
                    if (isReadOnly) {
                      toast.error("Your subscription has expired. Please upgrade to edit student records.")
                      return
                    }
                    setEditingStudent(st)
                    setStudentModalOpen(true)
                  }}
                  onDelete={(st) => {
                    if (isReadOnly) {
                      toast.error("Your subscription has expired. Please upgrade to delete student records.")
                      return
                    }
                    setDeletingStudent(st)
                  }}
                  onAddPayment={(st) => {
                    if (isReadOnly) {
                      toast.error("Your subscription has expired. Please upgrade to record payments.")
                      return
                    }
                    setPaymentStudent(st)
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal: Course Add / Edit */}
      <AppModal
        open={courseModalOpen}
        onClose={() => {
          setCourseModalOpen(false)
          setEditingCourse(null)
        }}
        title={editingCourse ? "Edit Course" : "Create New Course"}
      >
        <CourseForm
          initialData={editingCourse}
          availableServices={services}
          onSubmit={handleSaveCourse}
          onCancel={() => {
            setCourseModalOpen(false)
            setEditingCourse(null)
          }}
          loading={formLoading}
        />
      </AppModal>

      {/* Modal: Student Add / Edit */}
      <AppModal
        open={studentModalOpen}
        onClose={() => {
          setStudentModalOpen(false)
          setEditingStudent(null)
          setPreselectedCourse(null)
        }}
        title={editingStudent ? "Edit Student Record" : "Enroll Student"}
      >
        <StudentForm
          initialData={editingStudent}
          courses={courses}
          preselectedCourseId={preselectedCourse?.id || null}
          onSubmit={handleSaveStudent}
          onCancel={() => {
            setStudentModalOpen(false)
            setEditingStudent(null)
            setPreselectedCourse(null)
          }}
          loading={formLoading}
        />
      </AppModal>

      {/* Modal: Log Payment Installment */}
      <AppModal
        open={!!paymentStudent}
        onClose={() => setPaymentStudent(null)}
        title="Record Installment Payment"
      >
        {paymentStudent && (
          <StudentPaymentModal
            student={paymentStudent}
            onSavePayment={handleRecordPayment}
            onCancel={() => setPaymentStudent(null)}
            loading={formLoading}
          />
        )}
      </AppModal>

      {/* Drawer: Course Detail & Dedicated Student Roster */}
      <CourseDetailDrawer
        course={selectedCourseDetail}
        students={students}
        open={!!selectedCourseDetail}
        onClose={() => setSelectedCourseDetail(null)}
        onAddStudent={(c) => {
          if (isReadOnly) {
            toast.error("Your subscription has expired. Please upgrade to enroll students.")
            return
          }
          setSelectedCourseDetail(null)
          setEditingStudent(null)
          setPreselectedCourse(c)
          setStudentModalOpen(true)
        }}
        onEditStudent={(st) => {
          if (isReadOnly) {
            toast.error("Your subscription has expired. Please upgrade to edit student records.")
            return
          }
          setSelectedCourseDetail(null)
          setEditingStudent(st)
          setStudentModalOpen(true)
        }}
        onAddPayment={(st) => {
          if (isReadOnly) {
            toast.error("Your subscription has expired. Please upgrade to record payments.")
            return
          }
          setSelectedCourseDetail(null)
          setPaymentStudent(st)
        }}
        onDeleteStudent={(st) => {
          if (isReadOnly) {
            toast.error("Your subscription has expired. Please upgrade to delete student records.")
            return
          }
          setSelectedCourseDetail(null)
          setDeletingStudent(st)
        }}
      />

      {/* Dialog: Delete Course Confirm */}
      <ConfirmDialog
        open={!!deletingCourse}
        onCancel={() => setDeletingCourse(null)}
        title="Delete Course?"
        description={`Are you sure you want to delete "${deletingCourse?.name}"? All enrolled student records under this course will also be removed.`}
        onConfirm={handleDeleteCourse}
      />

      {/* Dialog: Delete Student Confirm */}
      <ConfirmDialog
        open={!!deletingStudent}
        onCancel={() => setDeletingStudent(null)}
        title="Delete Student Record?"
        description={`Are you sure you want to remove "${deletingStudent?.name}" from this course?`}
        onConfirm={handleDeleteStudent}
      />
    </div>
  )
}
