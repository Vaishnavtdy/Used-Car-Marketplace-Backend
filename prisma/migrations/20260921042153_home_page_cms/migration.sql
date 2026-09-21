-- CreateEnum
CREATE TYPE "HomeSectionType" AS ENUM ('HERO', 'FEATURED', 'BRANDS', 'WHY_CHOOSE_US', 'HOW_IT_WORKS', 'BUDGET', 'JUST_LISTED', 'TESTIMONIALS', 'EXPLORE');

-- CreateTable
CREATE TABLE "HomePageContent" (
    "id" SERIAL NOT NULL,
    "sectionType" "HomeSectionType" NOT NULL,
    "sectionTitle" VARCHAR(80),
    "title" VARCHAR(200) NOT NULL,
    "highlightedText" VARCHAR(100),
    "description" VARCHAR(600),
    "buttonText" VARCHAR(40),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomePageContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeroStat" (
    "id" SERIAL NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    "value" VARCHAR(30) NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeBrand" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "imageUrl" VARCHAR(2048) NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhyChooseUsItem" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" VARCHAR(400) NOT NULL,
    "icon" VARCHAR(40) NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhyChooseUsItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HowItWorksStep" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" VARCHAR(400) NOT NULL,
    "icon" VARCHAR(40) NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HowItWorksStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetItem" (
    "id" SERIAL NOT NULL,
    "label" VARCHAR(60) NOT NULL,
    "minPriceLakh" DECIMAL(8,2),
    "maxPriceLakh" DECIMAL(8,2),
    "displayOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "location" VARCHAR(100) NOT NULL,
    "car" VARCHAR(100) NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" VARCHAR(1000) NOT NULL,
    "avatarUrl" VARCHAR(2048) NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomePageContent_sectionType_key" ON "HomePageContent"("sectionType");

-- CreateIndex
CREATE INDEX "HeroStat_isActive_displayOrder_idx" ON "HeroStat"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "HomeBrand_isActive_displayOrder_idx" ON "HomeBrand"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "WhyChooseUsItem_isActive_displayOrder_idx" ON "WhyChooseUsItem"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "HowItWorksStep_isActive_displayOrder_idx" ON "HowItWorksStep"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "BudgetItem_isActive_displayOrder_idx" ON "BudgetItem"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "Testimonial_isActive_displayOrder_idx" ON "Testimonial"("isActive", "displayOrder");

-- Constraints Prisma cannot express

-- Home page brand names are unique case-insensitively
CREATE UNIQUE INDEX "HomeBrand_name_lower_key" ON "HomeBrand"(lower("name"));

ALTER TABLE "HeroStat" ADD CONSTRAINT "HeroStat_displayOrder_check" CHECK ("displayOrder" >= 0);
ALTER TABLE "HomeBrand" ADD CONSTRAINT "HomeBrand_displayOrder_check" CHECK ("displayOrder" >= 0);
ALTER TABLE "WhyChooseUsItem" ADD CONSTRAINT "WhyChooseUsItem_displayOrder_check" CHECK ("displayOrder" >= 0);
ALTER TABLE "HowItWorksStep" ADD CONSTRAINT "HowItWorksStep_displayOrder_check" CHECK ("displayOrder" >= 0);
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_displayOrder_check" CHECK ("displayOrder" >= 0);
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_displayOrder_check" CHECK ("displayOrder" >= 0);

ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_rating_check" CHECK ("rating" BETWEEN 1 AND 5);

-- A budget band needs at least one bound, sane bounds, and min below max when both are set
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_bounds_check" CHECK (
    ("minPriceLakh" IS NOT NULL OR "maxPriceLakh" IS NOT NULL)
    AND ("minPriceLakh" IS NULL OR "minPriceLakh" >= 0)
    AND ("maxPriceLakh" IS NULL OR "maxPriceLakh" > 0)
    AND ("minPriceLakh" IS NULL OR "maxPriceLakh" IS NULL OR "minPriceLakh" < "maxPriceLakh")
);

-- Section text: a title is mandatory, and a highlight must actually occur inside the title
ALTER TABLE "HomePageContent" ADD CONSTRAINT "HomePageContent_text_check" CHECK (
    btrim("title") <> ''
    AND ("highlightedText" IS NULL OR "highlightedText" = '' OR position("highlightedText" IN "title") > 0)
);

