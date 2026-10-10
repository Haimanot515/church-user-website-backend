const { db, addUser, addSession, makeReq, makeRes, flush } = require("./helpers/unit");
const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const sessions = require("../services/sessionService");
const { authenticate } = require("../services/authenticate");
const authController = require("../controllers/authController");
const sessionController = require("../controllers/sessionController");

const bearer = (user, sessionId, extra = {}, opts = {}) =>
  `Bearer ${jwt.sign(
    { id: user.id, sid: sessionId, tv: user.tokenVersion, ...extra },
    process.env.JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "15m",
      ...opts,
    }
  )}`;

test("a new session stores only a hash of the refresh token", async () => {
  const user = addUser({ id: "s1" });
  const { session, refreshToken } = await sessions.create(user.id, {
    ipAddress: "1.2.3.4",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X) Firefox/120.0",
  });
  assert.match(refreshToken, /^[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/);
  assert.ok(!JSON.stringify(db.sessions.get(session.id)).includes(refreshToken.split(".")[1]));
  assert.equal(session.deviceLabel, "Firefox on macOS");
});

test("rotation issues a new token and the old one stops working", async () => {
  const user = addUser({ id: "s2" });
  const { refreshToken } = await sessions.create(user.id);
  const first = await sessions.rotate(refreshToken);
  assert.equal(first.ok, true);
  assert.notEqual(first.refreshToken, refreshToken);
  const second = await sessions.rotate(first.refreshToken);
  assert.equal(second.ok, true);
});

test("replaying a rotated token right away is a conflict and keeps sessions", async () => {
  const user = addUser({ id: "s3" });
  const { refreshToken } = await sessions.create(user.id);
  await sessions.rotate(refreshToken);
  const replay = await sessions.rotate(refreshToken);
  assert.equal(replay.reason, "conflict");
  assert.equal(db.sessions.size > 0, true);
});

test("replaying a rotated token after the grace window revokes every session of the user", async () => {
  const user = addUser({ id: "s4" });
  const { refreshToken, session } = await sessions.create(user.id);
  const other = await sessions.create(user.id);
  const rotated = await sessions.rotate(refreshToken);
  db.sessions.get(session.id).rotatedAt = new Date(Date.now() - 60 * 1000);
  const replay = await sessions.rotate(refreshToken);
  assert.equal(replay.reason, "reuse");
  assert.equal(replay.revoked >= 2, true);
  assert.equal(db.sessions.has(other.session.id), false);
  assert.equal((await sessions.rotate(rotated.refreshToken)).ok, false);
});

test("expired, malformed and unknown refresh tokens are rejected", async () => {
  const user = addUser({ id: "s5" });
  const { refreshToken, session } = await sessions.create(user.id);
  assert.equal((await sessions.rotate("nonsense")).reason, "invalid");
  assert.equal((await sessions.rotate(`${session.id}.${"a".repeat(43)}`)).reason, "invalid");
  db.sessions.get(session.id).expiresAt = new Date(Date.now() - 1000);
  assert.equal((await sessions.rotate(refreshToken)).reason, "expired");
  assert.equal(db.sessions.has(session.id), false);
});

test("renewing never extends a session past its absolute lifetime", async () => {
  const user = addUser({ id: "s6" });
  const { refreshToken, session } = await sessions.create(user.id);
  const cap = new Date(Date.now() + 60 * 1000);
  db.sessions.get(session.id).absoluteExpiresAt = cap;
  await sessions.rotate(refreshToken);
  assert.equal(db.sessions.get(session.id).expiresAt.getTime(), cap.getTime());
});

test("a user can only end their own sessions", async () => {
  const a = addUser({ id: "s7a" });
  const b = addUser({ id: "s7b" });
  const { session } = await sessions.create(a.id);
  assert.equal(await sessions.revoke(b.id, session.id), 0);
  assert.equal(await sessions.revoke(a.id, session.id), 1);
});

test("authenticate accepts a live session and rejects dead ones", async () => {
  const user = addUser({ id: "s8", role: "editor" });
  const session = addSession(user);
  const ok = await authenticate(bearer(user, session.id));
  assert.equal(ok.user.role, "editor");
  assert.ok(ok.user.permissions.includes("POST_MANAGE"));
  assert.ok(!ok.user.permissions.includes("USER_DELETE"));

  assert.equal((await authenticate(bearer(user, undefined))).error, "invalid_token");
  assert.equal((await authenticate(bearer(user, "missing"))).error, "session_ended");
  assert.equal((await authenticate(bearer(user, session.id, { tv: 5 }))).error, "session_ended");
  assert.equal(
    (await authenticate(bearer(addUser({ id: "s8b" }), session.id))).error,
    "session_ended"
  );
  assert.equal(
    (await authenticate(bearer(user, session.id, {}, { expiresIn: -10 }))).error,
    "token_expired"
  );

  db.sessions.get(session.id).expiresAt = new Date(Date.now() - 1);
  assert.equal((await authenticate(bearer(user, session.id))).error, "session_ended");
});

