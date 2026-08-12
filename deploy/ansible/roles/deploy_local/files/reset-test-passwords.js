const argon2 = require('argon2');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const hash = await argon2.hash('testpass123');
  const emails = ['user@test.com', 'moderator@test.com', 'admin@test.com'];

  for (const email of emails) {
    await prisma.user.updateMany({ where: { email }, data: { passwordHash: hash } });
  }

  console.log('Passwords reset for:', emails.join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
