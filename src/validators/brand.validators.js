const { z } = require("zod");
const { idParam } = require("./common");

const createBrand = z.object({ name: z.string().trim().min(1).max(50) });

const updateBrand = createBrand;

module.exports = { idParam, createBrand, updateBrand };
