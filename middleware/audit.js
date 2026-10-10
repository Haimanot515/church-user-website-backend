const auditService = require("../services/auditService");

const VERBS = { POST: "create", PUT: "update", PATCH: "update", DELETE: "delete" };

const slug = (entity) => entity.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

const outcomeFor = (status) => {
  if (status < 400) return "success";
  return status === 401 || status === 403 ? "denied" : "failure";
};

const bodyId = (res) => {
  const body = res.locals.auditBody;
  return body && typeof body === "object" && body.id !== undefined ? body.id : undefined;
};

module.exports =
  (entity, options = {}) =>
  (req, res, next) => {
    if (req.method === "GET" && !options.action) return next();

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      res.locals.auditBody = body;
      return originalJson(body);
    };

    res.on("finish", () => {
      if (res.locals.auditHandled) return;
      const verb = VERBS[req.method] || req.method.toLowerCase();
      const resolved = options.entityId ? options.entityId(req, res) : undefined;
      const fields =
        req.body && typeof req.body === "object" ? Object.keys(req.body).slice(0, 30) : [];
      auditService.event(req, options.action || `${slug(entity)}.${verb}`, {
        outcome: outcomeFor(res.statusCode),
        severity: options.severity || "info",
        entity,
        entityId:
          resolved !== undefined
            ? resolved
            : req.params.id !== undefined
              ? req.params.id
              : bodyId(res),
        metadata: {
          method: req.method,
          path: (req.baseUrl || "") + (req.route ? req.route.path : ""),
          status: res.statusCode,
          fields,
        },
      });
    });

    next();
  };
