-- Add color column to lessons table
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS color VARCHAR(50) DEFAULT 'blue';

-- Update existing lessons with default color
UPDATE lessons SET color = 'blue' WHERE color IS NULL;

-- Make color non-nullable
ALTER TABLE lessons ALTER COLUMN color SET NOT NULL;

