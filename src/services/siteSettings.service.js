const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const { randomUUID } = require("../utils/crypto");
const { detectImageType } = require("../utils/imageType");
const storage = require("./storage.service");

// A fixed single row, created by the site_settings migration; never inserted or deleted here.
const SETTINGS_ID = 1;

const missingSettings = () =>
  new ApiError(404, "Site settings not found. Has the site_settings migration been applied?", {
    code: "SETTINGS_NOT_FOUND",
  });

const requireRow = async () => {
  const row = await prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!row) throw missingSettings();
  return row;
};

// logoStorageKey is an internal detail (which file to delete on replace/remove); never returned.
const toPublic = (row) => ({
  brandName: row.brandName,
  logoUrl: row.logoUrl,
  updatedAt: row.updatedAt,
});

const noIdentityError = () =>
  ApiError.unprocessable("Validation failed", {
    code: "VALIDATION_ERROR",
    details: [{ path: "brandName", message: "Set a brand name or a logo (or both)." }],
  });

const getPublic = async () => toPublic(await requireRow());

// Text only; the logo is managed by uploadLogo / removeLogo below. Rejected if this would leave
// the site with neither a name nor a logo.
const updateBrandName = async (brandName) => {
  const row = await requireRow();
  if (!brandName && !row.logoUrl) throw noIdentityError();

  const updated = await prisma.siteSettings.update({ where: { id: SETTINGS_ID }, data: { brandName } });
  return toPublic(updated);
};

// Always safe: adding a logo never removes the site's only identity. Replaces any existing logo
// file once the new one is safely recorded, so a mid-write failure never leaves the site with no
// logo file for a URL it's still pointing at.
const uploadLogo = async (file) => {
  if (!file) {
    throw new ApiError(422, 'A logo image is required (multipart field "logo")', { code: "NO_FILE" });
  }
  const type = detectImageType(file.buffer);
  if (!type) {
    throw new ApiError(422, "File is not a valid JPEG, PNG or WebP image", { code: "INVALID_IMAGE" });
  }

  const row = await requireRow();
  const key = `branding/${randomUUID()}.${type.ext}`;

  await storage.save(key, file.buffer);

  let updated;
  try {
    updated = await prisma.siteSettings.update({
      where: { id: SETTINGS_ID },
      data: { logoUrl: storage.publicUrl(key), logoStorageKey: key },
    });
  } catch (err) {
    await storage.removeQuietly(() => storage.remove(key));
    throw err;
  }

  if (row.logoStorageKey) await storage.removeQuietly(() => storage.remove(row.logoStorageKey));
  return toPublic(updated);
};

// Rejected if the site has no brand name to fall back on, since that would leave nothing to show.
const removeLogo = async () => {
  const row = await requireRow();
  if (!row.logoUrl) return toPublic(row);
  if (!row.brandName) throw noIdentityError();

  const updated = await prisma.siteSettings.update({
    where: { id: SETTINGS_ID },
    data: { logoUrl: null, logoStorageKey: null },
  });
  if (row.logoStorageKey) await storage.removeQuietly(() => storage.remove(row.logoStorageKey));
  return toPublic(updated);
};

module.exports = { getPublic, updateBrandName, uploadLogo, removeLogo };
