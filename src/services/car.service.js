const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const { pageInfo } = require("../utils/response");
const storage = require("./storage.service");

// Statuses a listing may move to from each status. REJECTED is reserved for a future moderation flow.
const STATUS_TRANSITIONS = {
  DRAFT: ["ACTIVE"],
  ACTIVE: ["SOLD", "EXPIRED", "DRAFT"],
  EXPIRED: ["ACTIVE", "DRAFT"],
  SOLD: ["ACTIVE"],
  REJECTED: [],
};

const FUEL_TYPES = ["PETROL", "DIESEL", "CNG", "LPG", "ELECTRIC", "HYBRID"];
const TRANSMISSIONS = ["MANUAL", "AUTOMATIC"];
const BODY_TYPES = ["SEDAN", "SUV", "HATCHBACK", "COUPE", "WAGON"];

const SORT_ORDERS = {
  newest: [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }, { id: "desc" }],
  price_asc: [{ price: "asc" }, { id: "asc" }],
  price_desc: [{ price: "desc" }, { id: "desc" }],
  year_desc: [{ year: "desc" }, { id: "desc" }],
  mileage_asc: [{ mileage: "asc" }, { id: "asc" }],
};

const sellerSelect = { id: true, name: true, phone: true };
const brandSelect = { id: true, name: true };
const imageSelect = { id: true, url: true, isPrimary: true, position: true };

const summarySelect = {
  id: true,
  title: true,
  brand: { select: brandSelect },
  model: true,
  variant: true,
  year: true,
  price: true,
  mileage: true,
  fuelType: true,
  transmission: true,
  color: true,
  ownership: true,
  registrationCity: true,
  bodyType: true,
  registrationYear: true,
  isFeatured: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  seller: { select: sellerSelect },
  images: { where: { isPrimary: true }, take: 1, select: imageSelect },
};

const detailSelect = {
  ...summarySelect,
  description: true,
  engine: true,
  power: true,
  updatedAt: true,
  images: { orderBy: [{ position: "asc" }, { id: "asc" }], select: imageSelect },
  features: {
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: { category: true, name: true },
  },
};

// price is a Decimal in the database; expose it as a plain number in JSON.
const serializeSummary = ({ price, images, ...car }) => ({
  ...car,
  price: Number(price),
  primaryImage: images[0] ?? null,
});

const serializeDetail = ({ price, ...car }) => ({ ...car, price: Number(price) });

const range = (min, max) =>
  min === undefined && max === undefined
    ? undefined
    : { ...(min !== undefined && { gte: min }), ...(max !== undefined && { lte: max }) };

const equalsInsensitive = (value) => ({ equals: value, mode: "insensitive" });

const anyOf = (values, build) => ({ OR: values.map(build) });

// The words of a search box, e.g. "diesel suv": every word has to match something on the car.
// Free text is checked against the title, brand, model, variant, colour and city; a word that is
// a fuel, gearbox or body type also matches those, and a 4-digit word matches the years.
const ENUM_WORDS = {
  fuelType: FUEL_TYPES,
  transmission: TRANSMISSIONS,
  bodyType: BODY_TYPES,
};

const wordClause = (word) => {
  const contains = { contains: word, mode: "insensitive" };
  const clauses = [
    { title: contains },
    { brand: { name: contains } },
    { model: contains },
    { variant: contains },
    { color: contains },
    { registrationCity: contains },
  ];
  const upper = word.toUpperCase();
  for (const [column, values] of Object.entries(ENUM_WORDS)) {
    if (values.includes(upper)) clauses.push({ [column]: upper });
  }
  if (/^\d{4}$/.test(word))
    clauses.push({ year: Number(word) }, { registrationYear: Number(word) });
  return { OR: clauses };
};

