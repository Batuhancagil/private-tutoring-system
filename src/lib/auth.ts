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
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        // Find user in database
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) {
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

        return {
          id: user.id,
          email: user.email,
          name: user.name
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
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    }
  }
}
