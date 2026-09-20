const userService = require("../services/user.service");
const response = require("../utils/response");

const list = async (req, res) => {
  const { items, pagination } = await userService.list(req.validated.query);
  response.paginated(res, items, pagination);
};

const getById = async (req, res) => {
  response.ok(res, await userService.getById(req.validated.params.id));
};

const create = async (req, res) => {
  response.created(res, await userService.create(req.user, req.validated.body));
};

const update = async (req, res) => {
  const user = await userService.update(req.user, req.validated.params.id, req.validated.body);
  response.ok(res, user);
};

const resetPassword = async (req, res) => {
  await userService.resetPassword(req.user, req.validated.params.id, req.validated.body.password);
  response.message(res, "Password reset. The user must change it on next login.");
};

const updateMe = async (req, res) => {
  response.ok(res, await userService.updateMe(req.user.id, req.validated.body));
};

module.exports = { list, getById, create, update, resetPassword, updateMe };
