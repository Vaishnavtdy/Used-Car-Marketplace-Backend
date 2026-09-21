const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");

const brandSelect = { id: true, name: true };

// Names are unique ignoring case, enforced by the Brand_name_lower_key index.
const duplicateName = () => ApiError.conflict("A brand with this name already exists");

// The full list is small and fixed, so it is not paginated. carCount covers ACTIVE listings only.
const list = async () => {
  const brands = await prisma.brand.findMany({
    select: { ...brandSelect, _count: { select: { cars: { where: { status: "ACTIVE" } } } } },
    orderBy: { name: "asc" },
  });
  return brands.map(({ _count, ...brand }) => ({ ...brand, carCount: _count.cars }));
};

const create = async ({ name }) => {
  try {
    return await prisma.brand.create({ data: { name }, select: brandSelect });
  } catch (err) {
    if (err.code === "P2002") throw duplicateName();
    throw err;
  }
};

// Prisma raises P2025 for an unknown id, which the error handler turns into a 404.
const update = async (id, { name }) => {
  try {
    return await prisma.brand.update({ where: { id }, data: { name }, select: brandSelect });
  } catch (err) {
    if (err.code === "P2002") throw duplicateName();
    throw err;
  }
};

// The foreign key is ON DELETE RESTRICT, so a brand that still has cars cannot be removed.
const remove = async (id) => {
  try {
    await prisma.brand.delete({ where: { id } });
  } catch (err) {
    if (err.code === "P2003") {
      throw new ApiError(409, "This brand still has cars. Move or delete them first.", {
        code: "BRAND_IN_USE",
      });
    }
    throw err;
  }
};

module.exports = { list, create, update, remove };
