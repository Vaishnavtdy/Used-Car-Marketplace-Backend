const multer = require("multer");

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 10;

// Files are buffered in memory so their content can be validated (magic bytes) before anything
// touches the disk. Limits keep memory bounded: at most 10 x 5 MB per request.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_FILES_PER_REQUEST, fields: 0 },
});

// Multipart field name: "images". Multer errors are translated by the error handler.
const uploadImages = upload.array("images", MAX_FILES_PER_REQUEST);

// The site logo: one file, same size limit as any other image upload. Multipart field name: "logo".
const uploadLogo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0 },
}).single("logo");

module.exports = { uploadImages, uploadLogo, MAX_IMAGE_BYTES, MAX_FILES_PER_REQUEST };
