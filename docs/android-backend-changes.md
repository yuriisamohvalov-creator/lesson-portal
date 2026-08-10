# Backend-изменения для мобильного приложения

Документ описывает минимальные доработки существующего NestJS-backend'а, необходимые для корректной работы Android-приложения. Все изменения должны сохранять обратную совместимость с веб-frontend'ом.

## Список изменений

1. Авторизация:
   - `POST /auth/login` — возвращать `refreshToken` в теле ответа (дополнительно к cookie).
   - `POST /auth/register` — возвращать `refreshToken` в теле ответа (опционально, для единообразия).
   - `POST /auth/refresh` — принимать `refreshToken` в теле запроса, если отсутствует cookie.
   - `POST /auth/logout` — опционально инвалидировать refresh-токен по телу запроса.
2. Загрузка изображений:
   - Создать `POST /uploads/image` — multipart upload, сохранение в MinIO, возврат публичного URL.
3. CORS:
   - Разрешить запросы из мобильного приложения (либо через `FRONTEND_URL`, либо через список разрешённых origin'ов).
4. Swagger:
   - Добавить документацию для новых/изменённых endpoint'ов.

---

## 1. Авторизация

### 1.1 Текущее состояние

Файл `backend/src/auth/auth.controller.ts`:

- `login` вызывает `authService.login(dto, res)` и возвращает `{ accessToken, user }`. Refresh-токен устанавливается в httpOnly-cookie.
- `refresh` читает `req.cookies.refresh_token`.
- `logout` очищает cookie.

Файл `backend/src/auth/auth.service.ts`:

- `login` формирует `accessToken` и `refreshToken`, но в ответ отдаёт только `accessToken` и `user`.
- `refresh(userId)` принимает уже проверенный `userId` и возвращает `{ accessToken }`.

### 1.2 Требуемые изменения

#### 1.2.1 Возврат refreshToken в login/register

**Изменить `backend/src/auth/auth.service.ts`:**

```typescript
async login(dto: LoginDto, res: Response) {
  // ... существующая валидация пользователя ...

  const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
  const accessToken = this.jwtService.sign(payload, { expiresIn: ACCESS_TOKEN_TTL });
  const refreshToken = this.jwtService.sign(payload, {
    expiresIn: REFRESH_TOKEN_TTL,
    secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev-refresh-secret',
  });

  (res as any).cookie(REFRESH_TOKEN_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);

  return {
    accessToken,
    refreshToken, // <-- добавить для mobile
    user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
  };
}
```

> **Обратная совместимость:** веб-клиент может игнорировать `refreshToken` в теле и продолжать использовать cookie.

Для `register` аналогично можно возвращать токены, если требуется автоматический вход после регистрации. Альтернативно, Android-приложение после успешной регистрации делает отдельный вызов `POST /auth/login`.

Рекомендуемый вариант для Android:

```typescript
async register(dto: RegisterDto) {
  // ... создание пользователя ...

  const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
  const accessToken = this.jwtService.sign(payload, { expiresIn: ACCESS_TOKEN_TTL });
  const refreshToken = this.jwtService.sign(payload, {
    expiresIn: REFRESH_TOKEN_TTL,
    secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev-refresh-secret',
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
  };
}
```

> Если не возвращать токены из `register`, Android-приложение должно самостоятельно вызвать `login` после регистрации.

#### 1.2.2 Refresh-токен в теле запроса

**Изменить `backend/src/auth/auth.controller.ts`:**

```typescript
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Post('refresh')
@HttpCode(HttpStatus.OK)
async refresh(
  @Req() req: Request,
  @Body() dto?: RefreshTokenDto,
) {
  const token = req.cookies?.refresh_token || dto?.refreshToken;
  if (!token) {
    throw new UnauthorizedException('No refresh token');
  }

  try {
    const payload = this.jwtService.verify<JwtPayload>(token, {
      secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev-refresh-secret',
    });
    return this.authService.refresh(payload.sub);
  } catch {
    throw new UnauthorizedException('Invalid refresh token');
  }
}
```

**Создать `backend/src/auth/dto/refresh-token.dto.ts`:**

```typescript
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
```

> **Важно:** DTO должен быть опциональным, чтобы не сломать веб-клиент, который отправляет пустое тело.

#### 1.2.3 Logout для mobile

**Вариант A (простой):** мобильное приложение не вызывает `POST /auth/logout` на backend, а просто удаляет токены локально. Это безопасно, если refresh-токен имеет TTL 7 дней.

**Вариант B (рекомендуемый):** расширить `logout` для инвалидации refresh-токена.

Изменить `backend/src/auth/auth.controller.ts`:

```typescript
@Post('logout')
@HttpCode(HttpStatus.OK)
async logout(
  @Res({ passthrough: true }) res: Response,
  @Body() dto?: RefreshTokenDto,
) {
  return this.authService.logout(res, dto?.refreshToken);
}
```

Изменить `backend/src/auth/auth.service.ts`:

```typescript
async logout(res: Response, refreshToken?: string) {
  (res as any).clearCookie(REFRESH_TOKEN_COOKIE, REFRESH_COOKIE_CLEAR_OPTIONS);

  // Опционально: добавить refreshToken в block-list (Redis) на срок жизни токена.
  if (refreshToken) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev-refresh-secret',
      });
      await this.cache.set(`blacklist:refresh:${payload.sub}:${refreshToken}`, '1', 7 * 24 * 60 * 60);
    } catch {
      // игнорировать невалидный токен
    }
  }

  return { message: 'Logged out' };
}
```

> Для block-list потребуется проверка в `refresh`. Это усложнение — делать только если критична безопасность немедленного выхода.

---

## 2. Загрузка изображений

### 2.1 Требуемый endpoint

`POST /uploads/image`

- **Auth**: Bearer
- **Content-Type**: `multipart/form-data`
- **Field name**: `file`
- **Ограничения**: max 5 МБ, форматы `image/jpeg`, `image/png`, `image/webp`
- **Response**: `{ url: string }`

### 2.2 Реализация

#### 2.2.1 Создать модуль uploads

**Файл `backend/src/uploads/uploads.module.ts`:**

```typescript
import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
```

#### 2.2.2 Создать сервис

**Файл `backend/src/uploads/uploads.service.ts`:**

```typescript
import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { extname } from 'path';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class UploadsService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrlPrefix: string;

  constructor() {
    this.s3 = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
      forcePathStyle: true,
    });
    this.bucket = process.env.S3_BUCKET_NAME || 'lessons-portal';
    this.publicUrlPrefix = process.env.S3_PUBLIC_URL || `${process.env.S3_ENDPOINT}/${this.bucket}`;
  }

  async uploadImage(file: Express.Multer.File, userId: string): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Invalid image format. Allowed: jpeg, png, webp');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File too large. Max size: 5 MB');
    }

    const ext = extname(file.originalname).toLowerCase() || '.jpg';
    const key = `uploads/images/${userId}/${randomUUID()}${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        // Для публичного bucket ACL не требуется; для приватного — использовать presigned URL.
      }),
    );

    return { url: `${this.publicUrlPrefix}/${key}` };
  }
}
```

> **Примечание:** если bucket публичный (например, `lessons-videos` через nginx), URL должен быть доступен без подписи. Если bucket приватный — сервис должен возвращать presigned URL или проксировать через backend.

#### 2.2.3 Создать контроллер

**Файл `backend/src/uploads/uploads.controller.ts`:**

```typescript
import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';
import { Req } from '@nestjs/common';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid image format'), false);
        }
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.uploadsService.uploadImage(file, req.user.id);
  }
}
```

#### 2.2.4 Подключить модуль

**Изменить `backend/src/app.module.ts`:**

```typescript
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    // ... существующие модули ...
    UploadsModule,
  ],
})
export class AppModule {}
```

#### 2.2.5 Зависимости

Проверить наличие `@aws-sdk/client-s3` в `backend/package.json`. Если отсутствует — установить:

```bash
cd backend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

