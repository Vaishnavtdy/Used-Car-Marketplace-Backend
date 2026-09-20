const { z } = require("zod");
const { idParam, paginationQuery, atLeastOneField } = require("./common");

const FUEL_TYPES = ["PETROL", "DIESEL", "CNG", "LPG", "ELECTRIC", "HYBRID"];
const TRANSMISSIONS = ["MANUAL", "AUTOMATIC"];
// REJECTED is reserved for a future moderation flow and cannot be set through the API yet.
const SETTABLE_STATUSES = ["DRAFT", "ACTIVE", "SOLD", "EXPIRED"];
const SORTS = ["newest", "price_asc", "price_desc", "year_desc", "mileage_asc"];

const text = (max) => z.string().trim().min(1).max(max);

const year = z
  .number()
  .int()
  .min(1950)
  .refine((y) => y <= new Date().getFullYear() + 1, "Year is in the future");

// Content fields only. sellerId, status and publishedAt are never accepted from clients.
const fields = {
  title: z.string().trim().min(3).max(150),
  description: text(5000),
  brand: text(50),
  model: text(50),
  variant: text(50),
  year,
  price: z.number().positive().max(999_999_999.99).multipleOf(0.01),
  mileage: z.number().int().min(0).max(2_000_000),
  fuelType: z.enum(FUEL_TYPES),
  transmission: z.enum(TRANSMISSIONS),
  color: text(30),
  ownership: z.number().int().min(1).max(20),
  registrationCity: text(60),
};

const createCar = z.object({
  title: fields.title,
  description: fields.description.optional(),
  brand: fields.brand,
  model: fields.model,
  variant: fields.variant.optional(),
  year: fields.year,
  price: fields.price,
  mileage: fields.mileage,
  fuelType: fields.fuelType,
  transmission: fields.transmission,
  color: fields.color.optional(),
  ownership: fields.ownership.optional(),
  registrationCity: fields.registrationCity.optional(),
});

// Every field optional; nullable ones can be cleared by sending null.
const updateCar = atLeastOneField(
  z.object({
    title: fields.title.optional(),
    description: fields.description.nullable().optional(),
    brand: fields.brand.optional(),
    model: fields.model.optional(),
    variant: fields.variant.nullable().optional(),
    year: fields.year.optional(),
    price: fields.price.optional(),
    mileage: fields.mileage.optional(),
    fuelType: fields.fuelType.optional(),
    transmission: fields.transmission.optional(),
    color: fields.color.nullable().optional(),
    ownership: fields.ownership.nullable().optional(),
    registrationCity: fields.registrationCity.nullable().optional(),
  })
);

const updateStatus = z.object({ status: z.enum(SETTABLE_STATUSES) });

const listShape = paginationQuery({ defaultLimit: 20, maxLimit: 50 }).extend({
  q: z.string().trim().min(1).max(100).optional(),
  brand: text(50).optional(),
  model: text(50).optional(),
  fuelType: fields.fuelType.optional(),
  transmission: fields.transmission.optional(),
  registrationCity: text(60).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minYear: z.coerce.number().int().optional(),
  maxYear: z.coerce.number().int().optional(),
  maxMileage: z.coerce.number().int().min(0).optional(),
  sort: z.enum(SORTS).default("newest"),
});

const manageShape = listShape.extend({
  status: z.enum([...SETTABLE_STATUSES, "REJECTED"]).optional(),
  sellerId: z.coerce.number().int().positive().optional(),
});

const withValidRanges = (schema) =>
  schema
    .refine(
      (q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice,
      {
        path: ["minPrice"],
        message: "minPrice must not exceed maxPrice",
      }
    )
    .refine((q) => q.minYear === undefined || q.maxYear === undefined || q.minYear <= q.maxYear, {
      path: ["minYear"],
      message: "minYear must not exceed maxYear",
    });

const listQuery = withValidRanges(listShape);
const manageQuery = withValidRanges(manageShape);

const imageParams = z.object({
  id: idParam.shape.id,
  imageId: idParam.shape.id,
});

module.exports = {
  idParam,
  imageParams,
  createCar,
  updateCar,
  updateStatus,
  listQuery,
  manageQuery,
};
