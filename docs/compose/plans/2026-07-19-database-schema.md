# Database Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Prisma ORM with PostgreSQL, define all data models (User, Category, Course, Article, Video, ModerationLog, CourseArticle), generate migration, and create a seed script.

**Architecture:** Install Prisma in the backend project, define schema.prisma with all models and relations, configure DATABASE_URL via env, run migration against the postgres container, and seed test data.

**Tech Stack:** NestJS backend, Prisma ORM, PostgreSQL 16, TypeScript

## Global Constraints

- Backend runs in Docker container, PostgreSQL is the `postgres` service from docker-compose
- DATABASE_URL must come from environment variables
- All models must use `@id @default(uuid())` for IDs
- Slugs must be unique (`@unique`)
- Enums: UserRole, ArticleStatus, VideoType, ModerationAction

---

## File Structure

| File | Purpose |
|------|---------|
| `backend/prisma/schema.prisma` | Prisma schema with all models |
| `backend/prisma/seed.ts` | Seed script for test data |
| `backend/.env` | DATABASE_URL for local dev |
| `backend/package.json` | Add prisma deps + seed script |
| `docker-compose.yml` | Add DATABASE_URL to backend env |

---

### Task 1: Install Prisma and configure connection

**Covers:** Requirements 5 (DATABASE_URL from env)

**Files:**
- Modify: `backend/package.json`
- Create: `backend/.env`
- Modify: `docker-compose.yml`

**Interfaces:**
- Produces: Prisma CLI available via `npx prisma`, DATABASE_URL configured

- [ ] **Step 1: Install Prisma dependencies**

```bash
cd /home/ysamohvalov/project/lessons-portal/backend
HTTPS_PROXY=socks5h://127.0.0.1:10808 HTTP_PROXY=socks5h://127.0.0.1:10808 npm install prisma @prisma/client
```

- [ ] **Step 2: Initialize Prisma**

```bash
npx prisma init
```

- [ ] **Step 3: Create backend .env with DATABASE_URL**

```bash
cat > .env << 'EOF'
DATABASE_URL="postgresql://lessons_user:change_me_postgres@postgres:5432/lessons_portal"
EOF
```

- [ ] **Step 4: Update docker-compose.yml backend environment**

Add `DATABASE_URL` to the backend service environment in `docker-compose.yml`:

```yaml
  backend:
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}
```

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/prisma backend/.env docker-compose.yml
git commit -m "feat: initialize Prisma with PostgreSQL connection"
```

---

### Task 2: Define Prisma schema with all models

**Covers:** Requirements 1-4 (models, enums, relations, indexes)

**Files:**
- Create: `backend/prisma/schema.prisma`

**Interfaces:**
- Consumes: Prisma CLI from Task 1
- Produces: Complete schema with User, Category, Course, Article, CourseArticle, Video, ModerationLog

- [ ] **Step 1: Write schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  USER
  MODERATOR
  ADMIN
}

enum ArticleStatus {
  DRAFT
  PENDING
  PUBLISHED
  REJECTED
}

enum VideoType {
  YOUTUBE
  UPLOADED
}

enum ModerationAction {
  APPROVE
  REJECT
}

model User {
  id           String   @id @default(uuid()) @db.Uuid
  email        String   @unique
  passwordHash String   @map("password_hash")
  displayName  String   @map("display_name")
  role         UserRole @default(USER)
  isBlocked    Boolean  @default(false) @map("is_blocked")
  createdAt    DateTime @default(now()) @map("created_at")

  articles         Article[]
  courses          Course[]
  moderationLogs   ModerationLog[]

  @@map("users")
}

model Category {
  id        String   @id @default(uuid()) @db.Uuid
  name      String
  slug      String   @unique
  createdAt DateTime @default(now()) @map("created_at")

  articles Article[]

  @@map("categories")
}

model Course {
  id          String  @id @default(uuid()) @db.Uuid
  name        String
  description String?
  slug        String  @unique
  authorId    String  @map("author_id") @db.Uuid
  status      String  @default("draft")
  createdAt   DateTime @default(now()) @map("created_at")

  author User           @relation(fields: [authorId], references: [id])
  articles CourseArticle[]

  @@map("courses")
}

model Article {
  id              String        @id @default(uuid()) @db.Uuid
  title           String
  slug            String        @unique
  content         String?
  authorId        String        @map("author_id") @db.Uuid
  categoryId      String        @map("category_id") @db.Uuid
  status          ArticleStatus @default(DRAFT)
  rejectionReason String?       @map("rejection_reason")
  createdAt       DateTime      @default(now()) @map("created_at")
  publishedAt     DateTime?     @map("published_at")

  author           User             @relation(fields: [authorId], references: [id])
  category         Category         @relation(fields: [categoryId], references: [id])
  videos           Video[]
  moderationLogs   ModerationLog[]
  courseArticles   CourseArticle[]

  @@index([status])
  @@map("articles")
}

model CourseArticle {
  id        String   @id @default(uuid()) @db.Uuid
  courseId   String   @map("course_id") @db.Uuid
  articleId String   @map("article_id") @db.Uuid
  order     Int

  course  Course  @relation(fields: [courseId], references: [id])
  article Article @relation(fields: [articleId], references: [id])

  @@unique([courseId, articleId])
  @@map("course_articles")
}

model Video {
  id            String    @id @default(uuid()) @db.Uuid
  articleId     String    @map("article_id") @db.Uuid
  type          VideoType
  youtubeUrl    String?   @map("youtube_url")
  s3Key         String?   @map("s3_key")
  s3Bucket      String?   @map("s3_bucket")
  duration      Int?
  processStatus String    @default("pending") @map("process_status")
  createdAt     DateTime  @default(now()) @map("created_at")

  article Article @relation(fields: [articleId], references: [id])

  @@map("videos")
}

model ModerationLog {
  id         String           @id @default(uuid()) @db.Uuid
  articleId  String           @map("article_id") @db.Uuid
  moderatorId String         @map("moderator_id") @db.Uuid
  action     ModerationAction
  comment    String?
  createdAt  DateTime         @default(now()) @map("created_at")

  article  Article @relation(fields: [articleId], references: [id])
  moderator User   @relation(fields: [moderatorId], references: [id])

  @@map("moderation_logs")
}
```

