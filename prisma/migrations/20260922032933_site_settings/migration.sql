-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "brandName" VARCHAR(60),
    "logoUrl" VARCHAR(2048),
    "logoStorageKey" VARCHAR(255),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- Only the one row (id = 1) is ever read or written; nothing creates a second.
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_id_check" CHECK ("id" = 1);

-- Backstop for what the service already checks before every write: a logo with no brand name, or
-- a brand name with no logo, is fine; both empty is not, since there would be nothing to show.
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_identity_check" CHECK (
  "brandName" IS NOT NULL OR "logoUrl" IS NOT NULL
);

-- Set together by the logo upload endpoint and cleared together by the remove endpoint.
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_logo_check" CHECK (
  ("logoUrl" IS NULL AND "logoStorageKey" IS NULL) OR ("logoUrl" IS NOT NULL AND "logoStorageKey" IS NOT NULL)
);

-- Seed the single row, keeping the site looking the same as it does today: the "Marque" wordmark,
-- no logo image.
INSERT INTO "SiteSettings" ("id", "brandName", "logoUrl", "logoStorageKey", "updatedAt")
VALUES (1, 'Marque', NULL, NULL, CURRENT_TIMESTAMP);
