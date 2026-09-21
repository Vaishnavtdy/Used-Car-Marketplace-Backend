# MarketPlace API

REST API for a used-car marketplace. Express 5, Prisma 6, PostgreSQL, JWT auth.

## Setup

```bash
cd backend
npm install
cp .env.example .env        # then fill in DATABASE_URL and JWT_SECRET
npx prisma migrate deploy   # apply migrations (also loads the Home Page CMS defaults)
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

| Script                              | Purpose                              |
| ----------------------------------- | ------------------------------------ |
| `npm run dev` / `npm start`         | Run with nodemon / plain node        |
| `npm run seed:admin`                | Create the super admin (idempotent)  |
| `npm run seed:demo-cars`            | Import the 26 demo cars (idempotent) |
| `npm run lint` / `npm run lint:fix` | ESLint                               |
| `npm run format` / `format:check`   | Prettier                             |

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

**Brands** (`/api/brands`): the master list of car makes. Every car links to one by `brandId`.

| Route         | Access | Notes                                                                 |
| ------------- | ------ | --------------------------------------------------------------------- |
| `GET /`       | public | All brands by name, with `carCount` (ACTIVE cars only); not paginated |
| `POST /`      | admin  | `{ name }`; names are unique ignoring case                            |
| `PATCH /:id`  | admin  | `{ name }`                                                            |
| `DELETE /:id` | admin  | 409 `BRAND_IN_USE` while any car (any status) still uses the brand    |

Create brands before adding cars. `npm run seed:demo-cars` adds the brands its demo cars need.

**Cars** (`/api/cars`): cars are created and updated with `brandId`, and responses return `brand: { id, name }`.

| Route                                | Access | Notes                                                              |
| ------------------------------------ | ------ | ------------------------------------------------------------------ |
| `GET /`                              | public | ACTIVE only; filters, sort, pagination                             |
| `GET /facets`                        | public | Filter options with counts, over ACTIVE cars (see below)           |
| `GET /:id`                           | public | Non-ACTIVE cars are visible to admins only                         |
| `GET /manage`                        | admin  | All statuses; adds `status`, `sellerId` filters                    |
| `POST /`                             | admin  | Creates a DRAFT owned by the caller                                |
| `PATCH /:id`                         | admin  | Content fields only                                                |
| `PATCH /:id/status`                  | admin  | Validated transitions; publishing needs at least 1 image           |
| `DELETE /:id`                        | admin  | Removes the car, its images and files                              |
| `POST /:id/images`                   | admin  | multipart field `images`; JPEG/PNG/WebP, 5 MB each, max 10 per car |
| `PATCH /:id/images/:imageId/primary` | admin  |                                                                    |
| `DELETE /:id/images/:imageId`        | admin  |                                                                    |

List filters: `page`, `limit` (max 50), `q`, `ids`, `brandId`, `brand`, `model`, `fuelType`, `transmission`, `bodyType`, `registrationCity`,
`featured` (`true`), `minPrice`, `maxPrice`, `minYear`, `maxYear`, `minRegYear`, `maxRegYear`, `maxMileage`, `sort` (`newest`, `price_asc`, `price_desc`, `year_desc`, `mileage_asc`).

- `brand`, `fuelType`, `transmission`, `bodyType`, `registrationCity` and `ids` take comma-separated lists (`brand=BMW,Audi`); names match ignoring case.
- `q` is split into words and every word has to match something on the car: title, brand, model, variant, colour, city, a fuel / gearbox / body type ("diesel suv"), or a 4-digit year.

A car also carries `bodyType` (`SEDAN`, `SUV`, `HATCHBACK`, `COUPE`, `WAGON`), `engine`, `power`, `registrationYear` (not before `year`),
`isFeatured` (the home page's hand-picked row) and `features`: a list of `{ category, name }` (`SAFETY`, `COMFORT`, `INTERIOR`,
`EXTERIOR`, `TECHNOLOGY`) in display order. Sending `features` on update replaces the list; leaving it out keeps it. All of these are optional.
Only the detail response has `features`, `engine`, `power` and `description`; list results carry what a card needs plus `primaryImage`.

`GET /facets` returns `{ total, brands: [{ id, name, count, image }], fuelTypes, transmissions, bodyTypes, cities: [{ value, count }], models: [{ brand, model }] }`,
which the storefront uses for its filter panel and search menus (`image` is a photo of a featured or the newest car of the brand).

A photo may live at an external URL (`storageKey` is then empty and there is no file to delete), which is how the demo cars work.

**Demo inventory.** `npm run seed:demo-cars` imports the 26 cars the storefront originally shipped with, as published listings owned by the
super admin (or `IMPORT_SELLER_EMAIL`). It is safe to run again: a car whose title already exists is skipped.

Uploaded images are served from `/uploads/...`. In production, serve that directory from a CDN or reverse
proxy on a persistent volume.

## Home Page CMS

Everything written on the website's home page (headings, descriptions, button labels, and the repeatable
lists: hero stats, brand tiles, why-choose-us cards, how-it-works steps, budget bands, testimonials) is
stored in the database and edited from the admin UI in `frontend/` (`/admin`).

**Defaults.** The `home_page_cms` migration creates the tables _and_ inserts the content the site showed
before it became CMS-driven, so `npx prisma migrate deploy` gives a working home page with no extra step.
The API can edit these rows but never creates or deletes the single-instance ones.

**Two kinds of content**

| Kind                 | Storage                                                                                                   | API                  |
| -------------------- | --------------------------------------------------------------------------------------------------------- | -------------------- |
| Single-instance      | `HomePageContent`, one row per `HomeSectionType` (unique)                                                 | `GET` and `PUT` only |
| Repeatable (6 lists) | one table each: `HeroStat`, `HomeBrand`, `WhyChooseUsItem`, `HowItWorksStep`, `BudgetItem`, `Testimonial` | full CRUD + reorder  |

**Routes** (`/api/cms/home`). Only the first is public; everything else needs an ADMIN or SUPER_ADMIN token.

| Route                                                                                                                                                  | Notes                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `GET /`                                                                                                                                                | public. All nine sections with their **active** items in order: what the website renders      |
| `GET /meta`                                                                                                                                            | `{ icons }`: the icon keys items may use                                                      |
| `GET` / `PUT /hero`, `/featured`, `/brands-content`, `/why-choose-us`, `/how-it-works`, `/budget`, `/just-listed`, `/testimonials-content`, `/explore` | single-instance sections. `PUT` replaces every field the section has and rejects any others   |
| `GET /hero-stats`, `/brands`, `/why-choose-us-items`, `/how-it-works-steps`, `/budget-items`, `/testimonials`                                          | list **all** items (including hidden), ordered                                                |
| `POST /<collection>`                                                                                                                                   | create; without `displayOrder` the item is appended                                           |
| `PUT /<collection>/:id`                                                                                                                                | update any subset of fields, so `{ "isActive": false }` hides an item                         |
| `DELETE /<collection>/:id`                                                                                                                             |                                                                                               |
| `PUT /<collection>/reorder`                                                                                                                            | `{ ids: [...] }`, every id in the new order (409 `ORDER_OUT_OF_DATE` if the list has changed) |

**Section fields.** `sectionTitle` (the small label), `title`, `highlightedText`, `description`, `buttonText`;
each section has the subset shown in `src/config/homeCms.js`. `highlightedText` is the part of `title` shown
in the accent colour, so it must occur in the title exactly (it may be empty). Only the hero `title` may
contain line breaks (up to 3 lines).

**Validation** (zod in `validators/homeCms.validators.js`, repeated as CHECK constraints in the database
where possible): required and trimmed text with length limits; `displayOrder` an integer 0-9999; `rating` 1-5;
`icon` one of `GET /meta`; image URLs must be `http(s)://` (no credentials) or `/uploads/...`; a budget band
needs at least one bound in lakhs and `min < max`.

