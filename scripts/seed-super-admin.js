// Creates the initial SUPER_ADMIN. Safe to run repeatedly: does nothing if one already exists.
//
//   SUPER_ADMIN_EMAIL=owner@example.com SUPER_ADMIN_PASSWORD='...' npm run seed:admin
//
// The account is flagged mustChangePassword, so the password supplied here is only a bootstrap secret.
const { z } = require("zod");
const prisma = require("../src/config/db");
const { hashPassword } = require("../src/utils/password");
const common = require("../src/validators/common");

const input = z.object({
  email: common.email,
  password: common.password,
  name: common.name.default("Super Admin"),
});

const main = async () => {
  const existing = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (existing) {
    console.log(`A super admin already exists (${existing.email}). Nothing to do.`);
    return;
  }

  const parsed = input.safeParse({
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
    name: process.env.SUPER_ADMIN_NAME || undefined,
  });
  if (!parsed.success) {
    const details = parsed.error.issues.map(
      (issue) => `  - SUPER_ADMIN_${String(issue.path[0]).toUpperCase()}: ${issue.message}`
    );
    throw new Error(`Invalid super admin configuration:\n${details.join("\n")}`);
  }

  const { email, password, name } = parsed.data;

  if (await prisma.user.findUnique({ where: { email } })) {
    throw new Error(
      `${email} is already registered as a non-super-admin account. Use a different email.`
    );
  }

  await prisma.user.create({
    data: {
      name,
      email,
      role: "SUPER_ADMIN",
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
    },
  });

  console.log(`Super admin created: ${email} (password change required on first login).`);
};

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
