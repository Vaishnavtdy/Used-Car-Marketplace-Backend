const brandService = require("../services/brand.service");
const response = require("../utils/response");

const list = async (req, res) => {
  response.ok(res, await brandService.list());
};

const create = async (req, res) => {
  response.created(res, await brandService.create(req.validated.body));
};

const update = async (req, res) => {
  response.ok(res, await brandService.update(req.validated.params.id, req.validated.body));
};

const remove = async (req, res) => {
  await brandService.remove(req.validated.params.id);
  response.noContent(res);
};

module.exports = { list, create, update, remove };