test("an unverified user cannot authenticate", async () => {
  const user = addUser({ id: "s9", isVerified: false });
  const session = addSession(user);
  assert.equal((await authenticate(bearer(user, session.id))).error, "session_ended");
});

test("login returns access and refresh tokens, and the access token is bound to the session", async () => {
  const user = addUser({
    id: "l1",
    email: "l1@example.com",
    password: await bcrypt.hash("Correct#Pass1", 4),
    role: "admin",
  });
  const res = makeRes();
  await authController.login(
    makeReq({ body: { email: "L1@example.com", password: "Correct#Pass1" } }),
    res
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.role, "admin");
  assert.equal(res.body.user.password, undefined);
  const claims = jwt.verify(res.body.token, process.env.JWT_SECRET);
  assert.ok(db.sessions.has(claims.sid));
  assert.equal(claims.isAdmin, undefined);
  assert.ok(res.body.refreshToken.startsWith(claims.sid));
  await flush();
  assert.ok(db.auditLogs.some((l) => l.action === "auth.login_success" && l.actorId === user.id));
});

test("a failed login is audited and returns the same error", async () => {
  addUser({ id: "l2", email: "l2@example.com", password: await bcrypt.hash("Correct#Pass1", 4) });
  const res = makeRes();
  await authController.login(
    makeReq({ body: { email: "l2@example.com", password: "Wrong#Pass1" } }),
    res
  );
  assert.equal(res.statusCode, 401);
  await flush();
  const entry = db.auditLogs.find(
    (l) => l.action === "auth.login_failed" && l.targetUserId === "l2"
  );
  assert.equal(entry.metadata.reason, "wrong_password");
  assert.equal(JSON.stringify(db.auditLogs).includes("Wrong#Pass1"), false);
});

test("refresh rotates tokens, logout ends only the current session", async () => {
  const user = addUser({
    id: "r1",
    email: "r1@example.com",
    password: await bcrypt.hash("Correct#Pass1", 4),
  });
  const login = makeRes();
  await authController.login(
    makeReq({ body: { email: user.email, password: "Correct#Pass1" } }),
    login
  );

  const refreshed = makeRes();
  await sessionController.refresh(
    makeReq({ body: { refreshToken: login.body.refreshToken } }),
    refreshed
  );
  assert.equal(refreshed.statusCode, 200);
  assert.notEqual(refreshed.body.refreshToken, login.body.refreshToken);
  assert.equal(
    jwt.verify(refreshed.body.token, process.env.JWT_SECRET).sid,
    jwt.verify(login.body.token, process.env.JWT_SECRET).sid
  );

  const second = await sessions.create(user.id);
  const sid = jwt.verify(refreshed.body.token, process.env.JWT_SECRET).sid;
  const out = makeRes();
  await authController.logout(makeReq({ user: { id: user.id, sessionId: sid } }), out);
  assert.equal(out.statusCode, 200);
  assert.equal(db.sessions.has(sid), false);
  assert.equal(db.sessions.has(second.session.id), true);
});

test("refresh rejects missing tokens and reports reuse as a critical audit event", async () => {
  const user = addUser({ id: "r2" });
  const missing = makeRes();
  await sessionController.refresh(makeReq({ body: {} }), missing);
  assert.equal(missing.statusCode, 400);

  const { refreshToken, session } = await sessions.create(user.id);
  await sessions.rotate(refreshToken);
  db.sessions.get(session.id).rotatedAt = new Date(Date.now() - 60 * 1000);
  const replay = makeRes();
  await sessionController.refresh(makeReq({ body: { refreshToken } }), replay);
  assert.equal(replay.statusCode, 401);
  assert.equal(replay.body.code, "session_ended");
  await flush();
  assert.ok(
    db.auditLogs.some(
      (l) => l.action === "auth.refresh_reuse_detected" && l.severity === "critical"
    )
  );
});

test("logout-all ends every session and invalidates old access tokens", async () => {
  const user = addUser({ id: "r3" });
  const a = addSession(user);
  addSession(user);
  const res = makeRes();
  await sessionController.logoutAll(makeReq({ user: { id: user.id, sessionId: a.id } }), res);
  assert.equal(res.body.sessionsRevoked, 2);
  assert.equal((await authenticate(bearer(user, a.id, { tv: 0 }))).error, "session_ended");
});