const buildWhere = (f) => {
  const and = [];
  if (f.brand) and.push(anyOf(f.brand, (name) => ({ brand: { name: equalsInsensitive(name) } })));
  if (f.registrationCity) {
    and.push(anyOf(f.registrationCity, (city) => ({ registrationCity: equalsInsensitive(city) })));
  }
  if (f.q) and.push(...f.q.split(/\s+/).filter(Boolean).map(wordClause));

  return {
    ...(f.status && { status: f.status }),
    ...(f.sellerId && { sellerId: f.sellerId }),
    ...(f.ids && { id: { in: f.ids } }),
    ...(f.brandId && { brandId: f.brandId }),
    ...(f.model && { model: equalsInsensitive(f.model) }),
    ...(f.fuelType && { fuelType: { in: f.fuelType } }),
    ...(f.transmission && { transmission: { in: f.transmission } }),
    ...(f.bodyType && { bodyType: { in: f.bodyType } }),
    ...(f.featured && { isFeatured: true }),
    ...(range(f.minPrice, f.maxPrice) && { price: range(f.minPrice, f.maxPrice) }),
    ...(range(f.minYear, f.maxYear) && { year: range(f.minYear, f.maxYear) }),
    ...(range(f.minRegYear, f.maxRegYear) && {
      registrationYear: range(f.minRegYear, f.maxRegYear),
    }),
    ...(f.maxMileage !== undefined && { mileage: { lte: f.maxMileage } }),
    ...(and.length > 0 && { AND: and }),
  };
};

