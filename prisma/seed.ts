import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create super admin user (only account that can add teachers)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@tutoring.com' },
    update: { role: 'SUPER_ADMIN' }, // Update role if user already exists
    create: {
      email: 'superadmin@tutoring.com',
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
    },
  })

  console.log('✅ Created super admin user:', superAdmin)
  console.log('📧 Email: superadmin@tutoring.com')
  console.log('🔑 Role: SUPER_ADMIN')
  console.log('💡 Can login with any password (temporary bypass active)')

  console.log('🎉 Seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
