const crypto = require("crypto");

const generateToken = (bytes = 48) => crypto.randomBytes(bytes).toString("base64url");

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

module.exports = { generateToken, sha256, randomUUID: crypto.randomUUID };
