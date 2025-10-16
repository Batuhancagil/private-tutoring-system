import { z } from 'zod'

/**
 * Validation schemas for API request bodies
 * Using Zod for runtime type checking and validation
 */

// Student validation schemas
export const createStudentSchema = z.object({
  name: z.string().min(2, 'İsim en az 2 karakter olmalıdır').max(100, 'İsim en fazla 100 karakter olabilir'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz').optional().or(z.literal('')),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Geçerli bir telefon numarası giriniz').optional().or(z.literal('')),
  parentName: z.string().max(100, 'Veli adı en fazla 100 karakter olabilir').optional().or(z.literal('')),
  parentPhone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Geçerli bir telefon numarası giriniz').optional().or(z.literal('')),
  notes: z.string().max(1000, 'Notlar en fazla 1000 karakter olabilir').optional().or(z.literal('')),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır').optional().or(z.literal(''))
})

export const updateStudentSchema = createStudentSchema.partial()

// Lesson validation schemas
export const createLessonSchema = z.object({
  name: z.string().min(2, 'Ders adı en az 2 karakter olmalıdır').max(100, 'Ders adı en fazla 100 karakter olabilir'),
  group: z.string().min(1, 'Ders grubu zorunludur').max(50, 'Ders grubu en fazla 50 karakter olabilir'),
  type: z.enum(['TYT', 'AYT']).default('TYT'),
  subject: z.string().max(100, 'Konu en fazla 100 karakter olabilir').optional().or(z.literal('')),
  color: z.enum(['blue', 'purple', 'green', 'emerald', 'orange', 'red', 'gray']).default('blue')
})

export const updateLessonSchema = createLessonSchema.partial()

// Topic validation schemas
export const createTopicSchema = z.object({
  name: z.string().min(2, 'Konu adı en az 2 karakter olmalıdır').max(200, 'Konu adı en fazla 200 karakter olabilir'),
  order: z.number().int('Sıra tam sayı olmalıdır').min(1, 'Sıra 1 den küçük olamaz'),
  lessonId: z.string().cuid('Geçersiz ders ID')
})

export const updateTopicSchema = createTopicSchema.partial()

// Resource validation schemas
export const createResourceSchema = z.object({
  name: z.string().min(2, 'Kaynak adı en az 2 karakter olmalıdır').max(200, 'Kaynak adı en fazla 200 karakter olabilir'),
  description: z.string().max(1000, 'Açıklama en fazla 1000 karakter olabilir').optional().or(z.literal('')),
  lessons: z.array(z.object({
    lessonId: z.string().cuid('Geçersiz ders ID'),
    topics: z.array(z.object({
      topicId: z.string().cuid('Geçersiz konu ID'),
      questionCount: z.number().int('Soru sayısı tam sayı olmalıdır').min(0, 'Soru sayısı negatif olamaz').optional()
    }))
  })).optional()
})

export const updateResourceSchema = createResourceSchema.partial()

// Assignment validation schemas
export const createAssignmentSchema = z.object({
  studentId: z.string().cuid('Geçersiz öğrenci ID'),
  topicId: z.string().cuid('Geçersiz konu ID'),
  questionCounts: z.record(z.string(), z.record(z.string(), z.number().int().min(0))).optional()
})

export const updateAssignmentSchema = z.object({
  completed: z.boolean().optional(),
  questionCounts: z.record(z.string(), z.record(z.string(), z.number().int().min(0))).optional()
})

// Progress validation schemas
export const updateProgressSchema = z.object({
  studentId: z.string().cuid('Geçersiz öğrenci ID'),
  assignmentId: z.string().cuid('Geçersiz ödev ID'),
  resourceId: z.string().cuid('Geçersiz kaynak ID'),
  topicId: z.string().cuid('Geçersiz konu ID'),
  solvedCount: z.number().int('Çözülen soru sayısı tam sayı olmalıdır').min(0, 'Çözülen soru sayısı negatif olamaz').optional(),
  correctCount: z.number().int('Doğru sayısı tam sayı olmalıdır').min(0, 'Doğru sayısı negatif olamaz').optional(),
  wrongCount: z.number().int('Yanlış sayısı tam sayı olmalıdır').min(0, 'Yanlış sayısı negatif olamaz').optional(),
  emptyCount: z.number().int('Boş sayısı tam sayı olmalıdır').min(0, 'Boş sayısı negatif olamaz').optional(),
  increment: z.number().int('Artış miktarı tam sayı olmalıdır').optional()
})

// Weekly schedule validation schemas
export const createWeeklyScheduleSchema = z.object({
  studentId: z.string().cuid('Geçersiz öğrenci ID'),
  title: z.string().min(2, 'Program başlığı en az 2 karakter olmalıdır').max(200, 'Program başlığı en fazla 200 karakter olabilir'),
  startDate: z.string().datetime('Geçersiz başlangıç tarihi').or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Geçersiz tarih formatı (YYYY-MM-DD)')),
  endDate: z.string().datetime('Geçersiz bitiş tarihi').or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Geçersiz tarih formatı (YYYY-MM-DD)')),
  assignments: z.array(z.any()).optional()
})

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().int('Sayfa numarası tam sayı olmalıdır').min(1, 'Sayfa numarası 1 den küçük olamaz').default(1),
  limit: z.number().int('Limit tam sayı olmalıdır').min(1, 'Limit 1 den küçük olamaz').max(100, 'Limit 100 den büyük olamaz').default(20)
})

// Helper function to validate and return errors in a consistent format
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown) {
  try {
    const validated = schema.parse(data)
    return { success: true as const, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false as const,
        error: error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }
    }
    return {
      success: false as const,
      error: [{ field: 'unknown', message: 'Validation failed' }]
    }
  }
}
