const carService = require("../services/car.service");
const { isAdmin } = require("../middleware/authorize");
const response = require("../utils/response");

// Public catalogue: ACTIVE listings only.
const list = async (req, res) => {
  const { items, pagination } = await carService.list(req.validated.query, { publicOnly: true });
  response.paginated(res, items, pagination);
};

// Admin view: every status, with status/seller filters.
const manage = async (req, res) => {
  const { items, pagination } = await carService.list(req.validated.query, { publicOnly: false });
  response.paginated(res, items, pagination);
};

const getById = async (req, res) => {
  const car = await carService.getById(req.validated.params.id, {
    includeAllStatuses: isAdmin(req.user),
  });
  response.ok(res, car);
};

const create = async (req, res) => {
  response.created(res, await carService.create(req.user, req.validated.body));
};

const update = async (req, res) => {
  response.ok(res, await carService.update(req.validated.params.id, req.validated.body));
};

const changeStatus = async (req, res) => {
  const car = await carService.changeStatus(req.validated.params.id, req.validated.body.status);
  response.ok(res, car);
};

const remove = async (req, res) => {
  await carService.remove(req.validated.params.id);
  response.noContent(res);
};

const facets = async (req, res) => {
  response.ok(res, await carService.facets());
};

module.exports = { list, manage, getById, create, update, changeStatus, remove, facets };
