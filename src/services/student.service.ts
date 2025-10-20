import { BaseService } from './base.service'
import { hashPassword } from '@/lib/password'
import { StudentStatus } from '@prisma/client'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'

/**
 * Student service - handles all student-related business logic
 */
export class StudentService extends BaseService {
  /**
   * Get all students for a teacher with pagination
   * @param teacherId - Teacher's user ID (userId → teacherId)
   */
  async getStudentsByTeacher(
    teacherId: string,
    page: number = 1,
    limit: number = 20,
    status?: StudentStatus
  ) {
    const { skip, take } = this.getPaginationParams(page, limit)

    const where: { teacherId: string; status?: StudentStatus } = { teacherId }
    if (status) {
      where.status = status
    }

    const [students, totalCount] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.student.count({
        where
      })
    ])

    return {
      students,
      pagination: this.getPaginationMeta(page, limit, totalCount)
    }
  }

  /**
   * Get a single student by ID
   */
  async getStudentById(studentId: string, teacherId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId }
    })

    if (!student) {
      throw new NotFoundError('Student not found')
    }

    // Verify ownership
    if (student.teacherId !== teacherId) {
      throw new UnauthorizedError('Unauthorized access to student')
    }

    return student
  }

  /**
   * Create a new student
   * Email and password are now required
   */
  async createStudent(
    teacherId: string,
    data: {
      name: string
      email: string      // Now required
      password: string   // Now required
      phone?: string
      parentName?: string
      parentPhone?: string
      notes?: string
      status?: StudentStatus
    }
  ) {
    // Hash password
    const hashedPassword = await hashPassword(data.password)

    return this.prisma.student.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        phone: data.phone || null,
        parentName: data.parentName || null,
        parentPhone: data.parentPhone || null,
        notes: data.notes || null,
        status: data.status || StudentStatus.ACTIVE,
        teacherId
      }
    })
  }

  /**
   * Update a student
   */
  async updateStudent(
    studentId: string,
    teacherId: string,
    data: {
      name?: string
      email?: string
      password?: string
      phone?: string
      parentName?: string
      parentPhone?: string
      notes?: string
      status?: StudentStatus
    }
  ) {
    // Verify ownership
    await this.getStudentById(studentId, teacherId)

    // Hash password if provided
    const hashedPassword = data.password
      ? await hashPassword(data.password)
      : undefined

    // Build update data
    const updateData: {
      name?: string
      email?: string
      phone?: string | null
      parentName?: string | null
      parentPhone?: string | null
      notes?: string | null
      status?: StudentStatus
      password?: string
    } = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.email !== undefined) updateData.email = data.email
    if (data.phone !== undefined) updateData.phone = data.phone || null
    if (data.parentName !== undefined) updateData.parentName = data.parentName || null
    if (data.parentPhone !== undefined) updateData.parentPhone = data.parentPhone || null
    if (data.notes !== undefined) updateData.notes = data.notes || null
    if (data.status !== undefined) updateData.status = data.status
    if (hashedPassword !== undefined) updateData.password = hashedPassword

    return this.prisma.student.update({
      where: { id: studentId },
      data: updateData
    })
  }

  /**
   * Delete a student (soft delete could be implemented later)
   */
  async deleteStudent(studentId: string, teacherId: string) {
    // Verify ownership
    await this.getStudentById(studentId, teacherId)

    return this.prisma.student.delete({
      where: { id: studentId }
    })
  }

  /**
   * Get student with assignments and progress
   */
  async getStudentWithDetails(studentId: string, teacherId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        assignments: {
          include: {
            lessonTopic: {  // topic → lessonTopic
              include: {
                lesson: true
              }
            }
          }
        },
        progress: {
          include: {
            lessonTopic: true,  // topic → lessonTopic
            resource: true
          }
        },
        topicSchedules: {  // NEW: include schedules
          include: {
            studentAssignment: {
              include: {
                lessonTopic: {
                  include: {
                    lesson: true
                  }
                }
              }
            }
          },
          orderBy: { scheduleOrder: 'asc' }
        }
      }
    })

    if (!student) {
      throw new NotFoundError('Student not found')
    }

    // Verify ownership
    if (student.teacherId !== teacherId) {
      throw new UnauthorizedError('Unauthorized access to student')
    }

    return student
  }

  /**
   * Get active students for a teacher
   */
  async getActiveStudents(teacherId: string) {
    return this.prisma.student.findMany({
      where: {
        teacherId,
        status: StudentStatus.ACTIVE
      },
      orderBy: { name: 'asc' }
    })
  }

  /**
   * Update student status
   */
  async updateStudentStatus(
    studentId: string,
    teacherId: string,
    status: StudentStatus
  ) {
    await this.getStudentById(studentId, teacherId)

    return this.prisma.student.update({
      where: { id: studentId },
      data: { status }
    })
  }
}
