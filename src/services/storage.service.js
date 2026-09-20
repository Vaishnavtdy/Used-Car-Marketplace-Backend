// Local-disk file storage. Keep the interface (save / remove / removePrefix / publicUrl) small
// so it can be swapped for an S3-compatible adapter without touching callers.
const fs = require("fs/promises");
const path = require("path");
const env = require("../config/env");

// Keys are built by the server (ids + UUIDs), but resolve defensively so a key can never escape UPLOAD_DIR.
const resolveKey = (key) => {
  const full = path.resolve(env.UPLOAD_DIR, key);
  if (!full.startsWith(env.UPLOAD_DIR + path.sep)) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return full;
};

const save = async (key, buffer) => {
  const full = resolveKey(key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buffer, { flag: "wx" });
};

const remove = (key) => fs.rm(resolveKey(key), { force: true });

// Removes everything under a key prefix, e.g. all images of one car.
const removePrefix = (prefix) => fs.rm(resolveKey(prefix), { recursive: true, force: true });

// Cleanup after the database is already consistent must never fail the request; log and move on.
const removeQuietly = async (operation) => {
  try {
    await operation();
  } catch (err) {
    console.error("Storage cleanup failed:", err);
  }
};

const publicUrl = (key) => `/uploads/${key}`;

module.exports = { save, remove, removePrefix, removeQuietly, publicUrl };
