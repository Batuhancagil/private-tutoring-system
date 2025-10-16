/**
 * Environment Variable Validation
 *
 * This module validates that all required environment variables are set
 * before the application starts. This prevents runtime errors from missing
 * configuration.
 */

interface EnvironmentConfig {
  DATABASE_URL: string
  NEXTAUTH_SECRET: string
  NEXTAUTH_URL: string
  NODE_ENV: string
}

/**
 * List of required environment variables
 */
const REQUIRED_ENV_VARS: (keyof EnvironmentConfig)[] = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL'
]

/**
 * Validates that all required environment variables are set
 * Throws an error if any are missing
 */
export function validateEnvironmentVariables(): void {
  const missingVars: string[] = []

  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missingVars.push(varName)
    }
  }

  if (missingVars.length > 0) {
    const errorMessage = `
❌ Missing required environment variables:
${missingVars.map(v => `  - ${v}`).join('\n')}

Please ensure these variables are set in your environment.
Check .env.example for reference.
`
    throw new Error(errorMessage)
  }
}

/**
 * Get validated environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  validateEnvironmentVariables()

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL!,
    NODE_ENV: process.env.NODE_ENV || 'development'
  }
}
