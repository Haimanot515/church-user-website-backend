const { db, makeReq, makeRes, flush } = require("./helpers/unit");
const test = require("node:test");
const assert = require("node:assert/strict");
const auditService = require("../services/auditService");
const audit = require("../middleware/audit");
const { redact } = require("../utils/auditRedaction");

const actor = { id: "u1", email: "a@example.com", role: "admin", sessionId: "s1" };

test("redaction hides secrets by key name and signed URLs by value", () => {
  const out = redact({
    password: "p",
    refreshToken: "t",
    reauthCredential: "c",
    nested: { apiKey: "k", note: "fine", url: "https://x.test/f?token=abc" },
    list: [{ otp: "123" }],
  });
  assert.equal(out.password, "[REDACTED]");
  assert.equal(out.refreshToken, "[REDACTED]");
  assert.equal(out.reauthCredential, "[REDACTED]");
  assert.equal(out.nested.apiKey, "[REDACTED]");
  assert.equal(out.nested.note, "fine");
  assert.equal(out.nested.url, "[REDACTED]");
  assert.equal(out.list[0].otp, "[REDACTED]");
});

test("entries are normalised, redacted and size-limited", async () => {
  await auditService.record({
    action: "x.test",
    outcome: "weird",
    severity: "loud",
    diff: { password: "secret", ok: 1 },
    metadata: { blob: "a".repeat(9000) },
    entityId: 42,
  });
  const row = db.auditLogs.at(-1);
  assert.equal(row.outcome, "success");
  assert.equal(row.severity, "info");
  assert.equal(row.diff.password, "[REDACTED]");
  assert.deepEqual(row.metadata, { truncated: true });
  assert.equal(row.entityId, "42");
});

test("a failing audit store never breaks the request", async () => {
  db.failAuditWrites = true;
  const originalError = console.error;
  console.error = () => {};
  try {
    await assert.doesNotReject(auditService.record({ action: "x.fail" }));
  } finally {
    console.error = originalError;
    db.failAuditWrites = false;
  }
});

test("route audit logs the verb, outcome, entity id and field names only", async () => {
  const req = makeReq({
    user: actor,
    body: { title: "Secret sermon text", password: "p" },
    params: {},
    id: "req-12345678",
  });
  const res = makeRes();
  let nextCalled = false;
  audit("ChurchStory")(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, true);
  res.status(201).json({ id: "new-id", title: "Secret sermon text" });
  await flush();
  const row = db.auditLogs.at(-1);
  assert.equal(row.action, "church_story.create");
  assert.equal(row.outcome, "success");
  assert.equal(row.entityId, "new-id");
  assert.equal(row.actorId, "u1");
  assert.equal(row.requestId, "req-12345678");
  assert.deepEqual(row.metadata.fields, ["title", "password"]);
  assert.equal(JSON.stringify(row).includes("Secret sermon text"), false);
});

test("route audit maps statuses to outcomes, uses route ids, and skips plain GETs", async () => {
  const run = async (req, status, options) => {
    const res = makeRes();
    audit("Post", options)(req, res, () => {});
    res.status(status).json({});
    await flush();
  };
  const before = db.auditLogs.length;
  await run(makeReq({ user: actor, method: "PUT", params: { id: "p1" } }), 404);
  await run(makeReq({ user: actor, method: "DELETE", params: { id: "p2" } }), 403);
  assert.equal(db.auditLogs[before].outcome, "failure");
  assert.equal(db.auditLogs[before].entityId, "p1");
  assert.equal(db.auditLogs[before + 1].outcome, "denied");
  assert.equal(db.auditLogs[before + 1].action, "post.delete");

  await run(makeReq({ user: actor, method: "GET" }), 200);
  assert.equal(db.auditLogs.length, before + 2);
  await run(makeReq({ user: actor, method: "GET" }), 200, { action: "post.export" });
  assert.equal(db.auditLogs.at(-1).action, "post.export");
});

test("route audit stays quiet when another middleware already recorded the event", async () => {
  const res = makeRes();
  audit("Post")(makeReq({ user: actor }), res, () => {});
  res.locals.auditHandled = true;
  const before = db.auditLogs.length;
  res.status(403).json({});
  await flush();
  assert.equal(db.auditLogs.length, before);
});

test("audit log listing filters and paginates, newest first", async () => {
  db.auditLogs.length = 0;
  for (let i = 0; i < 30; i++) {
    db.auditLogs.push({
      id: `l${i}`,
      createdAt: new Date(Date.now() + i * 1000),
      action: i % 2 ? "a.odd" : "a.even",
      actorId: "u1",
      outcome: "success",
    });
  }
  const page = await auditService.list({ limit: "10", page: "2" });
  assert.equal(page.total, 30);
  assert.equal(page.logs.length, 10);
  assert.equal(page.totalPages, 3);
  assert.equal(page.logs[0].id, "l19");
  const filtered = await auditService.list({ action: "a.odd", limit: "100" });
  assert.equal(filtered.total, 15);
  assert.equal((await auditService.list({ from: "garbage", limit: "5" })).logs.length, 5);
});
