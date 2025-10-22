-- Add password field to users table
ALTER TABLE users ADD COLUMN password TEXT;

-- Update superadmin user with a secure password
-- Password: SuperAdmin2024! (hashed with bcrypt)
UPDATE users 
SET password = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J9KQYzKzK'
WHERE email = 'superadmin@tutoring.com' AND role = 'SUPER_ADMIN';