> MinIO совместим с S3 API, поэтому AWS SDK подходит.

---

## 3. CORS для мобильного приложения

### 3.1 Текущее состояние

`backend/src/main.ts`:

```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3002',
  credentials: true,
});
```

### 3.2 Варианты решения

**Вариант A (рекомендуемый):** разрешить несколько origin'ов через `MOBILE_APP_ORIGIN`.

```typescript
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3002',
  process.env.MOBILE_APP_ORIGIN,
].filter(Boolean);

app.enableCors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
});
```

**Вариант B (для нативных приложений):** Android-приложение не имеет origin'а при нативных запросах, поэтому CORS не применяется. Однако при использовании WebView для API-вызовов origin может быть `null` или `file://`. В этом случае достаточно добавить `!origin` в проверку.

> **Практическая рекомендация:** для native Android с Retrofit/OkHttp CORS не является проблемой. CORS важен только если часть UI использует WebView, который делает запросы к API.

### 3.3 Переменные окружения

Добавить в `.env.example`:

```bash
# Для мобильного приложения (опционально)
MOBILE_APP_ORIGIN=
```

---

## 4. Swagger

Добавить тег для uploads в `backend/src/main.ts`:

```typescript
const config = new DocumentBuilder()
  // ...
  .addTag('uploads', 'File uploads')
  .build();
```

---

## 5. Проверка после изменений

1. Запустить backend в dev-режиме:
   ```bash
   docker compose up backend
   ```
2. Проверить login:
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"password"}'
   ```
   В ответе должны быть `accessToken` и `refreshToken`.
3. Проверить refresh с телом:
   ```bash
   curl -X POST http://localhost:3001/api/auth/refresh \
     -H "Content-Type: application/json" \
     -d '{"refreshToken":"<refreshToken>"}'
   ```
4. Проверить загрузку изображения:
   ```bash
   curl -X POST http://localhost:3001/api/uploads/image \
     -H "Authorization: Bearer <accessToken>" \
     -F "file=@/path/to/image.jpg"
   ```

---

## 6. Сводка изменений по файлам

| Файл | Действие |
|------|----------|
| `backend/src/auth/auth.service.ts` | Возвращать `refreshToken` из `login` (и `register`) |
| `backend/src/auth/auth.controller.ts` | Принимать `refreshToken` в теле для `/auth/refresh`; поддержать logout с телом |
| `backend/src/auth/dto/refresh-token.dto.ts` | Создать DTO |
| `backend/src/uploads/uploads.module.ts` | Создать модуль |
| `backend/src/uploads/uploads.service.ts` | Создать сервис загрузки в MinIO |
| `backend/src/uploads/uploads.controller.ts` | Создать `POST /uploads/image` |
| `backend/src/app.module.ts` | Подключить `UploadsModule` |
| `backend/src/main.ts` | Обновить CORS и Swagger |
| `backend/package.json` | Добавить `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` |
| `.env.example` | Добавить `MOBILE_APP_ORIGIN` |
