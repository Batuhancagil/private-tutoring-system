# Private Tutoring System - API Documentation

**Version:** 1.0.0
**Last Updated:** 20 Ekim 2025

---

## 📋 İçindekiler

- [Genel Bakış](#genel-bakış)
- [Database Yapısı](#database-yapısı)
- [Alan Adı Eşleştirmeleri](#alan-adı-eşleştirmeleri)
- [Kimlik Doğrulama](#kimlik-doğrulama)
- [API Endpoints](#api-endpoints)
  - [Students](#students-öğrenci-yönetimi)
  - [Lessons](#lessons-ders-yönetimi)
  - [Topics](#topics-konu-yönetimi)
  - [Resources](#resources-kaynak-yönetimi)
  - [Assignments](#assignments-ödev-yönetimi)
  - [Progress](#progress-ilerleme-takibi)
  - [Weekly Schedules](#weekly-schedules-haftalık-program)
- [Hata Yönetimi](#hata-yönetimi)
- [Pagination](#pagination)

---

## Genel Bakış

Private Tutoring System, özel ders öğretmenlerinin öğrencilerini, derslerini, kaynakları ve ilerlemeyi takip etmesini sağlayan bir yönetim sistemidir.

### Base URL

- **Local Development:** `http://localhost:3000`
- **Production:** Deployment URL'niz

### Response Format

Tüm API endpoint'leri standart bir response formatı kullanır:

**Başarılı Response:**
```json
{
  "data": { ... },
  "pagination": { ... }  // Sadece paginated endpoint'lerde
}
```

**Hata Response:**
```json
{
  "error": "Hata mesajı",
  "details": { ... }  // Opsiyonel detaylar
}
```

---

## Database Yapısı

### Core Models

#### 1. User (Teacher)
Öğretmen hesabı (NextAuth ile yönetiliyor)
- **İlişkiler:** Students, Lessons, Resources

#### 2. Student
Öğrenci bilgileri ve giriş bilgileri
- **Alanlar:** name, email, password, phone, parentName, parentPhone, status, notes
- **Status:** ACTIVE | INACTIVE | GRADUATED | SUSPENDED
- **İlişkiler:** Assignments, Progress, WeeklySchedules

#### 3. Lesson
Dersler (TYT Matematik, AYT Fizik, vb.)
- **Alanlar:** name, lessonGroup, lessonExamType, lessonSubject, color
- **Renk Seçenekleri:** blue | purple | green | emerald | orange | red | gray
- **İlişkiler:** Topics, ResourceLessons

#### 4. LessonTopic
Ders konuları (müfredat)
- **Alanlar:** lessonTopicName, lessonTopicOrder
- **İlişkiler:** Lesson, ResourceTopics, Assignments, Progress

#### 5. Resource
Kaynak kitaplar/test kitapları
- **Alanlar:** resourceName, resourceDescription
- **İlişkiler:** Lessons (M2M), Topics (M2M with question counts)

#### 6. StudentAssignment
Öğrenciye atanan konular
- **Alanlar:** studentId, lessonTopicId, completed, studentAssignedResourceTopicQuestionCounts (JSON)
- **Unique:** (studentId, lessonTopicId)
- **İlişkiler:** Student, LessonTopic, Progress

#### 7. StudentProgress
Öğrenci ilerleme takibi
- **Alanlar:** studentProgressSolvedCount, studentProgressCorrectCount, studentProgressWrongCount, studentProgressEmptyCount, studentProgressLastSolvedAt
- **Unique:** (studentId, studentAssignmentId, resourceId)
- **İlişkiler:** Student, Assignment, Resource, LessonTopic

#### 8. WeeklySchedule
Haftalık çalışma programı
- **Alanlar:** title, startDate, endDate, isActive
- **İlişkiler:** Student, WeeklyScheduleWeeks

---

## Alan Adı Eşleştirmeleri

API ve Database arasında bazı alan adları farklıdır. Bu mapping'ler otomatik olarak API katmanında yapılır:

### Lesson Model
| API Field | Database Field |
|-----------|---------------|
| `group` | `lessonGroup` |
| `type` | `lessonExamType` |
| `subject` | `lessonSubject` |

### LessonTopic Model
| API Field | Database Field |
|-----------|---------------|
| `name` | `lessonTopicName` |
| `order` | `lessonTopicOrder` |

### Resource Model
| API Field | Database Field |
|-----------|---------------|
| `name` | `resourceName` |
| `description` | `resourceDescription` |

### StudentAssignment Model
| API Field | Database Field |
|-----------|---------------|
| `topicId` | `lessonTopicId` |
| `questionCounts` | `studentAssignedResourceTopicQuestionCounts` |

### StudentProgress Model
| API Field | Database Field |
|-----------|---------------|
| `assignmentId` | `studentAssignmentId` |
| `topicId` | `lessonTopicId` |
| `solvedCount` | `studentProgressSolvedCount` |
| `correctCount` | `studentProgressCorrectCount` |
| `wrongCount` | `studentProgressWrongCount` |
| `emptyCount` | `studentProgressEmptyCount` |
| `lastSolvedAt` | `studentProgressLastSolvedAt` |

---

## Kimlik Doğrulama

Sistem NextAuth.js kullanarak kimlik doğrulama yapar.

### Teacher Login
```
POST /api/auth/callback/credentials
Content-Type: application/json

{
  "email": "teacher@example.com",
  "password": "password123"
}
```

### Student Login
```
POST /api/students/auth/login
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "password123"
}
```

**Not:** Çoğu endpoint authentication gerektirir ancak bazıları henüz auth middleware eklememiş (güvenlik iyileştirmesi devam ediyor).

---

## API Endpoints

## Students (Öğrenci Yönetimi)

### Get All Students
**Endpoint:** `GET /api/students`
**Auth Required:** ✅ Yes
**Pagination:** ✅ Yes

**Query Parameters:**
- `page` (optional): Sayfa numarası (default: 1)
- `limit` (optional): Sayfa başına item sayısı (default: 20, max: 100)

**Response:**
```json
{
  "data": [
    {
      "id": "clx...",
      "name": "Ahmet Yılmaz",
      "email": "ahmet@example.com",
      "phone": "+905551234567",
      "parentName": "Ali Yılmaz",
      "parentPhone": "+905559876543",
      "status": "ACTIVE",
      "teacherId": "clx...",
      "enrolledAt": "2024-01-15T10:00:00.000Z",
      "notes": "Matematik iyi, fizik çalışmalı",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 45,
    "totalPages": 3
  }
}
```

---

### Create Student
**Endpoint:** `POST /api/students`
**Auth Required:** ✅ Yes

**Request Body:**
```json
{
  "name": "Ahmet Yılmaz",
  "email": "ahmet@example.com",
  "password": "securepass123",
  "phone": "+905551234567",
  "parentName": "Ali Yılmaz",
  "parentPhone": "+905559876543",
  "notes": "Matematik iyi, fizik çalışmalı",
  "status": "ACTIVE"
}
```

**Validation:**
- `name`: 2-100 karakter (zorunlu)
- `email`: Geçerli email formatı (zorunlu)
- `password`: Min 6 karakter (zorunlu)
- `phone`: Geçerli telefon formatı (opsiyonel)
- `parentName`: Max 100 karakter (opsiyonel)
- `parentPhone`: Geçerli telefon formatı (opsiyonel)
- `notes`: Max 1000 karakter (opsiyonel)
- `status`: ACTIVE | INACTIVE | GRADUATED | SUSPENDED (opsiyonel)

**Response:** `201 Created`
```json
{
  "id": "clx...",
  "name": "Ahmet Yılmaz",
  "email": "ahmet@example.com",
  ...
}
```

---

### Get Student by ID
**Endpoint:** `GET /api/students/:id`
**Auth Required:** ✅ Yes

**Response:**
```json
{
  "id": "clx...",
  "name": "Ahmet Yılmaz",
  ...
}
```

---

### Update Student
**Endpoint:** `PUT /api/students/:id`
**Auth Required:** ✅ Yes

**Request Body:** (Tüm alanlar opsiyonel - partial update)
```json
{
  "name": "Ahmet Yılmaz Updated",
  "phone": "+905551234568",
  "status": "ACTIVE"
}
```

---

### Delete Student
**Endpoint:** `DELETE /api/students/:id`
**Auth Required:** ✅ Yes

**Cascade Behavior:** Öğrenci silindiğinde:
- Tüm assignments
- Tüm progress kayıtları
- Tüm schedule kayıtları
- CASCADE olarak silinir

---

## Lessons (Ders Yönetimi)

### Get All Lessons
**Endpoint:** `GET /api/lessons`
**Auth Required:** ❌ No (ancak eklenecek)
**Pagination:** ✅ Yes

**Query Parameters:**
- `page` (optional): Sayfa numarası (default: 1)
- `limit` (optional): Sayfa başına item sayısı (default: 20, max: 100)

**Response:**
```json
{
  "data": [
    {
      "id": "clx...",
      "name": "TYT Matematik",
      "lessonGroup": "TYT Matematik",
      "lessonExamType": "TYT",
      "lessonSubject": "Geometri",
      "color": "blue",
      "teacherId": "clx...",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "topics": [
        {
          "id": "clx...",
          "lessonTopicName": "Üçgenler",
          "lessonTopicOrder": 1,
          "lessonId": "clx...",
          "createdAt": "2024-01-15T10:00:00.000Z"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 15,
    "totalPages": 1
  }
}
```

---

### Create Lesson
**Endpoint:** `POST /api/lessons`
**Auth Required:** ✅ Yes

**Request Body:**
```json
{
  "name": "TYT Matematik",
  "group": "TYT Matematik",
  "type": "TYT",
  "subject": "Geometri",
  "color": "blue"
}
```

**Validation:**
- `name`: 2-100 karakter (zorunlu)
- `group`: 1-50 karakter (zorunlu)
- `type`: TYT | AYT (default: TYT)
- `subject`: Max 100 karakter (opsiyonel)
- `color`: blue | purple | green | emerald | orange | red | gray (otomatik atanır)

**Color Auto-Assignment:**
Eğer renk belirtilmezse, sistem kullanılmayan ilk rengi otomatik atar.

---

### Update Lesson
**Endpoint:** `PUT /api/lessons/:id`
**Auth Required:** ✅ Yes

**Request Body:** (Partial update)
```json
{
  "name": "TYT Matematik Updated",
  "color": "purple"
}
```

---

### Delete Lesson
**Endpoint:** `DELETE /api/lessons/:id`
**Auth Required:** ✅ Yes

**Cascade:** Tüm topics CASCADE silinir

---

## Topics (Konu Yönetimi)

### Get Topics by Lesson
**Endpoint:** `GET /api/topics`
**Auth Required:** ✅ Yes

**Query Parameters:**
- `lessonId` (required): Ders ID'si

**Response:**
```json
[
  {
    "id": "clx...",
    "lessonTopicName": "Üçgenler",
    "lessonTopicOrder": 1,
    "lessonId": "clx...",
    "questionCount": 0,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
]
```

---

### Create Topic
**Endpoint:** `POST /api/topics`
**Auth Required:** ✅ Yes

**Request Body:**
```json
{
  "lessonId": "clx...",
  "name": "Üçgenler",
  "order": 1
}
```

**Validation:**
- `name`: 2-200 karakter (zorunlu)
- `order`: Integer ≥ 1 (otomatik hesaplanır)
- `lessonId`: Geçerli CUID (zorunlu)

**Auto Order:** Eğer `order` verilmezse, mevcut konu sayısı + 1 olarak otomatik ayarlanır.

---

### Update Topic
**Endpoint:** `PUT /api/topics/:id`
**Auth Required:** ✅ Yes

---

### Delete Topic
**Endpoint:** `DELETE /api/topics/:id`
**Auth Required:** ✅ Yes

---

### Fix Topic Orders
**Endpoint:** `POST /api/topics/fix-orders`
**Auth Required:** ✅ Yes

**Request Body:**
```json
{
  "lessonId": "clx..."
}
```

**Purpose:** Bir ders için tüm konu sıralarını yeniden düzenler (1, 2, 3, ...).

---

## Resources (Kaynak Yönetimi)

### Get All Resources
**Endpoint:** `GET /api/resources`
**Auth Required:** ✅ Yes
**Pagination:** ✅ Yes

**Response:** Resources with lessons and topics included

---

### Create Resource
**Endpoint:** `POST /api/resources`
**Auth Required:** ✅ Yes

**Request Body:**
```json
{
  "name": "Palme TYT Matematik",
  "description": "TYT matematik soru bankası",
  "lessonIds": ["clx1..."],
  "topicIds": ["clx2...", "clx3..."],
  "topicQuestionCounts": {
    "clx2...": 150,
    "clx3...": 200
  }
}
```

**Validation:**
- `name`: 2-200 karakter (zorunlu)
- `description`: Max 1000 karakter (opsiyonel)
- `lessonIds`: Array of lesson IDs (opsiyonel)
- `topicIds`: Array of topic IDs (opsiyonel)
- `topicQuestionCounts`: Object mapping topicId → count (opsiyonel)

**Complex Transaction:**
1. Resource oluşturulur
2. Lesson ilişkileri (ResourceLesson) oluşturulur
3. Topic ilişkileri (ResourceTopic) soru sayılarıyla birlikte oluşturulur

---

### Update Resource
**Endpoint:** `PUT /api/resources/:id`
**Auth Required:** ✅ Yes

---

### Delete Resource
**Endpoint:** `DELETE /api/resources/:id`
**Auth Required:** ✅ Yes

---

## Assignments (Ödev Yönetimi)

### Get Student Assignments
**Endpoint:** `GET /api/student-assignments`
**Auth Required:** ⚠️ No (ancak eklenecek)

**Query Parameters:**
- `studentId` (required): Öğrenci ID

**Response:**
```json
[
  {
    "id": "clx...",
    "studentId": "clx...",
    "lessonTopicId": "clx...",
    "assignedAt": "2024-01-15T10:00:00.000Z",
    "completed": false,
    "studentAssignedResourceTopicQuestionCounts": {
      "resourceId1": 50,
      "resourceId2": 30
    }
  }
]
```

---

### Assign Topics to Student
**Endpoint:** `POST /api/student-assignments`
**Auth Required:** ⚠️ No (ancak eklenecek)

**Request Body:**
```json
{
  "studentId": "clx...",
  "topicIds": ["topic1", "topic2", "topic3"],
  "questionCounts": {
    "topic1": {
      "resource1": 50,
      "resource2": 30
    },
    "topic2": {
      "resource1": 40
    }
  }
}
```

**Behavior:**
1. Öğrencinin TÜM mevcut assignment'ları SİLİNİR
2. Yeni assignment'lar oluşturulur
3. Her topic için kaynak bazlı soru sayıları kaydedilir

**Empty topicIds:** Eğer boş array verilirse, tüm assignment'lar silinir.

**Validation:**
- Tüm topic ID'ler database'de mevcut olmalı
- Response'da detaylı debug bilgisi döner

---

## Progress (İlerleme Takibi)

### Get Student Progress
**Endpoint:** `GET /api/student-progress`
**Auth Required:** ⚠️ No (ancak eklenecek)
**Pagination:** ✅ Yes

**Query Parameters:** (Hepsi opsiyonel, filter olarak kullanılır)
- `studentId`: Öğrenci ID
- `assignmentId`: Assignment ID
- `topicId`: Topic ID
- `resourceId`: Resource ID
- `page`: Sayfa numarası (default: 1)
- `limit`: Sayfa başına item (default: 20, max: 100)

**Response:**
```json
{
  "data": [
    {
      "id": "clx...",
      "studentId": "clx...",
      "studentAssignmentId": "clx...",
      "resourceId": "clx...",
      "lessonTopicId": "clx...",
      "studentProgressSolvedCount": 50,
      "studentProgressCorrectCount": 40,
      "studentProgressWrongCount": 8,
      "studentProgressEmptyCount": 2,
      "studentProgressLastSolvedAt": "2024-01-15T18:30:00.000Z",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T18:30:00.000Z",
      "student": {
        "id": "clx...",
        "name": "Ahmet Yılmaz"
      },
      "studentAssignment": {
        "id": "clx...",
        "lessonTopicId": "clx...",
        "assignedAt": "2024-01-15T10:00:00.000Z"
      },
      "resource": {
        "id": "clx...",
        "resourceName": "Palme TYT Matematik"
      },
      "lessonTopic": {
        "id": "clx...",
        "lessonTopicName": "Üçgenler",
        "lessonTopicOrder": 1
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 156,
    "totalPages": 8
  }
}
```

---

### Update Progress
**Endpoint:** `POST /api/student-progress`
**Auth Required:** ⚠️ No (ancak eklenecek)

**Request Body:**
```json
{
  "studentId": "clx...",
  "assignmentId": "clx...",
  "resourceId": "clx...",
  "topicId": "clx...",
  "solvedCount": 50,
  "correctCount": 40,
  "wrongCount": 8,
  "emptyCount": 2
}
```

**Behavior:**
- **Unique Constraint:** (studentId, assignmentId, resourceId)
- Eğer kayıt varsa: **UPDATE**
- Eğer kayıt yoksa: **CREATE**
- `lastSolvedAt` otomatik güncellenir

**Response:** `201 Created` - Progress kaydı student, assignment, resource, topic bilgileriyle birlikte

---

### Increment Progress
**Endpoint:** `POST /api/student-progress/increment`
**Auth Required:** ⚠️ No (ancak eklenecek)

**Request Body:**
```json
{
  "studentId": "clx...",
  "assignmentId": "clx...",
  "resourceId": "clx...",
  "topicId": "clx...",
  "increment": 5
}
```

**Purpose:** Çözülen soru sayısını belirli bir miktar artırır.

---

## Weekly Schedules (Haftalık Program)

### Get Weekly Schedules
**Endpoint:** `GET /api/weekly-schedules`
**Auth Required:** ⚠️ No (ancak eklenecek)

**Query Parameters:**
- `studentId` (required): Öğrenci ID
- `page`: Schedule-level pagination (default: 1)
- `limit`: Schedules per page (default: 10)
- `includeDetails`: Include week plans and topics (default: false)
- `onlyActive`: Only active schedules (default: false)
- `weekPage`: Week-level pagination - 4 weeks per page (opsiyonel)
- `filter`: all | current (bugünden sonraki) | past (geçmiş)

**Complex Response:**
```json
{
  "schedules": [
    {
      "id": "clx...",
      "studentId": "clx...",
      "title": "Ocak 2025 Programı",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-01-28T00:00:00.000Z",
      "isActive": true,
      "createdAt": "2024-12-20T10:00:00.000Z",
      "updatedAt": "2024-12-20T10:00:00.000Z",
      "weekPlans": [
        {
          "id": "clx...",
          "scheduleId": "clx...",
          "weekNumber": 1,
          "startDate": "2025-01-01T00:00:00.000Z",
          "endDate": "2025-01-07T00:00:00.000Z",
          "weekTopics": [
            {
              "id": "clx...",
              "weekPlanId": "clx...",
              "assignmentId": "clx...",
              "topicOrder": 1,
              "isCompleted": false,
              "assignment": {
                "id": "clx...",
                "lessonTopic": {
                  "id": "clx...",
                  "lessonTopicName": "Üçgenler",
                  "lesson": {
                    "id": "clx...",
                    "name": "TYT Matematik",
                    "color": "blue"
                  }
                }
              }
            }
          ]
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalCount": 3,
    "totalPages": 1,
    "weekPage": 0,
    "totalWeeks": 12
  }
}
```

---

### Create Weekly Schedule
**Endpoint:** `POST /api/weekly-schedules`
**Auth Required:** ⚠️ No (ancak eklenecek)

**Request Body:**
```json
{
  "studentId": "clx...",
  "title": "Ocak 2025 Programı",
  "startDate": "2025-01-01",
  "endDate": "2025-01-28",
  "assignments": [
    { "id": "assignment1" },
    { "id": "assignment2" },
    { "id": "assignment3" }
  ]
}
```

**Validation:**
- `studentId`: Valid CUID (zorunlu)
- `title`: 2-200 karakter (zorunlu)
- `startDate`: ISO date veya YYYY-MM-DD (zorunlu)
- `endDate`: ISO date veya YYYY-MM-DD (zorunlu)
- `assignments`: Array of assignment objects (opsiyonel)

**Complex Algorithm:**

1. **Schedule oluştur**
2. **Hafta sayısını hesapla:** (endDate - startDate) / 7
3. **Week planları oluştur:** Her hafta için (startDate, endDate)
4. **Assignment'ları dağıt:**
   - Assignment'ları ders bazlı grupla
   - Her dersin konu sırasına göre sırala (topic order)
   - Round-robin dağıtım: Her haftaya her dersten 1 konu
5. **Week-topic ilişkileri oluştur**

**Example Distribution:**

Assignments:
- Matematik: Topic 1, Topic 2, Topic 3
- Fizik: Topic 1, Topic 2
- Kimya: Topic 1

Haftalık dağılım:
- Hafta 1: Mat-Topic1, Fiz-Topic1, Kim-Topic1
- Hafta 2: Mat-Topic2, Fiz-Topic2
- Hafta 3: Mat-Topic3

**Transaction:** Tüm işlemler tek transaction'da yapılır.

---

### Update Weekly Schedule
**Endpoint:** `PUT /api/weekly-schedules/:id`
**Auth Required:** ⚠️ No (ancak eklenecek)

---

### Delete Weekly Schedule
**Endpoint:** `DELETE /api/weekly-schedules/:id`
**Auth Required:** ⚠️ No (ancak eklenecek)

**Cascade:** Tüm week plans ve topics CASCADE silinir

---

### Get Week by ID
**Endpoint:** `GET /api/weekly-schedules/:scheduleId/weeks/:weekId`

---

### Update Week
**Endpoint:** `PUT /api/weekly-schedules/:scheduleId/weeks/:weekId`

**Request Body:**
```json
{
  "startDate": "2025-01-08",
  "endDate": "2025-01-14"
}
```

---

## Hata Yönetimi

Sistem standardize edilmiş hata response'ları kullanır:

### HTTP Status Codes

- `200` OK - Başarılı GET/PUT/DELETE
- `201` Created - Başarılı POST
- `400` Bad Request - Validation hatası veya eksik parametre
- `401` Unauthorized - Authentication gerekli
- `404` Not Found - Kayıt bulunamadı
- `409` Conflict - Unique constraint ihlali (duplicate key)
- `500` Internal Server Error - Sunucu hatası

### Error Response Format

```json
{
  "error": "Doğrulama hatası",
  "details": [
    {
      "field": "email",
      "message": "Geçerli bir e-posta adresi giriniz"
    }
  ]
}
```

### Prisma Error Codes

- `P2002`: Unique constraint violation
- `P2025`: Record not found
- `P2003`: Foreign key constraint failed

---

## Pagination

Paginated endpoint'ler standart pagination parametreleri kullanır:

### Request Parameters

- `page`: Sayfa numarası (default: 1)
- `limit`: Sayfa başına item sayısı (default: 20, max: 100)

### Response Format

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 156,
    "totalPages": 8
  }
}
```

### Paginated Endpoints

- ✅ GET /api/students
- ✅ GET /api/lessons
- ✅ GET /api/resources
- ✅ GET /api/student-progress
- ✅ GET /api/weekly-schedules

---

## Güvenlik Notları

### ⚠️ Dikkat Edilmesi Gerekenler

1. **Auth Middleware Eksik:** Bazı endpoint'ler henüz auth middleware içermiyor (özellikle assignments, progress, weekly-schedules)
2. **CSRF Protection:** Henüz CSRF protection yok
3. **Rate Limiting:** Rate limiting uygulanmamış
4. **Input Sanitization:** Zod validation var ancak bazı endpoint'lere henüz eklenmemiş

### ✅ Mevcut Güvenlik Özellikleri

1. ✅ Environment variable validation
2. ✅ Hardcoded credentials temizlendi
3. ✅ Password hashing (bcrypt)
4. ✅ JWT session yönetimi (NextAuth)
5. ✅ Zod validation (12/31 endpoint)
6. ✅ Standardized error handling

---

## Postman Collection

Bu API için Postman collection dosyası mevcuttur: `postman-collection.json`

### Import Etme

1. Postman'i açın
2. Import → File → `postman-collection.json` seçin
3. Collection import edilecek

### Variables

Collection aşağıdaki değişkenleri içerir:
- `baseUrl`: API base URL (default: http://localhost:3000)
- `studentId`: Student ID
- `lessonId`: Lesson ID
- `topicId`: Topic ID
- `resourceId`: Resource ID
- `scheduleId`: Schedule ID
- `weekId`: Week ID

Bu değişkenleri kendi değerlerinizle güncelleyin.

---

## Changelog

### v1.0.0 (20 Ekim 2025)
- Initial API documentation
- Postman collection created
- Database schema documented
- Field mapping documented
- All endpoints documented

---

## İletişim & Destek

Sorularınız veya önerileriniz için lütfen iletişime geçin.

---

**Son Güncelleme:** 20 Ekim 2025