// publicOnly forces ACTIVE regardless of any status filter, so the public list can never expose drafts.
const list = async ({ page, limit, sort, ...filters }, { publicOnly }) => {
  const where = { ...buildWhere(filters), ...(publicOnly && { status: "ACTIVE" }) };

  const [cars, total] = await prisma.$transaction([
    prisma.car.findMany({
      where,
      select: summarySelect,
      orderBy: SORT_ORDERS[sort],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.car.count({ where }),
  ]);

  return { items: cars.map(serializeSummary), pagination: pageInfo({ page, limit, total }) };
};

// Non-admins only see ACTIVE listings; anything else looks like it doesn't exist.
const getById = async (id, { includeAllStatuses }) => {
  const car = await prisma.car.findFirst({
    where: { id, ...(!includeAllStatuses && { status: "ACTIVE" }) },
    select: detailSelect,
  });
  if (!car) throw ApiError.notFound("Car not found");
  return serializeDetail(car);
};

// A foreign-key failure on a car write can only mean the brandId does not exist.
const withBrandCheck = async (write) => {
  try {
    return await write();
  } catch (err) {
    if (err.code !== "P2003") throw err;
    throw new ApiError(422, "Validation failed", {
      code: "VALIDATION_ERROR",
      details: [{ path: "brandId", message: "Brand does not exist" }],
    });
  }
};

// The features array becomes rows, numbered so the order the admin wrote them in is kept.
const featureRows = (features) => features.map((feature, position) => ({ ...feature, position }));

// New listings are always DRAFT and belong to the creating user; clients cannot set either.
const create = async (actor, { features, ...data }) => {
  const car = await withBrandCheck(() =>
    prisma.car.create({
      data: {
        ...data,
        sellerId: actor.id,
        status: "DRAFT",
        ...(features && { features: { create: featureRows(features) } }),
      },
      select: detailSelect,
    })
  );
  return serializeDetail(car);
};

// A partial update can change the manufacturing year without touching the registration year (or
// the other way round), so the pair is checked once merged with what is stored.
const assertRegisteredAfterMade = async (id, data) => {
  if (data.year === undefined && data.registrationYear === undefined) return;
  const stored = await prisma.car.findUnique({
    where: { id },
    select: { year: true, registrationYear: true },
  });
  if (!stored) throw ApiError.notFound("Car not found");
  const year = data.year ?? stored.year;
  const registrationYear =
    data.registrationYear === undefined ? stored.registrationYear : data.registrationYear;
  if (registrationYear !== null && registrationYear < year) {
    throw ApiError.unprocessable("Validation failed", {
      code: "VALIDATION_ERROR",
      details: [
        {
          path: "registrationYear",
          message: "Registration year cannot be earlier than the manufacturing year",
        },
      ],
    });
  }
};

// Prisma raises P2025 for an unknown id, which the error handler turns into a 404.
// Sending features replaces the whole list; leaving it out keeps the current one.
const update = async (id, { features, ...data }) => {
  await assertRegisteredAfterMade(id, data);
  const car = await withBrandCheck(() =>
    prisma.car.update({
      where: { id },
      data: {
        ...data,
        ...(features && { features: { deleteMany: {}, create: featureRows(features) } }),
      },
      select: detailSelect,
    })
  );
  return serializeDetail(car);
};

const changeStatus = async (id, next) => {
  const car = await prisma.car.findUnique({
    where: { id },
    select: { status: true, _count: { select: { images: true } } },
  });
  if (!car) throw ApiError.notFound("Car not found");

  if (!STATUS_TRANSITIONS[car.status].includes(next)) {
    throw new ApiError(422, `Cannot change status from ${car.status} to ${next}`, {
      code: "INVALID_STATUS_TRANSITION",
    });
  }
  if (next === "ACTIVE" && car._count.images === 0) {
    throw new ApiError(422, "Add at least one image before publishing", { code: "NO_IMAGES" });
  }

  // Compare-and-set on the current status so two concurrent changes can't both succeed.
  const { count } = await prisma.car.updateMany({
    where: { id, status: car.status },
    data: { status: next, ...(next === "ACTIVE" && { publishedAt: new Date() }) },
  });
  if (count !== 1) throw ApiError.conflict("Listing was modified concurrently, please retry");

  return getById(id, { includeAllStatuses: true });
};

const remove = async (id) => {
  await prisma.car.delete({ where: { id } });
  // Images and favorites are removed by the database (ON DELETE CASCADE); clean up the files too.
  await storage.removeQuietly(() => storage.removePrefix(`cars/${id}`));
};

// What the filter panel and search can offer, with how many published cars each option matches.
const groupCounts = (rows, column) =>
  rows.map((row) => ({ value: row[column], count: row._count._all }));

const facets = async () => {
  const where = { status: "ACTIVE" };
  // nullable columns skip cars that left the field empty
  const countBy = (column, { nullable = false } = {}) =>
    prisma.car.groupBy({
      by: [column],
      where: { ...where, ...(nullable && { [column]: { not: null } }) },
      _count: { _all: true },
      orderBy: { [column]: "asc" },
    });

  const [total, brandRows, brandNames, fuel, transmission, body, cities, models, covers] =
    await Promise.all([
      prisma.car.count({ where }),
      prisma.car.groupBy({ by: ["brandId"], where, _count: { _all: true } }),
      prisma.brand.findMany({ select: brandSelect }),
      countBy("fuelType"),
      countBy("transmission"),
      countBy("bodyType", { nullable: true }),
      countBy("registrationCity", { nullable: true }),
      prisma.car.findMany({
        where,
        distinct: ["brandId", "model"],
        select: { model: true, brand: { select: brandSelect } },
        orderBy: [{ brandId: "asc" }, { model: "asc" }],
      }),
      // A representative photo per brand: a featured car if there is one, else the newest
      prisma.car.findMany({
        where,
        distinct: ["brandId"],
        orderBy: [
          { brandId: "asc" },
          { isFeatured: "desc" },
          { publishedAt: { sort: "desc", nulls: "last" } },
        ],
        select: {
          brandId: true,
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        },
      }),
    ]);

  const nameOf = new Map(brandNames.map((b) => [b.id, b.name]));
  const coverOf = new Map(covers.map((c) => [c.brandId, c.images[0]?.url ?? null]));

  return {
    total,
    brands: brandRows
      .map((row) => ({
        id: row.brandId,
        name: nameOf.get(row.brandId),
        count: row._count._all,
        image: coverOf.get(row.brandId) ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    fuelTypes: groupCounts(fuel, "fuelType"),
    transmissions: groupCounts(transmission, "transmission"),
    bodyTypes: groupCounts(body, "bodyType"),
    cities: groupCounts(cities, "registrationCity"),
    models: models.map((m) => ({ brand: m.brand.name, model: m.model })),
  };
};

module.exports = { list, getById, create, update, changeStatus, remove, facets };