**Brands are master data.** The home page's brand tiles (`/brands` under `/api/cms/home`) do not hold a brand
name: each one points at a master `Brand` (`{ brandId, imageUrl }`, admin responses carry `brand: { id, name }`),
so renaming a brand in `/api/brands` renames its tile, a brand can be on the home page once (409 otherwise),
an unknown `brandId` is a 422, and deleting the master brand removes its tile. Create brands in `/api/brands` first.

**Frontend contract.** Items are returned in `displayOrder` (ties by id) and only when `isActive`. The
number on a how-it-works step is its position, not a stored value.

**Adding a section later.** Add an entry to `SECTIONS` (or `COLLECTIONS`) in `src/config/homeCms.js`, extend the
Prisma enum/model, and write a migration that also inserts its default content. Validators, services, routes
are generated from the registry.

## Project layout

```
src/
  config/       env validation, Prisma client, Home Page CMS registry (homeCms.js)
  routes/       route tables (routes/index.js mounts everything under /api)
  controllers/  thin HTTP layer
  services/     business logic and database access
  validators/   zod schemas (common.js holds shared fields)
  middleware/   authenticate, authorize, validate, rateLimit, upload, errorHandler
  utils/        ApiError, response helpers, jwt, password, crypto, cookies, imageType
prisma/         schema and migrations
scripts/        seed-super-admin.js
```
