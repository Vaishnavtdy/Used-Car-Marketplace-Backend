-- Moves Car.brand (free text) into a Brand master table linked by Car.brandId.
-- Existing cars are backfilled: one Brand per distinct name, ignoring case and surrounding spaces.

-- CreateTable
CREATE TABLE "Brand" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- Brand names are unique case-insensitively (Prisma cannot express expression indexes)
CREATE UNIQUE INDEX "Brand_name_lower_key" ON "Brand"(lower("name"));

-- Backfill brands, keeping the most common spelling when the same brand was typed differently
INSERT INTO "Brand" ("name", "updatedAt")
SELECT DISTINCT ON (spelling.key) spelling.name, CURRENT_TIMESTAMP
FROM (
    SELECT btrim("brand") AS name, lower(btrim("brand")) AS key, count(*) AS uses
    FROM "Car"
    WHERE btrim("brand") <> ''
    GROUP BY btrim("brand")
) AS spelling
ORDER BY spelling.key, spelling.uses DESC, spelling.name;

-- AlterTable
ALTER TABLE "Car" ADD COLUMN "brandId" INTEGER;

UPDATE "Car" SET "brandId" = "Brand"."id"
FROM "Brand"
WHERE lower("Brand"."name") = lower(btrim("Car"."brand"));

-- Cars whose brand was blank have nothing to link to; keep them under a placeholder brand
INSERT INTO "Brand" ("name", "updatedAt")
SELECT 'Unknown', CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "Car" WHERE "brandId" IS NULL)
ON CONFLICT DO NOTHING;

UPDATE "Car" SET "brandId" = (SELECT "id" FROM "Brand" WHERE lower("name") = 'unknown')
WHERE "brandId" IS NULL;

ALTER TABLE "Car" ALTER COLUMN "brandId" SET NOT NULL;

-- DropIndex
DROP INDEX "Car_brand_model_idx";

-- AlterTable
ALTER TABLE "Car" DROP COLUMN "brand";

-- CreateIndex
CREATE INDEX "Car_brandId_model_idx" ON "Car"("brandId", "model");

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
