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

const SORT_ORDERS = {
  newest: [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }, { id: "desc" }],
  price_asc: [{ price: "asc" }, { id: "asc" }],
  price_desc: [{ price: "desc" }, { id: "desc" }],
  year_desc: [{ year: "desc" }, { id: "desc" }],
  mileage_asc: [{ mileage: "asc" }, { id: "asc" }],
};

const sellerSelect = { id: true, name: true, phone: true };
const imageSelect = { id: true, url: true, isPrimary: true, position: true };

const summarySelect = {
  id: true,
  title: true,
  brand: true,
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
  status: true,
  publishedAt: true,
  createdAt: true,
  seller: { select: sellerSelect },
  images: { where: { isPrimary: true }, take: 1, select: imageSelect },
};

const detailSelect = {
  ...summarySelect,
  description: true,
  updatedAt: true,
  images: { orderBy: [{ position: "asc" }, { id: "asc" }], select: imageSelect },
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

const buildWhere = (f) => ({
  ...(f.status && { status: f.status }),
  ...(f.sellerId && { sellerId: f.sellerId }),
  ...(f.brand && { brand: equalsInsensitive(f.brand) }),
  ...(f.model && { model: equalsInsensitive(f.model) }),
  ...(f.fuelType && { fuelType: f.fuelType }),
  ...(f.transmission && { transmission: f.transmission }),
  ...(f.registrationCity && { registrationCity: equalsInsensitive(f.registrationCity) }),
  ...(range(f.minPrice, f.maxPrice) && { price: range(f.minPrice, f.maxPrice) }),
  ...(range(f.minYear, f.maxYear) && { year: range(f.minYear, f.maxYear) }),
  ...(f.maxMileage !== undefined && { mileage: { lte: f.maxMileage } }),
  ...(f.q && {
    OR: ["title", "brand", "model"].map((field) => ({
      [field]: { contains: f.q, mode: "insensitive" },
    })),
  }),
});

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

// New listings are always DRAFT and belong to the creating user; clients cannot set either.
const create = async (actor, data) => {
  const car = await prisma.car.create({
    data: { ...data, sellerId: actor.id, status: "DRAFT" },
    select: detailSelect,
  });
  return serializeDetail(car);
};

// Prisma raises P2025 for an unknown id, which the error handler turns into a 404.
const update = async (id, data) => {
  const car = await prisma.car.update({ where: { id }, data, select: detailSelect });
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

module.exports = { list, getById, create, update, changeStatus, remove };
