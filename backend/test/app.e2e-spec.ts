import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

describe('Articles (e2e)', () => {
  let app: INestApplication;
  let userToken: string;
  let modToken: string;
  let adminToken: string;
  let articleId: string;
  let categoryId: string;

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.moderationLog.deleteMany();
    await prisma.video.deleteMany();
    await prisma.courseArticle.deleteMany();
    await prisma.course.deleteMany();
    await prisma.article.deleteMany();
    await prisma.user.deleteMany({
      where: { email: { notIn: ['user@test.com', 'moderator@test.com', 'admin@test.com'] } },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['health'] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('Auth flow', () => {
    it('should register a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'e2e-test@test.com', password: 'testpass123', displayName: 'E2E User' })
        .expect(201);

      expect(res.body.email).toBe('e2e-test@test.com');
    });

    it('should login as user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'e2e-test@test.com', password: 'testpass123' })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      userToken = res.body.accessToken;
    });

    it('should login as moderator', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'moderator@test.com', password: 'testpass123' })
        .expect(200);

      modToken = res.body.accessToken;
    });

    it('should login as admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'testpass123' })
        .expect(200);

      adminToken = res.body.accessToken;
    });
  });

  describe('Category setup', () => {
    it('should get categories', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/categories')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      categoryId = res.body[0].id;
    });
  });

  describe('Article lifecycle', () => {
    it('should create article as DRAFT', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/articles')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'E2E Test Article', content: '<p>Test content</p>', categoryId })
        .expect(201);

      expect(res.body.status).toBe('DRAFT');
      articleId = res.body.id;
    });

    it('should submit article to PENDING', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/articles/${articleId}/submit`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.status).toBe('PENDING');
    });

    it('should not allow editing PENDING article', async () => {
      await request(app.getHttpServer())
        .patch(`/api/articles/${articleId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Updated Title' })
        .expect(409);
    });

    it('should not show PENDING article to anonymous', async () => {
      await request(app.getHttpServer())
        .get(`/api/articles/${articleId}`)
        .expect(404);
    });

    it('should show PENDING article to admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/articles/${articleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe('PENDING');
    });

    it('should approve article by moderator', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/moderation/api/articles/${articleId}/approve`)
        .set('Authorization', `Bearer ${modToken}`)
        .expect(200);

      expect(res.body.status).toBe('PUBLISHED');
      expect(res.body.publishedAt).toBeDefined();
    });

    it('should show PUBLISHED article publicly', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/articles/${articleId}`)
        .expect(200);

      expect(res.body.status).toBe('PUBLISHED');
    });

    it('should appear in public list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/articles')
        .expect(200);

      const found = res.body.data.find((a: any) => a.id === articleId);
      expect(found).toBeDefined();
    });
  });

  describe('Article rejection flow', () => {
    let rejectArticleId: string;

    it('should create and submit another article', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/articles')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Reject Test', content: '<p>Content</p>', categoryId })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/articles/${createRes.body.id}/submit`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      rejectArticleId = createRes.body.id;
    });

    it('should reject article with comment', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/moderation/api/articles/${rejectArticleId}/reject`)
        .set('Authorization', `Bearer ${modToken}`)
        .send({ comment: 'Needs improvement' })
        .expect(200);

      expect(res.body.status).toBe('REJECTED');
      expect(res.body.rejectionReason).toBe('Needs improvement');
    });

    it('should not allow reject without comment', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/articles')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'No Comment Test', content: '<p>Content</p>', categoryId })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/articles/${createRes.body.id}/submit`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/moderation/api/articles/${createRes.body.id}/reject`)
        .set('Authorization', `Bearer ${modToken}`)
        .send({ comment: '' })
        .expect(400);
    });

    it('should show rejection reason in my articles', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/articles/mine')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const rejected = res.body.find((a: any) => a.id === rejectArticleId);
      expect(rejected?.lastRejectionComment).toBe('Needs improvement');
    });
  });

  describe('Comments', () => {
    it('should create and list comments on published article', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/articles/${articleId}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ body: 'Great article!' })
        .expect(201);

      expect(res.body.body).toBe('Great article!');

      const list = await request(app.getHttpServer())
        .get(`/api/articles/${articleId}/comments`)
        .expect(200);

      expect(list.body.some((c: any) => c.body === 'Great article!')).toBe(true);
    });
  });

  describe('Profile', () => {
    it('should update user profile', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ displayName: 'Updated E2E User' })
        .expect(200);

      expect(res.body.displayName).toBe('Updated E2E User');
    });
  });

  describe('Admin', () => {
    it('should return admin stats', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.users.total).toBeGreaterThan(0);
      expect(res.body.articles.total).toBeGreaterThan(0);
    });

    it('should list all articles for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Moderation history', () => {
    it('should return moderation history for article', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/moderation/api/articles/${articleId}/history`)
        .set('Authorization', `Bearer ${modToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });
});
