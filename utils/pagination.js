// Safe pagination: positive integers only, with a hard upper bound.
const toPositiveInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

exports.parsePagination = (query = {}, { defaultLimit = 10, maxLimit = 100 } = {}) => {
  const page = Math.min(toPositiveInt(query.page, 1), 100000);
  const limit = Math.min(toPositiveInt(query.limit, defaultLimit), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};

// For cursor endpoints that only need a bounded limit.
exports.parseLimit = (value, { defaultLimit = 20, maxLimit = 100 } = {}) =>
  Math.min(toPositiveInt(value, defaultLimit), maxLimit);
