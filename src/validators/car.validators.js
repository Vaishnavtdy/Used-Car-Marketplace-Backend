const { z } = require("zod");
const { idParam, paginationQuery, atLeastOneField } = require("./common");

const FUEL_TYPES = ["PETROL", "DIESEL", "CNG", "LPG", "ELECTRIC", "HYBRID"];
const TRANSMISSIONS = ["MANUAL", "AUTOMATIC"];
const BODY_TYPES = ["SEDAN", "SUV", "HATCHBACK", "COUPE", "WAGON"];
const FEATURE_CATEGORIES = ["SAFETY", "COMFORT", "INTERIOR", "EXTERIOR", "TECHNOLOGY"];
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
  brandId: z.number().int().positive(),
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
  bodyType: z.enum(BODY_TYPES),
  engine: text(100),
  power: text(100),
  registrationYear: year,
  isFeatured: z.boolean(),
  // The complete list, in display order. On update it replaces whatever was there.
  features: z
    .array(z.object({ category: z.enum(FEATURE_CATEGORIES), name: text(120) }))
    .max(100, "At most 100 features"),
};

// A car is not registered before it was made. This is also a CHECK constraint in the database,
// and the service re-checks it on update against the stored year.
const registeredAfterMade = (car) =>
  car.registrationYear === undefined ||
  car.registrationYear === null ||
  car.year === undefined ||
  car.registrationYear >= car.year;

const REGISTERED_AFTER_MADE = {
  path: ["registrationYear"],
  message: "Registration year cannot be earlier than the manufacturing year",
};

const createCar = z
  .object({
    title: fields.title,
    description: fields.description.optional(),
    brandId: fields.brandId,
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
    bodyType: fields.bodyType.optional(),
    engine: fields.engine.optional(),
    power: fields.power.optional(),
    registrationYear: fields.registrationYear.optional(),
    isFeatured: fields.isFeatured.optional(),
    features: fields.features.optional(),
  })
  .refine(registeredAfterMade, REGISTERED_AFTER_MADE);

// Every field optional; nullable ones can be cleared by sending null.
const updateCar = atLeastOneField(
  z
    .object({
      title: fields.title.optional(),
      description: fields.description.nullable().optional(),
      brandId: fields.brandId.optional(),
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
      bodyType: fields.bodyType.nullable().optional(),
      engine: fields.engine.nullable().optional(),
      power: fields.power.nullable().optional(),
      registrationYear: fields.registrationYear.nullable().optional(),
      isFeatured: fields.isFeatured.optional(),
      features: fields.features.optional(),
    })
    .refine(registeredAfterMade, REGISTERED_AFTER_MADE)
);

const updateStatus = z.object({ status: z.enum(SETTABLE_STATUSES) });

// "BMW,Audi" -> ["BMW", "Audi"]. A single value is a list of one, so ?fuelType=PETROL still works.
const csv = (item, { max = 20 } = {}) =>
  z
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
    )
    .pipe(z.array(item).min(1).max(max));

const listShape = paginationQuery({ defaultLimit: 20, maxLimit: 50 }).extend({
  q: z.string().trim().min(1).max(100).optional(),
  ids: csv(z.coerce.number().int().positive(), { max: 50 }).optional(),
  brandId: z.coerce.number().int().positive().optional(),
  brand: csv(text(50)).optional(),
  model: text(50).optional(),
  fuelType: csv(fields.fuelType).optional(),
  transmission: csv(fields.transmission).optional(),
  bodyType: csv(fields.bodyType).optional(),
  registrationCity: csv(text(60)).optional(),
  featured: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minYear: z.coerce.number().int().optional(),
  maxYear: z.coerce.number().int().optional(),
  minRegYear: z.coerce.number().int().optional(),
  maxRegYear: z.coerce.number().int().optional(),
  maxMileage: z.coerce.number().int().min(0).optional(),
  sort: z.enum(SORTS).default("newest"),
});

const manageShape = listShape.extend({
  status: z.enum([...SETTABLE_STATUSES, "REJECTED"]).optional(),
  sellerId: z.coerce.number().int().positive().optional(),
});

const rangeChecked = (min, max) => (q) =>
  q[min] === undefined || q[max] === undefined || q[min] <= q[max];

const withValidRanges = (schema) =>
  schema
    .refine(rangeChecked("minPrice", "maxPrice"), {
      path: ["minPrice"],
      message: "minPrice must not exceed maxPrice",
    })
    .refine(rangeChecked("minYear", "maxYear"), {
      path: ["minYear"],
      message: "minYear must not exceed maxYear",
    })
    .refine(rangeChecked("minRegYear", "maxRegYear"), {
      path: ["minRegYear"],
      message: "minRegYear must not exceed maxRegYear",
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
