const cms = require("../services/homeCms.service");
const response = require("../utils/response");

const publicContent = async (req, res) => {
  response.ok(res, await cms.getPublicContent());
};

const meta = (req, res) => {
  response.ok(res, cms.getMeta());
};

// One controller per single-instance section: read and edit, nothing else.
const section = (key) => ({
  get: async (req, res) => {
    response.ok(res, await cms.getSection(key));
  },
  update: async (req, res) => {
    response.ok(res, await cms.updateSection(key, req.validated.body));
  },
});

// One controller per repeatable collection: full CRUD plus reorder.
const collection = (name) => {
  const service = cms.collections[name];
  return {
    list: async (req, res) => {
      response.ok(res, await service.list());
    },
    create: async (req, res) => {
      response.created(res, await service.create(req.validated.body));
    },
    update: async (req, res) => {
      response.ok(res, await service.update(req.validated.params.id, req.validated.body));
    },
    remove: async (req, res) => {
      await service.remove(req.validated.params.id);
      response.noContent(res);
    },
    reorder: async (req, res) => {
      response.ok(res, await service.reorder(req.validated.body.ids));
    },
  };
};

module.exports = { publicContent, meta, section, collection };
