# MarketPlace API

REST API for a used-car marketplace. Express 5, Prisma 6, PostgreSQL, JWT auth.

## Setup

```bash
cd backend
npm install
cp .env.example .env        # then fill in DATABASE_URL and JWT_SECRET
npx prisma migrate deploy   # apply migrations (use `migrate dev` while developing)
npm run seed:admin          # create the initial super admin (see below)
npm run dev                 # or: npm start
```

Requires Node 20+ and PostgreSQL.

## Environment

| Variable                   | Default       | Notes                                                                                                                             |
| -------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`             | -             | PostgreSQL connection string (required)                                                                                           |
| `JWT_SECRET`               | -             | At least 32 characters (required). Generate with `node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"` |
| `NODE_ENV`                 | `development` | `production` enables secure cookies and hides 5xx details                                                                         |
| `PORT`                     | `5000`        |                                                                                                                                   |
| `ACCESS_TOKEN_TTL_SECONDS` | `900`         | Access token lifetime                                                                                                             |
| `REFRESH_TOKEN_TTL_DAYS`   | `7`           | Refresh token lifetime                                                                                                            |
| `BCRYPT_ROUNDS`            | `12`          | 10-15                                                                                                                             |
| `CORS_ORIGINS`             | -             | Comma-separated browser origins (required in production)                                                                          |
| `TRUST_PROXY`              | `0`           | Number of reverse proxies in front of the app                                                                                     |
| `UPLOAD_DIR`               | `uploads`     | Car image storage, relative to `backend/` or absolute                                                                             |

## Scripts

| Script                              | Purpose                             |
| ----------------------------------- | ----------------------------------- |
| `npm run dev` / `npm start`         | Run with nodemon / plain node       |
| `npm run seed:admin`                | Create the super admin (idempotent) |
| `npm run lint` / `npm run lint:fix` | ESLint                              |
| `npm run format` / `format:check`   | Prettier                            |

### Creating the super admin

```bash
SUPER_ADMIN_EMAIL=owner@example.com SUPER_ADMIN_PASSWORD='...' npm run seed:admin
```

Does nothing if a super admin already exists. The account must change its password on first login.
The API can never create or modify a `SUPER_ADMIN`.

## API overview

All responses use `{ success, data?, message?, pagination? }`; errors use `{ success: false, message, code?, errors? }`.
Authenticated routes take `Authorization: Bearer <accessToken>`. The refresh token is an httpOnly cookie scoped to `/api/auth`.

**Auth** (`/api/auth`): `POST register`, `login`, `refresh`, `logout`, `logout-all`, `change-password`; `GET me`.

**Users** (`/api/users`): `PATCH me` (any user); `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `POST /:id/reset-password` (ADMIN and SUPER_ADMIN).

**Cars** (`/api/cars`):

| Route                                | Access | Notes                                                              |
| ------------------------------------ | ------ | ------------------------------------------------------------------ |
| `GET /`                              | public | ACTIVE only; filters, sort, pagination                             |
| `GET /:id`                           | public | Non-ACTIVE cars are visible to admins only                         |
| `GET /manage`                        | admin  | All statuses; adds `status`, `sellerId` filters                    |
| `POST /`                             | admin  | Creates a DRAFT owned by the caller                                |
| `PATCH /:id`                         | admin  | Content fields only                                                |
| `PATCH /:id/status`                  | admin  | Validated transitions; publishing needs at least 1 image           |
| `DELETE /:id`                        | admin  | Removes the car, its images and files                              |
| `POST /:id/images`                   | admin  | multipart field `images`; JPEG/PNG/WebP, 5 MB each, max 10 per car |
| `PATCH /:id/images/:imageId/primary` | admin  |                                                                    |
| `DELETE /:id/images/:imageId`        | admin  |                                                                    |

List filters: `page`, `limit` (max 50), `q`, `brand`, `model`, `fuelType`, `transmission`, `registrationCity`,
`minPrice`, `maxPrice`, `minYear`, `maxYear`, `maxMileage`, `sort` (`newest`, `price_asc`, `price_desc`, `year_desc`, `mileage_asc`).

Uploaded images are served from `/uploads/...`. In production, serve that directory from a CDN or reverse
proxy on a persistent volume.

## Project layout

```
src/
  config/       env validation, Prisma client
  routes/       route tables (routes/index.js mounts everything under /api)
  controllers/  thin HTTP layer
  services/     business logic and database access
  validators/   zod schemas (common.js holds shared fields)
  middleware/   authenticate, authorize, validate, rateLimit, upload, errorHandler
  utils/        ApiError, response helpers, jwt, password, crypto, cookies, imageType
prisma/         schema and migrations
scripts/        seed-super-admin.js
```
