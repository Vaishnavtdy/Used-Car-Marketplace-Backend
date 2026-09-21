const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const { randomUUID } = require("../utils/crypto");
const { detectImageType } = require("../utils/imageType");
const storage = require("./storage.service");

const MAX_IMAGES_PER_CAR = 10;

// Never expose storageKey; clients only need the public url.
const imageSelect = { id: true, url: true, isPrimary: true, position: true };

const listForCar = (carId) =>
  prisma.carImage.findMany({
    where: { carId },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: imageSelect,
  });

const assertCarExists = async (carId) => {
  const car = await prisma.car.findUnique({ where: { id: carId }, select: { id: true } });
  if (!car) throw ApiError.notFound("Car not found");
};

const findImageOrThrow = async (carId, imageId) => {
  const image = await prisma.carImage.findFirst({ where: { id: imageId, carId } });
  if (!image) throw ApiError.notFound("Image not found");
  return image;
};

// Validates every file by content, writes them to storage, then records them in one transaction.
// The first image of a car becomes its primary image. If the database write fails the files are removed.
const upload = async (carId, files) => {
  if (!files?.length) {
    throw new ApiError(422, 'At least one image is required (multipart field "images")', {
      code: "NO_FILES",
    });
  }

  const validated = files.map((file, index) => {
    const type = detectImageType(file.buffer);
    if (!type) {
      throw new ApiError(422, `File ${index + 1} is not a valid JPEG, PNG or WebP image`, {
        code: "INVALID_IMAGE",
      });
    }
    return { buffer: file.buffer, key: `cars/${carId}/${randomUUID()}.${type.ext}` };
  });

  await assertCarExists(carId);

  const existing = await prisma.carImage.findMany({
    where: { carId },
    select: { position: true, isPrimary: true },
  });
  if (existing.length + validated.length > MAX_IMAGES_PER_CAR) {
    throw new ApiError(422, `A car can have at most ${MAX_IMAGES_PER_CAR} images`, {
      code: "TOO_MANY_IMAGES",
    });
  }

  const nextPosition = existing.reduce((max, image) => Math.max(max, image.position + 1), 0);
  const hasPrimary = existing.some((image) => image.isPrimary);

  try {
    await Promise.all(validated.map((file) => storage.save(file.key, file.buffer)));
    await prisma.$transaction(
      validated.map((file, index) =>
        prisma.carImage.create({
          data: {
            carId,
            url: storage.publicUrl(file.key),
            storageKey: file.key,
            position: nextPosition + index,
            isPrimary: !hasPrimary && index === 0,
          },
        })
      )
    );
  } catch (err) {
    await Promise.all(
      validated.map((file) => storage.removeQuietly(() => storage.remove(file.key)))
    );
    throw err;
  }

  return listForCar(carId);
};

const setPrimary = async (carId, imageId) => {
  await findImageOrThrow(carId, imageId);

  // Unset first: the partial unique index allows only one primary image per car at a time.
  await prisma.$transaction([
    prisma.carImage.updateMany({ where: { carId, isPrimary: true }, data: { isPrimary: false } }),
    prisma.carImage.update({ where: { id: imageId }, data: { isPrimary: true } }),
  ]);

  return listForCar(carId);
};

const remove = async (carId, imageId) => {
  const image = await findImageOrThrow(carId, imageId);

  await prisma.$transaction(async (tx) => {
    await tx.carImage.delete({ where: { id: imageId } });

    if (image.isPrimary) {
      const next = await tx.carImage.findFirst({
        where: { carId },
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: { id: true },
      });
      if (next) await tx.carImage.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
  });

  // Only files this API stored have a key; a photo at an external URL has nothing to clean up.
  if (image.storageKey) await storage.removeQuietly(() => storage.remove(image.storageKey));

  return listForCar(carId);
};

module.exports = { upload, setPrimary, remove, MAX_IMAGES_PER_CAR };