-- Default content
-- These are exactly the values the Home Page displayed before it became CMS-driven.
-- The rows are created once, here; the API can edit them but never create or delete them.

INSERT INTO "HomePageContent" ("sectionType", "sectionTitle", "title", "highlightedText", "description", "buttonText", "updatedAt") VALUES
    ('HERO', E'Premium pre-owned cars', E'Find a Car\nYou’ll Love to Drive.', E'Love', E'Explore carefully selected pre-owned cars with transparent details, competitive pricing, and everything you need to make the right choice.', E'Explore Cars', CURRENT_TIMESTAMP),
    ('FEATURED', E'Featured', E'Hand-picked favourites', E'favourites', E'A rotating selection of standout cars — exceptional condition, honest history and pricing that makes sense.', E'View All Cars', CURRENT_TIMESTAMP),
    ('BRANDS', E'Brands', E'Browse cars by brand', E'brand', E'Start with the badge you trust. Every brand leads straight to its current inventory.', E'All brands', CURRENT_TIMESTAMP),
    ('WHY_CHOOSE_US', E'Why Choose Us', E'Confidence, from the first click', E'first click', E'Buying a used car should feel exciting, not uncertain. Here is what we do differently.', NULL, CURRENT_TIMESTAMP),
    ('HOW_IT_WORKS', E'How It Works', E'Three simple steps to your next car', E'next car', NULL, NULL, CURRENT_TIMESTAMP),
    ('BUDGET', E'Budget', E'Find your fit by budget', E'budget', E'Set the number, we''ll show what''s possible.', NULL, CURRENT_TIMESTAMP),
    ('JUST_LISTED', E'Just Listed', E'Latest arrivals', E'arrivals', E'Fresh to the collection this month. Good cars don''t wait long.', NULL, CURRENT_TIMESTAMP),
    ('TESTIMONIALS', E'Testimonials', E'Owners who found the one', E'the one', E'Real words from people who found their car through Marque.', NULL, CURRENT_TIMESTAMP),
    ('EXPLORE', NULL, E'Your Next Car Is Waiting.', E'Waiting.', E'Explore our collection of quality pre-owned cars and find the one that fits your lifestyle.', E'Browse All Cars', CURRENT_TIMESTAMP);

INSERT INTO "HeroStat" ("label", "value", "displayOrder", "updatedAt") VALUES
    (E'Verified cars', E'26', 1, CURRENT_TIMESTAMP),
    (E'Brands', E'14', 2, CURRENT_TIMESTAMP),
    (E'Cities', E'10', 3, CURRENT_TIMESTAMP);

INSERT INTO "HomeBrand" ("name", "imageUrl", "displayOrder", "updatedAt") VALUES
    (E'BMW', E'https://images.unsplash.com/photo-1555215695-3004980ad54e', 1, CURRENT_TIMESTAMP),
    (E'Mercedes-Benz', E'https://images.unsplash.com/photo-1583267746897-2cf415887172', 2, CURRENT_TIMESTAMP),
    (E'Audi', E'https://images.unsplash.com/photo-1616422285623-13ff0162193c', 3, CURRENT_TIMESTAMP),
    (E'Toyota', E'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb', 4, CURRENT_TIMESTAMP),
    (E'Honda', E'https://images.unsplash.com/photo-1581540222194-0def2dda95b8', 5, CURRENT_TIMESTAMP),
    (E'Hyundai', E'https://images.unsplash.com/photo-1619767886558-efdc259cde1a', 6, CURRENT_TIMESTAMP),
    (E'Kia', E'https://images.unsplash.com/photo-1609521263047-f8f205293f24', 7, CURRENT_TIMESTAMP),
    (E'Volkswagen', E'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d', 8, CURRENT_TIMESTAMP),
    (E'Tata', E'https://images.unsplash.com/photo-1600661653561-629509216228', 9, CURRENT_TIMESTAMP),
    (E'Mahindra', E'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf', 10, CURRENT_TIMESTAMP);

