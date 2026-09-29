import { PageHeader } from "@/components/common/dashboard/dashboard-header-context"
import { CourseManager } from "@/components/common/courses/course-manager"

export const metadata = {
  title: "Courses & Academy | ArtistOS",
  description: "Manage workshops, masterclasses, student admissions, and fee collections for your beauty and mehendi academy.",
}

export default function CoursesPage() {
  return (
    <>
      <PageHeader
        title="Courses & Academy"
        description="Manage your training courses, workshops, student admissions, and track installment fees."
      />
      <CourseManager />
    </>
  )
}
