const service = require("../services/siteSettings.service");
const response = require("../utils/response");

const publicGet = async (req, res) => {
  response.ok(res, await service.getPublic());
};

const updateBrandName = async (req, res) => {
  response.ok(res, await service.updateBrandName(req.validated.body.brandName));
};

const uploadLogo = async (req, res) => {
  response.ok(res, await service.uploadLogo(req.file));
};

const removeLogo = async (req, res) => {
  response.ok(res, await service.removeLogo());
};

module.exports = { publicGet, updateBrandName, uploadLogo, removeLogo };
