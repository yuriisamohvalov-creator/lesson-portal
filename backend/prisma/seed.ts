import { PrismaClient, UserRole, ArticleStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as argon2 from 'argon2';

const adapter = new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL! }));
const prisma = new PrismaClient({ adapter });

const TEST_PASSWORD = 'testpass123';

async function hashPassword(password: string) {
  return argon2.hash(password);
}

async function main() {
  const passwordHash = await hashPassword(TEST_PASSWORD);

  // Users
  const user = await prisma.user.upsert({
    where: { email: 'user@test.com' },
    update: {},
    create: {
      email: 'user@test.com',
      passwordHash,
      displayName: 'Test User',
      role: UserRole.USER,
    },
  });

  const _moderator = await prisma.user.upsert({
    where: { email: 'moderator@test.com' },
    update: {},
    create: {
      email: 'moderator@test.com',
      passwordHash,
      displayName: 'Test Moderator',
      role: UserRole.MODERATOR,
    },
  });

  const _admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      passwordHash,
      displayName: 'Test Admin',
      role: UserRole.ADMIN,
    },
  });

  // Category
  const category = await prisma.category.upsert({
    where: { slug: 'driving' },
    update: {},
    create: {
      name: 'Вождение',
      slug: 'driving',
    },
  });

  // Articles
  const article1 = await prisma.article.upsert({
    where: { slug: 'basics-of-driving' },
    update: {},
    create: {
      title: 'Основы вождения',
      slug: 'basics-of-driving',
      content: 'Содержимое статьи об основах вождения...',
      authorId: user.id,
      categoryId: category.id,
      status: ArticleStatus.PUBLISHED,
      publishedAt: new Date(),
    },
  });

  const article2 = await prisma.article.upsert({
    where: { slug: 'parking-tips' },
    update: {},
    create: {
      title: 'Советы по парковке',
      slug: 'parking-tips',
      content: 'Содержимое статьи о парковке...',
      authorId: user.id,
      categoryId: category.id,
      status: ArticleStatus.PUBLISHED,
      publishedAt: new Date(),
    },
  });

  // Course
  const course = await prisma.course.upsert({
    where: { slug: 'driving-basics' },
    update: {},
    create: {
      name: 'Основы вождения',
      description: 'Курс для начинающих водителей',
      slug: 'driving-basics',
      authorId: user.id,
      status: 'published',
    },
  });

  // Course articles (ordered)
  await prisma.courseArticle.upsert({
    where: { courseId_articleId: { courseId: course.id, articleId: article1.id } },
    update: {},
    create: {
      courseId: course.id,
      articleId: article1.id,
      order: 1,
    },
  });

  await prisma.courseArticle.upsert({
    where: { courseId_articleId: { courseId: course.id, articleId: article2.id } },
    update: {},
    create: {
      courseId: course.id,
      articleId: article2.id,
      order: 2,
    },
  });

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