INSERT INTO "WhyChooseUsItem" ("icon", "title", "description", "displayOrder", "updatedAt") VALUES
    (E'shield-check', E'Verified Cars', E'Every listed vehicle goes through a verification process.', 1, CURRENT_TIMESTAMP),
    (E'eye', E'Transparent Information', E'Clear specifications, pricing, mileage, and vehicle details.', 2, CURRENT_TIMESTAMP),
    (E'gem', E'Quality Selection', E'Carefully selected pre-owned vehicles.', 3, CURRENT_TIMESTAMP),
    (E'compass', E'Easy Car Discovery', E'Powerful search and filtering to find the right vehicle quickly.', 4, CURRENT_TIMESTAMP),
    (E'clipboard-list', E'Detailed Vehicle Information', E'Everything you need to understand a car before making an inquiry.', 5, CURRENT_TIMESTAMP),
    (E'handshake', E'Trusted Experience', E'A simple and transparent car-buying experience.', 6, CURRENT_TIMESTAMP);

INSERT INTO "HowItWorksStep" ("icon", "title", "description", "displayOrder", "updatedAt") VALUES
    (E'search', E'Discover', E'Browse our collection of used cars.', 1, CURRENT_TIMESTAMP),
    (E'sliders-horizontal', E'Explore', E'View detailed specifications, images, pricing, and vehicle information.', 2, CURRENT_TIMESTAMP),
    (E'message-circle', E'Connect', E'Contact us to enquire about your preferred vehicle.', 3, CURRENT_TIMESTAMP);

INSERT INTO "BudgetItem" ("label", "minPriceLakh", "maxPriceLakh", "displayOrder", "updatedAt") VALUES
    (E'Under ₹5 Lakhs', NULL, 5, 1, CURRENT_TIMESTAMP),
    (E'₹5 – 10 Lakhs', 5, 10, 2, CURRENT_TIMESTAMP),
    (E'₹10 – 15 Lakhs', 10, 15, 3, CURRENT_TIMESTAMP),
    (E'₹15 – 25 Lakhs', 15, 25, 4, CURRENT_TIMESTAMP),
    (E'₹25 Lakhs +', 25, NULL, 5, CURRENT_TIMESTAMP);

INSERT INTO "Testimonial" ("name", "location", "car", "rating", "review", "avatarUrl", "displayOrder", "updatedAt") VALUES
    (E'Priya Nair', E'Kochi', E'Toyota Camry Hybrid', 5, E'Every detail I needed was on the listing — owners, mileage, registration year, even the trim features. There were no surprises when I went to see the car, and that honesty made the decision easy.', E'https://i.pravatar.cc/160?img=32', 1, CURRENT_TIMESTAMP),
    (E'Rahul Mehta', E'Mumbai', E'BMW 5 Series', 5, E'I compared four sedans side by side and the filters made it painless. The enquiry was answered the same afternoon and the car matched the photos exactly. A genuinely premium experience.', E'https://i.pravatar.cc/160?img=60', 2, CURRENT_TIMESTAMP),
    (E'Ananya Iyer', E'Bengaluru', E'Kia Seltos', 5, E'As a first-time used-car buyer I was nervous. The clear specs and straightforward process meant I always knew what I was looking at. I would happily recommend it to friends and family.', E'https://i.pravatar.cc/160?img=5', 3, CURRENT_TIMESTAMP),
    (E'Karthik Reddy', E'Hyderabad', E'Audi A7', 4, E'Beautiful selection and the detail in each listing is far better than anywhere else I looked. The gallery crops let me inspect the wheels and stance before visiting, which saved me a trip.', E'https://i.pravatar.cc/160?img=8', 4, CURRENT_TIMESTAMP),
    (E'Fatima Sheikh', E'Pune', E'Honda City', 5, E'Pricing was competitive and clearly stated. I sent an enquiry on Friday, saw the car on Saturday and drove it home the following week. Smooth, simple and transparent from start to finish.', E'https://i.pravatar.cc/160?img=47', 5, CURRENT_TIMESTAMP),
    (E'Vikram Singh', E'Delhi NCR', E'Porsche 911', 5, E'I have bought used performance cars before and this was the most confident I have felt. Full information up front, no pressure, and a car that was exactly as described.', E'https://i.pravatar.cc/160?img=68', 6, CURRENT_TIMESTAMP);
