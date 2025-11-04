-- Add average test count column to lesson topics
ALTER TABLE "lesson_topics"
ADD COLUMN IF NOT EXISTS "lessonTopicAverageTestCount" INTEGER DEFAULT 0;

-- Ensure lesson names are unique per teacher
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'lessons_teacherId_name_key'
  ) THEN
    CREATE UNIQUE INDEX "lessons_teacherId_name_key" ON "lessons"("teacherId", "name");
  END IF;
END $$;

-- Ensure topic names are unique per lesson
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'lesson_topics_lessonId_lessonTopicName_key'
  ) THEN
    CREATE UNIQUE INDEX "lesson_topics_lessonId_lessonTopicName_key" ON "lesson_topics"("lessonId", "lessonTopicName");
  END IF;
END $$;

