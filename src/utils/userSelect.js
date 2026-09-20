// Fields safe to return to clients. Never expose passwordHash or lockout internals.
const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
};

module.exports = { publicUserSelect };
