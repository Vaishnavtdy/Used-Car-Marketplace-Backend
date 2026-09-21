// Imports the demo inventory (the 26 cars the storefront originally shipped with) as published
// listings, so a fresh install has something to browse. Safe to run repeatedly: a car whose title
// already exists is skipped.
//
//   npm run seed:demo-cars
//
// Listings are owned by the super admin (or by IMPORT_SELLER_EMAIL if set), each with one photo
// stored as an external URL, and the brands they need are added to the master list first.
const prisma = require("../src/config/db");
const cars = require("./demo-cars.json");

const titleOf = (car) => `${car.year} ${car.brand} ${car.model} ${car.variant}`;

const findSeller = async () => {
  const email = process.env.IMPORT_SELLER_EMAIL;
  const seller = email
    ? await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    : await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }, orderBy: { id: "asc" } });
  if (!seller) {
    throw new Error(
      email
        ? `No user with email ${email}.`
        : "No super admin exists to own the listings. Run `npm run seed:admin` first."
    );
  }
  return seller;
};

// Brand names are unique ignoring case, so look up the same way.
const brandId = async (name, cache) => {
  const key = name.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const existing = await prisma.brand.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  const brand = existing ?? (await prisma.brand.create({ data: { name } }));
  cache.set(key, brand.id);
  return brand.id;
};

const main = async () => {
  const seller = await findSeller();
  const brands = new Map();
  let created = 0;
  let skipped = 0;

  // Oldest first, so the newest listing is also the last one created and sorts first when two
  // share a publish date.
  for (const car of [...cars].reverse()) {
    const title = titleOf(car);
    if (await prisma.car.findFirst({ where: { title }, select: { id: true } })) {
      skipped++;
      continue;
    }

    await prisma.car.create({
      data: {
        sellerId: seller.id,
        brandId: await brandId(car.brand, brands),
        title,
        description: car.description,
        model: car.model,
        variant: car.variant,
        year: car.year,
        registrationYear: car.registrationYear,
        price: car.price,
        mileage: car.mileage,
        fuelType: car.fuelType,
        transmission: car.transmission,
        bodyType: car.bodyType,
        engine: car.engine,
        power: car.power,
        ownership: car.ownership,
        color: car.color,
        registrationCity: car.registrationCity,
        isFeatured: car.isFeatured,
        status: "ACTIVE",
        publishedAt: new Date(`${car.publishedAt}T09:00:00Z`),
        images: { create: { url: car.imageUrl, position: 0, isPrimary: true } },
        features: {
          create: car.features.map((feature, position) => ({ ...feature, position })),
        },
      },
    });
    created++;
  }

  console.log(`Demo cars: ${created} added, ${skipped} already there (owner: ${seller.email}).`);
};

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
