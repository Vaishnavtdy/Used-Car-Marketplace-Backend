-- Home page brand tiles stop holding their own brand name and point at the master Brand instead.
--
-- Every existing tile gets a master brand: an existing one when the name matches (ignoring case),
-- otherwise a new one is created, so the tiles keep showing exactly what they showed before.

-- 1. Make sure each tile's brand exists in the master list
INSERT INTO "Brand" ("name", "updatedAt")
SELECT h."name", CURRENT_TIMESTAMP
FROM "HomeBrand" h
WHERE NOT EXISTS (SELECT 1 FROM "Brand" b WHERE lower(b."name") = lower(h."name"))
ORDER BY h."displayOrder";

-- 2. Link the tiles
ALTER TABLE "HomeBrand" ADD COLUMN "brandId" INTEGER;

UPDATE "HomeBrand" h
SET "brandId" = b."id"
FROM "Brand" b
WHERE lower(b."name") = lower(h."name");

ALTER TABLE "HomeBrand" ALTER COLUMN "brandId" SET NOT NULL;

-- 3. The name now lives on the master brand
DROP INDEX "HomeBrand_name_lower_key";
ALTER TABLE "HomeBrand" DROP COLUMN "name";

-- CreateIndex
CREATE UNIQUE INDEX "HomeBrand_brandId_key" ON "HomeBrand"("brandId");

-- AddForeignKey
ALTER TABLE "HomeBrand" ADD CONSTRAINT "HomeBrand_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
