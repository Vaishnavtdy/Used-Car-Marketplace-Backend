-- CreateEnum
CREATE TYPE "BodyType" AS ENUM ('SEDAN', 'SUV', 'HATCHBACK', 'COUPE', 'WAGON');

-- CreateEnum
CREATE TYPE "FeatureCategory" AS ENUM ('SAFETY', 'COMFORT', 'INTERIOR', 'EXTERIOR', 'TECHNOLOGY');

-- AlterTable
ALTER TABLE "Car" ADD COLUMN     "bodyType" "BodyType",
ADD COLUMN     "engine" VARCHAR(100),
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "power" VARCHAR(100),
ADD COLUMN     "registrationYear" INTEGER;

-- AlterTable
ALTER TABLE "CarImage" ALTER COLUMN "storageKey" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CarFeature" (
    "id" SERIAL NOT NULL,
    "carId" INTEGER NOT NULL,
    "category" "FeatureCategory" NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "CarFeature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarFeature_carId_category_position_idx" ON "CarFeature"("carId", "category", "position");

-- CreateIndex
CREATE INDEX "Car_status_isFeatured_idx" ON "Car"("status", "isFeatured");

-- AddForeignKey
ALTER TABLE "CarFeature" ADD CONSTRAINT "CarFeature_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A car cannot be registered before it was made
ALTER TABLE "Car" ADD CONSTRAINT "Car_registrationYear_check" CHECK (
    "registrationYear" IS NULL OR ("registrationYear" BETWEEN 1950 AND 2100 AND "registrationYear" >= "year")
);