- [ ] **Step 2: Validate schema**

```bash
npx prisma validate
```

Expected: "Valid schema"

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat: define Prisma schema with all models and relations"
```

---

### Task 3: Generate migration and apply to database

**Covers:** Requirements 6 (migration reproducibility)

**Files:**
- Modify: `backend/prisma/migrations/` (generated)

**Interfaces:**
- Consumes: Schema from Task 2, running postgres container
- Produces: Migration files in `backend/prisma/migrations/`

- [ ] **Step 1: Start postgres container (if not running)**

```bash
cd /home/ysamohvalov/project/lessons-portal
docker compose up -d postgres
```

- [ ] **Step 2: Generate Prisma client**

```bash
cd /home/ysamohvalov/project/lessons-portal/backend
npx prisma generate
```

- [ ] **Step 3: Run migration**

```bash
DATABASE_URL="postgresql://lessons_user:change_me_postgres@localhost:5432/lessons_portal" npx prisma migrate dev --name init
```

- [ ] **Step 4: Verify migration on clean DB (reproducibility test)**

```bash
# Reset to clean state
DATABASE_URL="postgresql://lessons_user:change_me_postgres@localhost:5432/lessons_portal" npx prisma migrate reset --force

# Re-apply
DATABASE_URL="postgresql://lessons_user:change_me_postgres@localhost:5432/lessons_portal" npx prisma migrate deploy
```

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/migrations backend/prisma/schema.prisma backend/prisma/generated
git commit -m "feat: add initial database migration"
```

---

### Task 4: Create seed script

**Covers:** Requirements 7 (seed data)

**Files:**
- Create: `backend/prisma/seed.ts`
- Modify: `backend/package.json` (add seed script + prisma config)

**Interfaces:**
- Consumes: Prisma client from Task 3
- Produces: Seed script that creates test data

- [ ] **Step 1: Write seed.ts**

```typescript
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Users
  const user = await prisma.user.upsert({
    where: { email: 'user@test.com' },
    update: {},
    create: {
      email: 'user@test.com',
      passwordHash: 'hashed_password_placeholder',
      displayName: 'Test User',
      role: UserRole.USER,
    },
  });

  const moderator = await prisma.user.upsert({
    where: { email: 'moderator@test.com' },
    update: {},
    create: {
      email: 'moderator@test.com',
      passwordHash: 'hashed_password_placeholder',
      displayName: 'Test Moderator',
      role: UserRole.MODERATOR,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      passwordHash: 'hashed_password_placeholder',
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
      status: 'PUBLISHED',
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
      status: 'PUBLISHED',
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
```

- [ ] **Step 2: Add seed script to package.json**

Add to `backend/package.json`:

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  },
  "scripts": {
    "prisma:seed": "prisma db seed"
  }
}
```

- [ ] **Step 3: Run seed**

```bash
DATABASE_URL="postgresql://lessons_user:change_me_postgres@localhost:5432/lessons_portal" npx prisma db seed
```

- [ ] **Step 4: Verify data exists**

```bash
DATABASE_URL="postgresql://lessons_user:change_me_postgres@localhost:5432/lessons_portal" npx prisma studio
```

Or via SQL:
```bash
docker compose exec postgres psql -U lessons_user -d lessons_portal -c "SELECT email, role FROM users;"
```

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/seed.ts backend/package.json
git commit -m "feat: add seed script with test data"
```

---

### Task 5: Update Dockerfile and rebuild

**Covers:** Ensuring migration works in Docker environment

**Files:**
- Modify: `backend/Dockerfile`

**Interfaces:**
- Consumes: Migration from Task 3
- Produces: Docker image with migrations applied

- [ ] **Step 1: Update Dockerfile to run migrations**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
ENV NODE_ENV=production
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
```

- [ ] **Step 2: Rebuild and test**

```bash
cd /home/ysamohvalov/project/lessons-portal
docker compose build backend
docker compose up -d postgres
# Wait for healthy
docker compose up -d backend
```

- [ ] **Step 3: Verify backend starts and health check passes**

```bash
curl http://localhost:3001/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile
git commit -m "feat: add prisma migrate deploy to Dockerfile"
```
