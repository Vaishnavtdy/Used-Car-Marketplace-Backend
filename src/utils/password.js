const bcrypt = require("bcrypt");
const env = require("../config/env");

const hashPassword = (plain) => bcrypt.hash(plain, env.BCRYPT_ROUNDS);

const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

// Compared against when the account doesn't exist, so response time doesn't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", env.BCRYPT_ROUNDS);
const verifyDummyPassword = (plain) => bcrypt.compare(plain, DUMMY_HASH);

module.exports = { hashPassword, verifyPassword, verifyDummyPassword };
