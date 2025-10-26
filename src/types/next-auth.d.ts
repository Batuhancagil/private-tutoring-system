import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
      createdAt?: string
      updatedAt?: string
      subscriptionEndDate?: string
      isSubscriptionActive?: boolean
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string
    createdAt?: string
    updatedAt?: string
    subscriptionEndDate?: string
    isSubscriptionActive?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: string
    createdAt?: string
    updatedAt?: string
    subscriptionEndDate?: string
    isSubscriptionActive?: boolean
  }
}
