const carImageService = require("../services/carImage.service");
const response = require("../utils/response");

const upload = async (req, res) => {
  const images = await carImageService.upload(req.validated.params.id, req.files);
  response.created(res, images);
};

const setPrimary = async (req, res) => {
  const { id, imageId } = req.validated.params;
  response.ok(res, await carImageService.setPrimary(id, imageId));
};

const remove = async (req, res) => {
  const { id, imageId } = req.validated.params;
  response.ok(res, await carImageService.remove(id, imageId));
};

module.exports = { upload, setPrimary, remove };
