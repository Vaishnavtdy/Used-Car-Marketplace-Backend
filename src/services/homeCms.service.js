const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const { SECTIONS, COLLECTIONS, ICON_KEYS } = require("../config/homeCms");
const { validBudgetBounds, BUDGET_BOUNDS_MESSAGE } = require("../validators/homeCms.validators");

const sectionByKey = Object.fromEntries(SECTIONS.map((s) => [s.key, s]));
const sectionByType = Object.fromEntries(SECTIONS.map((s) => [s.type, s]));

const byOrder = [{ displayOrder: "asc" }, { id: "asc" }];

// Prisma returns Decimal columns as Decimal objects, which JSON-encode as strings.
const plain = (value) =>
  value !== null && typeof value === "object" && typeof value.toNumber === "function"
    ? value.toNumber()
    : value;

const pick = (row, fields) => Object.fromEntries(fields.map((field) => [field, plain(row[field])]));

const adminItem = (row) =>
  Object.fromEntries(Object.entries(row).map(([field, value]) => [field, plain(value)]));

/* ---------- single-instance sections ---------- */

const serializeSection = (row) => ({
  sectionType: row.sectionType,
  ...pick(row, sectionByType[row.sectionType].fields),
  updatedAt: row.updatedAt,
});

const missingSection = () =>
  new ApiError(404, "Section content not found. Has the home_page_cms migration been applied?", {
    code: "SECTION_NOT_FOUND",
  });

const getSection = async (key) => {
  const row = await prisma.homePageContent.findUnique({
    where: { sectionType: sectionByKey[key].type },
  });
  if (!row) throw missingSection();
  return serializeSection(row);
};

// Edit only. The rows are created by the migration, so this never inserts: a missing row is an
// error rather than something to quietly recreate.
const updateSection = async (key, data) => {
  try {
    const row = await prisma.homePageContent.update({
      where: { sectionType: sectionByKey[key].type },
      data,
    });
    return serializeSection(row);
  } catch (err) {
    if (err.code === "P2025") throw missingSection();
    throw err;
  }
};

/* ---------- repeatable collections ---------- */

const collectionService = (config) => {
  const delegate = prisma[config.model];

  const list = async () => (await delegate.findMany({ orderBy: byOrder })).map(adminItem);

  // Items land at the end unless a position is given. displayOrder is not unique, so two racing
  // creates cannot fail; ties fall back to id.
  const create = async (data) => {
    if (config.name === "budgetItems") assertBudgetBounds(data.minPriceLakh, data.maxPriceLakh);

    let { displayOrder } = data;
    if (displayOrder === undefined) {
      const { _max } = await delegate.aggregate({ _max: { displayOrder: true } });
      displayOrder = (_max.displayOrder ?? 0) + 1;
    }

    try {
      return adminItem(await delegate.create({ data: { ...data, displayOrder } }));
    } catch (err) {
      throw translateConflict(err, config);
    }
  };

  // Partial update. Prisma raises P2025 for an unknown id, which the error handler turns into 404.
  const update = async (id, data) => {
    if (config.name === "budgetItems") await assertMergedBudgetBounds(delegate, id, data);

    try {
      return adminItem(await delegate.update({ where: { id }, data }));
    } catch (err) {
      throw translateConflict(err, config);
    }
  };

  const remove = async (id) => {
    await delegate.delete({ where: { id } });
  };

  // Takes the complete list of ids in the desired order. Requiring every id (rather than a
  // subset) means a stale client can never scramble items it has not seen.
  const reorder = async (ids) => {
    await prisma.$transaction(async (tx) => {
      const existing = await tx[config.model].findMany({ select: { id: true } });
      const known = new Set(existing.map((row) => row.id));
      if (ids.length !== known.size || ids.some((id) => !known.has(id))) {
        throw ApiError.conflict("The list has changed. Refresh and try again.", {
          code: "ORDER_OUT_OF_DATE",
        });
      }
      for (const [index, id] of ids.entries()) {
        await tx[config.model].update({ where: { id }, data: { displayOrder: index + 1 } });
      }
    });
    return list();
  };

  const listActive = async () => {
    const rows = await delegate.findMany({ where: { isActive: true }, orderBy: byOrder });
    return rows.map((row) => pick(row, config.publicFields));
  };

  return { list, create, update, remove, reorder, listActive };
};

const translateConflict = (err, config) =>
  err.code === "P2002" && config.duplicateMessage
    ? ApiError.conflict(config.duplicateMessage)
    : err;

const boundsError = () =>
  ApiError.unprocessable("Validation failed", {
    code: "VALIDATION_ERROR",
    details: [{ path: "minPriceLakh", message: BUDGET_BOUNDS_MESSAGE }],
  });

const assertBudgetBounds = (min, max) => {
  if (!validBudgetBounds(min, max)) throw boundsError();
};

// A partial update may touch only one bound, so check the result of merging it into the stored row.
const assertMergedBudgetBounds = async (delegate, id, data) => {
  if (!("minPriceLakh" in data) && !("maxPriceLakh" in data)) return;
  const current = await delegate.findUnique({ where: { id } });
  if (!current) throw ApiError.notFound();
  const merged = { ...adminItem(current), ...data };
  assertBudgetBounds(merged.minPriceLakh, merged.maxPriceLakh);
};

const collections = Object.fromEntries(COLLECTIONS.map((c) => [c.name, collectionService(c)]));

/* ---------- public payload ---------- */

// Everything the Home Page renders, in one round trip: each section's text with its active,
// ordered items nested inside.
const getPublicContent = async () => {
  const [rows, ...itemLists] = await Promise.all([
    prisma.homePageContent.findMany(),
    ...COLLECTIONS.map((c) => collections[c.name].listActive()),
  ]);

  const content = {};
  for (const row of rows) content[sectionByType[row.sectionType].key] = serializeSection(row);

  // A missing section row means the migration was not applied; fail loudly instead of rendering
  // a half-empty page.
  if (SECTIONS.some((s) => !content[s.key])) throw missingSection();

  COLLECTIONS.forEach((c, i) => {
    content[c.section][c.prop] = itemLists[i];
  });
  return content;
};

// What the admin UI needs to build its forms.
const getMeta = () => ({ icons: ICON_KEYS });

module.exports = { getSection, updateSection, collections, getPublicContent, getMeta };
