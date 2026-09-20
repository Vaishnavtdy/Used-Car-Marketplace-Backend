-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('PETROL', 'DIESEL', 'CNG', 'LPG', 'ELECTRIC', 'HYBRID');

-- CreateEnum
CREATE TYPE "Transmission" AS ENUM ('MANUAL', 'AUTOMATIC');

-- AlterTable
ALTER TABLE "Car" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ALTER COLUMN "price" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "fuelType" SET DATA TYPE "FuelType" USING upper("fuelType")::"FuelType",
ALTER COLUMN "transmission" SET DATA TYPE "Transmission" USING upper("transmission")::"Transmission";

-- AlterTable
ALTER TABLE "CarImage" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "storageKey" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Car_status_publishedAt_idx" ON "Car"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Car_sellerId_idx" ON "Car"("sellerId");

-- CreateIndex
CREATE INDEX "Car_brand_model_idx" ON "Car"("brand", "model");

-- CreateIndex
CREATE INDEX "Car_price_idx" ON "Car"("price");

-- CreateIndex
CREATE INDEX "Car_year_idx" ON "Car"("year");

-- CreateIndex
CREATE INDEX "CarImage_carId_idx" ON "CarImage"("carId");

-- A car can have at most one primary image (Prisma cannot express partial unique indexes)
CREATE UNIQUE INDEX "CarImage_carId_primary_key" ON "CarImage"("carId") WHERE "isPrimary";
