const { z } = require("zod");
const { idParam, atLeastOneField, imageUrl } = require("./common");
const { TEXT_LIMITS, SECTIONS, COLLECTIONS, ICON_KEYS } = require("../config/homeCms");

const MAX_HERO_TITLE_LINES = 3;

// Every text field is trimmed and must be non-empty. Only the hero headline may span lines: its
// lines are trimmed and blank ones dropped, so "a \n\n b" is stored as "a\nb".
const text = (max, { multiline = false } = {}) => {
  if (!multiline) {
    return z
      .string()
      .trim()
      .min(1, "Required")
      .max(max)
      .refine((s) => !/[\r\n]/.test(s), "Must be a single line");
  }
  return z
    .string()
    .transform((s) =>
      s
        .split(/\r\n|\r|\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n")
    )
    .pipe(
      z
        .string()
        .min(1, "Required")
        .max(max)
        .refine((s) => s.split("\n").length <= MAX_HERO_TITLE_LINES, {
          message: `At most ${MAX_HERO_TITLE_LINES} lines`,
        })
    );
};

// The part of the title that gets emphasised. Empty means no emphasis.
const highlightedText = z
  .string()
  .trim()
  .max(TEXT_LIMITS.highlightedText)
  .refine((s) => !/[\r\n]/.test(s), "Must be a single line");

const displayOrder = z.number().int().min(0).max(9999);
const isActive = z.boolean();
const lakh = z.number().min(0).max(100_000).multipleOf(0.01);

// A section edit replaces all of the section's fields (an edit form always sends them all), and
// rejects fields the section does not have.
const sectionSchema = ({ fields, multilineTitle }) => {
  const shape = {};
  for (const field of fields) {
    if (field === "highlightedText") shape[field] = highlightedText;
    else
      shape[field] = text(TEXT_LIMITS[field], { multiline: field === "title" && multilineTitle });
  }
  return z.strictObject(shape).superRefine((value, ctx) => {
    if (value.highlightedText && !value.title.includes(value.highlightedText)) {
      ctx.addIssue({
        code: "custom",
        path: ["highlightedText"],
        message: "Must appear in the title exactly as written",
      });
    }
  });
};

// Item fields per collection. On create, a missing displayOrder appends the item to the end and a
// missing isActive means active; on update every field is optional.
const collectionShapes = {
  heroStats: {
    label: text(50),
    value: text(30),
  },
  brands: {
    brandId: z.number().int().positive(),
    imageUrl,
  },
  whyChooseUsItems: {
    title: text(100),
    description: text(400),
    icon: z.enum(ICON_KEYS),
  },
  howItWorksSteps: {
    title: text(100),
    description: text(400),
    icon: z.enum(ICON_KEYS),
  },
  budgetItems: {
    label: text(60),
    // Either bound may be null for an open-ended band; the pair is checked together (below for
    // create, in the service for update, which needs the stored value of the other bound).
    minPriceLakh: lakh.nullable().optional(),
    maxPriceLakh: lakh.positive().nullable().optional(),
  },
  testimonials: {
    name: text(100),
    location: text(100),
    car: text(100),
    rating: z.number().int().min(1).max(5),
    review: text(1000),
    avatarUrl: imageUrl,
  },
};

const withCommonFields = (shape) => ({
  ...shape,
  displayOrder: displayOrder.optional(),
  isActive: isActive.optional(),
});

// True when a band's bounds are usable: at least one set, and min below max when both are.
const validBudgetBounds = (min, max) => {
  const hasMin = min !== undefined && min !== null;
  const hasMax = max !== undefined && max !== null;
  return (hasMin || hasMax) && (!hasMin || !hasMax || min < max);
};

const BUDGET_BOUNDS_MESSAGE = "Set at least one bound, and keep the minimum below the maximum";

const createBudget = (schema) =>
  schema.refine((v) => validBudgetBounds(v.minPriceLakh, v.maxPriceLakh), {
    path: ["minPriceLakh"],
    message: BUDGET_BOUNDS_MESSAGE,
  });

const collections = {};
for (const { name } of COLLECTIONS) {
  const shape = withCommonFields(collectionShapes[name]);
  const create = z.strictObject(shape);
  const update = atLeastOneField(z.strictObject(shape).partial());
  collections[name] = {
    create: name === "budgetItems" ? createBudget(create) : create,
    update,
  };
}

const sections = Object.fromEntries(
  SECTIONS.map((section) => [section.key, sectionSchema(section)])
);

const reorder = z.strictObject({
  ids: z
    .array(z.number().int().positive())
    .min(1)
    .max(200)
    .refine((ids) => new Set(ids).size === ids.length, "Each id may appear only once"),
});

module.exports = {
  idParam,
  reorder,
  sections,
  collections,
  validBudgetBounds,
  BUDGET_BOUNDS_MESSAGE,
};
