const express = require("express");
const controller = require("../controllers/homeCms.controller");
const authenticate = require("../middleware/authenticate");
const { ADMIN_ROLES, requireRole } = require("../middleware/authorize");
const validate = require("../middleware/validate");
const v = require("../validators/homeCms.validators");
const { SECTIONS, COLLECTIONS } = require("../config/homeCms");

const router = express.Router();

// The one public endpoint: what the website renders (active items only, in order).
router.get("/", controller.publicContent);

// Everything below is for admins. Reads are admin-only too, because collections list inactive
// items as well.
router.use(authenticate(), requireRole(...ADMIN_ROLES));

router.get("/meta", controller.meta);

// Single-instance sections: GET + PUT only. There is deliberately no POST or DELETE.
for (const { key, path } of SECTIONS) {
  const handlers = controller.section(key);
  router.get(`/${path}`, handlers.get);
  router.put(`/${path}`, validate({ body: v.sections[key] }), handlers.update);
}

// Repeatable collections: full CRUD. PUT /:id takes any subset of the fields, so it also serves
// enable/disable ({ "isActive": false }) and moving one item ({ "displayOrder": 3 }).
for (const { name, path } of COLLECTIONS) {
  const handlers = controller.collection(name);
  const schemas = v.collections[name];

  router.get(`/${path}`, handlers.list);
  router.post(`/${path}`, validate({ body: schemas.create }), handlers.create);
  // Declared before "/:id" so "reorder" isn't parsed as an id
  router.put(`/${path}/reorder`, validate({ body: v.reorder }), handlers.reorder);
  router.put(
    `/${path}/:id`,
    validate({ params: v.idParam, body: schemas.update }),
    handlers.update
  );
  router.delete(`/${path}/:id`, validate({ params: v.idParam }), handlers.remove);
}

module.exports = router;
