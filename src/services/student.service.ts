import { BaseService } from './base.service'
import { hashPassword } from '@/lib/password'

/**
 * Student service - handles all student-related business logic
 */
export class StudentService extends BaseService {
  /**
   * Get all students for a user with pagination
   */
  async getStudentsByUser(
    userId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const { skip, take } = this.getPaginationParams(page, limit)

    const [students, totalCount] = await Promise.all([
      this.prisma.student.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.student.count({
        where: { userId }
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
  async getStudentById(studentId: string, userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId }
    })

    // Verify ownership
    if (student && student.userId !== userId) {
      throw new Error('Unauthorized access to student')
    }

    return student
  }

  /**
   * Create a new student
   */
  async createStudent(
    userId: string,
    data: {
      name: string
      email?: string
      password?: string
      phone?: string
      parentName?: string
      parentPhone?: string
      notes?: string
    }
  ) {
    // Validate email/password requirement
    if (data.email && !data.password) {
      throw new Error('E-posta belirtildiğinde şifre de zorunludur')
    }

    // Hash password if provided
    const hashedPassword = data.password
      ? await hashPassword(data.password)
      : null

    return this.prisma.student.create({
      data: {
        name: data.name,
        email: data.email || null,
        password: hashedPassword,
        phone: data.phone || null,
        parentName: data.parentName || null,
        parentPhone: data.parentPhone || null,
        notes: data.notes || null,
        userId
      }
    })
  }

  /**
   * Update a student
   */
  async updateStudent(
    studentId: string,
    userId: string,
    data: {
      name?: string
      email?: string
      password?: string
      phone?: string
      parentName?: string
      parentPhone?: string
      notes?: string
    }
  ) {
    // Verify ownership
    await this.getStudentById(studentId, userId)

    // Handle email/password validation
    if (data.email && !data.password) {
      const existingStudent = await this.prisma.student.findUnique({
        where: { id: studentId },
        select: { password: true }
      })

      if (!existingStudent?.password) {
        throw new Error('E-posta belirtildiğinde şifre de zorunludur')
      }
    }

    // Hash password if provided
    const hashedPassword = data.password
      ? await hashPassword(data.password)
      : undefined

    // Build update data
    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.email !== undefined) updateData.email = data.email || null
    if (data.phone !== undefined) updateData.phone = data.phone || null
    if (data.parentName !== undefined) updateData.parentName = data.parentName || null
    if (data.parentPhone !== undefined) updateData.parentPhone = data.parentPhone || null
    if (data.notes !== undefined) updateData.notes = data.notes || null
    if (hashedPassword !== undefined) updateData.password = hashedPassword

    return this.prisma.student.update({
      where: { id: studentId },
      data: updateData
    })
  }

  /**
   * Delete a student
   */
  async deleteStudent(studentId: string, userId: string) {
    // Verify ownership
    await this.getStudentById(studentId, userId)

    return this.prisma.student.delete({
      where: { id: studentId }
    })
  }

  /**
   * Get student with assignments and progress
   */
  async getStudentWithDetails(studentId: string, userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        assignments: {
          include: {
            topic: {
              include: {
                lesson: true
              }
            }
          }
        },
        progress: {
          include: {
            topic: true,
            resource: true
          }
        }
      }
    })

    // Verify ownership
    if (student && student.userId !== userId) {
      throw new Error('Unauthorized access to student')
    }

    return student
  }
}
