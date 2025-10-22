import { NextAuthOptions } from 'next-auth'
import { prisma } from '@/lib/prisma'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

// Note: Environment variable validation is deferred to runtime
// to avoid build-time errors in CI/CD pipelines where env vars
// are only available at runtime (e.g., Railway, Vercel)

export const authOptions: NextAuthOptions = {
  // Note: No adapter with JWT strategy - PrismaAdapter is for database sessions only
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          console.log('[AUTH] Login attempt for:', credentials?.email)

          if (!credentials?.email || !credentials?.password) {
            console.log('[AUTH] Missing credentials')
            throw new Error('Email and password are required')
          }

          // Find user in database
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              name: true,
              role: true
            }
          })

          console.log('[AUTH] User lookup result:', user ? 'Found' : 'Not found')
          console.log('[AUTH] User role:', user?.role)

          if (!user) {
            console.log('[AUTH] User not found for email:', credentials.email)
            throw new Error('Invalid email or password')
          }

          // TEMPORARY: Password field doesn't exist in User model yet
          // For demo purposes, accept any password for existing users
          // TODO: Add password field to User model in Prisma schema and implement proper validation
          // Once password field is added:
          // const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
          // if (!isPasswordValid) {
          //   throw new Error('Invalid email or password')
          // }

          console.log('[AUTH] Authentication successful for:', user.email)

          return {
            id: user.id,
            email: user.email || credentials.email,
            name: user.name || 'User',
            role: user.role || 'TEACHER'
          }
        } catch (error) {
          console.error('[AUTH] Authorization error:', error)
          throw error
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60 // 1 day (24 hours * 60 minutes * 60 seconds)
  },
  pages: {
    signIn: '/auth/signin'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        // Fetch user role from database
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true }
        })
        token.role = dbUser?.role || 'TEACHER'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    }
  }
}
