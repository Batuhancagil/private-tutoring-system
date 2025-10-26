import { NextAuthOptions } from 'next-auth'
import { prisma } from '@/lib/prisma'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

// Note: Environment variable validation is deferred to runtime
// to avoid build-time errors in CI/CD pipelines where env vars
// are only available at runtime (e.g., Railway, Vercel)

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
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
            return null
          }

          // Find user in database
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              password: true
            }
          })

          console.log('[AUTH] User lookup result:', user ? 'Found' : 'Not found')
          console.log('[AUTH] User role:', user?.role)

          if (!user) {
            console.log('[AUTH] User not found for email:', credentials.email)
            return null
          }

          // Validate password if user has one set
          if (user.password) {
            const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
            if (!isPasswordValid) {
              console.log('[AUTH] Invalid password for user:', credentials.email)
              return null
            }
          } else {
            // For users without passwords (legacy), accept any password temporarily
            console.log('[AUTH] User has no password set, accepting any password (legacy mode)')
          }

          console.log('[AUTH] Authentication successful for:', user.email)

          return {
            id: user.id,
            email: user.email || credentials.email,
            name: user.name || 'User',
            role: user.role || 'TEACHER'
          }
        } catch (error) {
          console.error('[AUTH] Authorization error:', error)
          return null
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
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true, updatedAt: true }
          })
          token.role = dbUser?.role || 'TEACHER'
          token.updatedAt = dbUser?.updatedAt?.toISOString()
        } catch (error) {
          // Handle case where updatedAt column doesn't exist yet
          console.log('UpdatedAt column not available yet, fetching role only')
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true }
          })
          token.role = dbUser?.role || 'TEACHER'
          token.updatedAt = undefined
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.updatedAt = token.updatedAt as string
      }
      return session
    }
  }
}
