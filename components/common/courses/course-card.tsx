"use client"

import { useState } from "react"
import {
  BookOpen,
  Calendar,
  Clock,
  Edit3,
  Flower2,
  GraduationCap,
  MoreVertical,
  Trash2,
  Users,
} from "lucide-react"

import type { Course } from "@/components/common/courses/course-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"

type CourseCardProps = {
  course: Course
  onViewDetails: (course: Course) => void
  onEdit: (course: Course) => void
  onDelete: (course: Course) => void
  onAddStudent: (course: Course) => void
}

export function CourseCard({
  course,
  onViewDetails,
  onEdit,
  onDelete,
  onAddStudent,
}: CourseCardProps) {
  const studentsCount = course.students_count || 0
  const maxSeats = course.max_students || null
  const seatPercentage = maxSeats ? Math.min(100, Math.round((studentsCount / maxSeats) * 100)) : null
  const isFull = maxSeats ? studentsCount >= maxSeats : false

  const [showAllServices, setShowAllServices] = useState(false)
  const allServices = course.services || []
  const INITIAL_LIMIT = 2
  const hasMoreServices = allServices.length > INITIAL_LIMIT
  const displayedServices = showAllServices ? allServices : allServices.slice(0, INITIAL_LIMIT)
  const remainingCount = allServices.length - INITIAL_LIMIT

  return (
    <Card className="group relative overflow-hidden min-w-0 w-full rounded-2xl border-slate-100 bg-white shadow-md shadow-purple-950/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-purple-950/10 flex flex-col justify-between">
      {/* Decorative Watermark Icon */}
      <GraduationCap className="absolute -right-6 -bottom-6 z-0 size-44 text-[#7c3aed]/[0.05] pointer-events-none transition-transform duration-300 group-hover:scale-105" />

      <CardContent className="relative z-10 p-3.5 sm:p-5 flex flex-col h-full justify-between gap-3 sm:gap-4 min-w-0 overflow-hidden">
        {/* Top Header: Badge + Fee + Options Menu */}
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-1.5 sm:gap-2 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
              <Badge className="bg-purple-100 text-[#7c3aed] border-purple-200 hover:bg-purple-100 font-semibold px-2 sm:px-2.5 py-0.5 text-xs sm:text-sm truncate max-w-full">
                <Clock className="size-3 sm:size-3.5 mr-1 shrink-0" />
                <span className="truncate">{course.duration}</span>
              </Badge>
              {course.batch_timing && (
                <Badge variant="outline" className="text-slate-600 border-slate-200 font-medium px-2 sm:px-2.5 py-0.5 text-xs sm:text-sm truncate max-w-full">
                  <span className="truncate">{course.batch_timing}</span>
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-1">
              <span className="font-extrabold text-base sm:text-xl text-slate-900 tracking-tight">
                ₹{course.fee.toLocaleString("en-IN")}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex size-7 sm:size-8 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition outline-none shrink-0">
                  <MoreVertical className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => onViewDetails(course)} className="cursor-pointer">
                    <Users className="size-4 mr-2 text-purple-600" /> View Students
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddStudent(course)} className="cursor-pointer">
                    <GraduationCap className="size-4 mr-2 text-emerald-600" /> Enroll Student
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(course)} className="cursor-pointer">
                    <Edit3 className="size-4 mr-2 text-blue-600" /> Edit Course
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(course)} className="text-rose-600 focus:text-rose-600 cursor-pointer">
                    <Trash2 className="size-4 mr-2" /> Delete Course
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Course Title & Description */}
          <div className="mt-3">
            <h3
              onClick={() => onViewDetails(course)}
              className="text-base sm:text-xl font-bold text-slate-900 group-hover:text-[#7c3aed] transition-colors cursor-pointer line-clamp-1 leading-snug"
            >
              {course.name}
            </h3>
            {course.description ? (
              <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm text-slate-500 line-clamp-2 leading-relaxed">
                {course.description}
              </p>
            ) : (
              <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm text-slate-400 italic">No syllabus description added</p>
            )}
          </div>
        </div>

        {/* Middle Section: Learned Services */}
        {allServices.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 sm:gap-1.5">
                <Flower2 className="size-3 sm:size-3.5 text-purple-500" /> Services Taught
              </span>
              {hasMoreServices && (
                <button
                  type="button"
                  onClick={() => setShowAllServices((prev) => !prev)}
                  className="text-[11px] sm:text-xs font-bold text-[#7c3aed] hover:text-[#6d28d9] transition-colors cursor-pointer"
                >
                  {showAllServices ? "Show less" : `+${remainingCount} more`}
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {displayedServices.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center rounded-md bg-slate-50 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-medium text-slate-700 border border-slate-200/60"
                >
                  {s.service_name}
                </span>
              ))}
              {hasMoreServices && !showAllServices && (
                <button
                  type="button"
                  onClick={() => setShowAllServices(true)}
                  className="inline-flex items-center rounded-md bg-purple-50 hover:bg-purple-100 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold text-[#7c3aed] border border-purple-200 transition-colors cursor-pointer shadow-2xs"
                >
                  +{remainingCount} more
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bottom Section: Seats & Actions */}
        <div className="pt-3 border-t border-slate-100 flex flex-col gap-3">
          {/* Seats Indicator */}
          <div>
            <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5 sm:mb-2">
              <span className="text-slate-600 font-medium flex items-center gap-1 sm:gap-1.5">
                <Users className="size-3.5 sm:size-4 text-purple-600" />
                {studentsCount} {studentsCount === 1 ? "Student" : "Students"}
              </span>
              {maxSeats && (
                <span className={`font-semibold ${isFull ? "text-rose-600" : "text-slate-500"}`}>
                  {isFull ? "Batch Full" : `${studentsCount} / ${maxSeats} seats`}
                </span>
              )}
            </div>
            {seatPercentage !== null && (
              <Progress
                value={seatPercentage}
                className="h-1.5 sm:h-2 bg-slate-100"
              />
            )}
          </div>

          {/* Quick Action Button */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            <Button
              variant="outline"
              onClick={() => onViewDetails(course)}
              className="w-full h-9 sm:h-11 text-xs sm:text-sm font-semibold sm:font-bold rounded-xl sm:rounded-2xl border-slate-200 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 transition-all shadow-xs"
            >
              View Roster
            </Button>
            <Button
              onClick={() => onAddStudent(course)}
              className="w-full h-9 sm:h-11 text-xs sm:text-sm font-semibold sm:font-bold rounded-xl sm:rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-purple-950/10 transition-all"
            >
              + Enroll
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
