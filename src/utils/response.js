// Standard success envelope: { success: true, data?, message?, pagination? }.
// Errors are produced only by the error handler.

const ok = (res, data) => res.json({ success: true, data });

const created = (res, data) => res.status(201).json({ success: true, data });

const message = (res, text) => res.json({ success: true, message: text });

const paginated = (res, items, pagination) => res.json({ success: true, data: items, pagination });

const noContent = (res) => res.status(204).end();

// Builds the pagination block returned alongside list results.
const pageInfo = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

module.exports = { ok, created, message, paginated, noContent, pageInfo };
