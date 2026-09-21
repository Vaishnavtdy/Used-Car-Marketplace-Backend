// Registry for the Home Page CMS. Validators, services and routes are all generated from these
// tables, so adding a section later means adding an entry here (plus a migration for its data).

// Column limits shared by validation and the database (see the HomePageContent model).
const TEXT_LIMITS = {
  sectionTitle: 80,
  title: 200,
  highlightedText: 100,
  description: 600,
  buttonText: 40,
};

// Single-instance sections: exactly one HomePageContent row each, edit-only.
//   key   - name in API responses and in the frontend
//   type  - HomeSectionType enum value; the unique key of the row
//   path  - URL segment under /api/cms/home
//   fields - the text fields the section has (the rest of the columns stay NULL)
//   multilineTitle - the hero headline may be split over lines with a newline
const SECTIONS = [
  {
    key: "hero",
    type: "HERO",
    path: "hero",
    fields: ["sectionTitle", "title", "highlightedText", "description", "buttonText"],
    multilineTitle: true,
  },
  {
    key: "featured",
    type: "FEATURED",
    path: "featured",
    fields: ["sectionTitle", "title", "highlightedText", "description", "buttonText"],
  },
  {
    key: "brands",
    type: "BRANDS",
    path: "brands-content",
    fields: ["sectionTitle", "title", "highlightedText", "description", "buttonText"],
  },
  {
    key: "whyChooseUs",
    type: "WHY_CHOOSE_US",
    path: "why-choose-us",
    fields: ["sectionTitle", "title", "highlightedText", "description"],
  },
  {
    key: "howItWorks",
    type: "HOW_IT_WORKS",
    path: "how-it-works",
    fields: ["sectionTitle", "title", "highlightedText"],
  },
  {
    key: "budget",
    type: "BUDGET",
    path: "budget",
    fields: ["sectionTitle", "title", "highlightedText", "description"],
  },
  {
    key: "justListed",
    type: "JUST_LISTED",
    path: "just-listed",
    fields: ["sectionTitle", "title", "highlightedText", "description"],
  },
  {
    key: "testimonials",
    type: "TESTIMONIALS",
    path: "testimonials-content",
    fields: ["sectionTitle", "title", "highlightedText", "description"],
  },
  {
    key: "explore",
    type: "EXPLORE",
    path: "explore",
    fields: ["title", "highlightedText", "description", "buttonText"],
  },
];

// Repeatable content: one table each, ordered by displayOrder, hidden when isActive is false.
//   name    - key used by the validators
//   model   - Prisma delegate name
//   section - the SECTIONS key it belongs to; prop is where it sits inside that section's
//             public payload
//   publicFields - what the public endpoint exposes (admins get the whole row)
const COLLECTIONS = [
  {
    name: "heroStats",
    path: "hero-stats",
    model: "heroStat",
    section: "hero",
    prop: "stats",
    publicFields: ["id", "label", "value"],
  },
  {
    name: "brands",
    path: "brands",
    model: "homeBrand",
    section: "brands",
    prop: "items",
    publicFields: ["id", "name", "imageUrl"],
    duplicateMessage: "A brand with this name already exists",
  },
  {
    name: "whyChooseUsItems",
    path: "why-choose-us-items",
    model: "whyChooseUsItem",
    section: "whyChooseUs",
    prop: "items",
    publicFields: ["id", "title", "description", "icon"],
  },
  {
    name: "howItWorksSteps",
    path: "how-it-works-steps",
    model: "howItWorksStep",
    section: "howItWorks",
    prop: "steps",
    publicFields: ["id", "title", "description", "icon"],
  },
  {
    name: "budgetItems",
    path: "budget-items",
    model: "budgetItem",
    section: "budget",
    prop: "items",
    publicFields: ["id", "label", "minPriceLakh", "maxPriceLakh"],
  },
  {
    name: "testimonials",
    path: "testimonials",
    model: "testimonial",
    section: "testimonials",
    prop: "items",
    publicFields: ["id", "name", "location", "car", "rating", "review", "avatarUrl"],
  },
];

// Icons an item may use. The frontend maps each key to a lucide-react component, so keep the two
// lists in step (the admin UI offers exactly what GET /api/cms/home/meta returns).
const ICON_KEYS = [
  "shield-check",
  "eye",
  "gem",
  "compass",
  "clipboard-list",
  "handshake",
  "search",
  "sliders-horizontal",
  "message-circle",
  "badge-check",
  "car",
  "key-round",
  "wallet",
  "banknote",
  "tag",
  "thumbs-up",
  "star",
  "heart",
  "award",
  "sparkles",
  "zap",
  "lock",
  "clock",
  "calendar-check",
  "file-check",
  "wrench",
  "gauge",
  "map-pin",
  "phone",
  "headset",
  "users",
];

module.exports = { TEXT_LIMITS, SECTIONS, COLLECTIONS, ICON_KEYS };
