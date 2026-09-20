const { z } = require("zod");
const { email, password, name, phone } = require("./common");

const register = z.object({
  name,
  email,
  password,
  phone: phone.optional(),
  role: z.enum(["USER", "DEALER"]).default("USER"),
});

const login = z.object({
  email,
  password: z.string().min(1).max(128),
});

const changePassword = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: password,
});

module.exports = { register, login, changePassword };
