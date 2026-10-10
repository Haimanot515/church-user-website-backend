const { app, db, calls, emails, addUser, tokenFor, flush } = require("./helpers/setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const bcrypt = require("bcryptjs");
const { createUnsubscribeToken } = require("../utils/unsubscribeToken");

const admin = addUser({ id: "admin1", isAdmin: true });
const member = addUser({ id: "member1", name: "Real <b>Name</b>", email: "member1@example.com" });

test("health check works and security headers are set", async () => {
  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
  assert.ok(res.headers["x-content-type-options"]);
  assert.equal(res.headers["x-powered-by"], undefined);
});

test("unknown routes return a generic 404", async () => {
  const res = await request(app).get("/api/nope");
  assert.equal(res.status, 404);
});

test("malformed JSON returns 400, not 500", async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .set("Content-Type", "application/json")
    .send("{bad");
  assert.equal(res.status, 400);
});

test("admin routes require auth (including GET /admin/messages/:threadId)", async () => {
  for (const url of [
    "/api/admin/messages/t1",
    "/api/admin/users",
    "/api/admin/threads",
    "/api/subscribers",
  ]) {
    const res = await request(app).get(url);
    assert.equal(res.status, 401, url);
  }
});

test("non-admin users are forbidden from admin routes", async () => {
  const res = await request(app)
    .get("/api/admin/messages/t1")
    .set("Authorization", `Bearer ${tokenFor(member)}`);
  assert.equal(res.status, 403);
});

test("admin can read messages", async () => {
  const res = await request(app)
    .get("/api/admin/messages/t1")
    .set("Authorization", `Bearer ${tokenFor(admin)}`);
  assert.equal(res.status, 200);
});

test("permissions come from the DB, not the token (a demoted admin loses access at once)", async () => {
  const demoted = addUser({ id: "demoted1", role: "super_admin" });
  const token = tokenFor(demoted, { isAdmin: true, role: "super_admin" });
  assert.equal(
    (await request(app).get("/api/admin/users").set("Authorization", `Bearer ${token}`)).status,
    200
  );
  db.users.get("demoted1").roleId = db.users.get("member1").roleId;
  const res = await request(app).get("/api/admin/users").set("Authorization", `Bearer ${token}`);
  assert.equal(res.status, 403);
});

test("deleted users' tokens stop working", async () => {
  const ghost = addUser({ id: "ghost1" });
  const token = tokenFor(ghost);
  db.users.delete("ghost1");
  const res = await request(app).get("/api/admin/users").set("Authorization", `Bearer ${token}`);
  assert.equal(res.status, 403);
});

test("logout invalidates previously issued tokens", async () => {
  const u = addUser({ id: "logout1" });
  const token = tokenFor(u);
  const out = await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${token}`);
  assert.equal(out.status, 200);
  const again = await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${token}`);
  assert.equal(again.status, 403);
});

test("tokens signed with another algorithm are rejected", async () => {
  const jwt = require("jsonwebtoken");
  const t = jwt.sign({ id: admin.id, tv: 0 }, process.env.JWT_SECRET, { algorithm: "HS512" });
  const res = await request(app).get("/api/admin/users").set("Authorization", `Bearer ${t}`);
  assert.equal(res.status, 403);
});

test("contact form uses the logged-in identity, ignores body email, escapes HTML", async () => {
  calls.length = 0;
  emails.length = 0;
  const res = await request(app)
    .post("/api/contact")
    .set("Authorization", `Bearer ${tokenFor(member)}`)
    .send({ name: "Victim", email: "victim@example.com", message: "<img src=x onerror=alert(1)>" });
  assert.equal(res.status, 201);

  const lookup = calls.find((c) => c.name === "thread.findFirst");
  assert.equal(lookup.args.where.userEmail, "member1@example.com");
  assert.equal(emails.length, 1);
  assert.ok(!emails[0].html.includes("<img src=x"));
  assert.ok(emails[0].html.includes("&lt;img src=x"));
  assert.ok(emails[0].html.includes("Real &lt;b&gt;Name&lt;/b&gt;"));
});

test("contact form rejects missing/oversized messages and anonymous users", async () => {
  const auth = { Authorization: `Bearer ${tokenFor(member)}` };
  assert.equal((await request(app).post("/api/contact").set(auth).send({})).status, 400);
  assert.equal(
    (
      await request(app)
        .post("/api/contact")
        .set(auth)
        .send({ message: "x".repeat(5001) })
    ).status,
    400
  );
  assert.equal((await request(app).post("/api/contact").send({ message: "hi" })).status, 401);
});

test("login gives the same generic error for unknown email and wrong password", async () => {
  const hash = await bcrypt.hash("Correct#Pass1", 4);
  addUser({ id: "login1", email: "login1@example.com", password: hash });

  const unknown = await request(app)
    .post("/api/auth/login")
    .send({ email: "nobody@example.com", password: "Whatever#1" });
  const wrong = await request(app)
    .post("/api/auth/login")
    .send({ email: "login1@example.com", password: "Wrong#Pass1" });
  assert.equal(unknown.status, 401);
  assert.equal(wrong.status, 401);
  assert.deepEqual(unknown.body, wrong.body);

  const ok = await request(app)
    .post("/api/auth/login")
    .send({ email: "LOGIN1@example.com", password: "Correct#Pass1" });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);
  assert.equal(ok.body.user.password, undefined);
});

test("login rejects non-string credentials (no query-object injection)", async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: { contains: "" }, password: "x" });
  assert.equal(res.status, 400);
});

test("verification code is locked after too many wrong attempts", async () => {
  emails.length = 0;
  const body = {
    name: "New Person",
    email: "newperson@example.com",
    password: "river lantern quiet maple",
  };
  const reg = await request(app).post("/api/auth/register").send(body);
  assert.equal(reg.status, 200);
  assert.match(emails[0].html, /\d{6}/);

  for (let i = 0; i < 5; i++) {
    const r = await request(app)
      .post("/api/auth/verify")
      .send({ ...body, code: "000000" });
    assert.equal(r.status, 400);
  }
  const locked = await request(app)
    .post("/api/auth/verify")
    .send({ ...body, code: "000000" });
  assert.equal(locked.status, 429);
});

test("registration with the right code works and HTML in the name is escaped in the email", async () => {
  emails.length = 0;
  const body = {
    name: "Eve <script>x</script>",
    email: "eve@example.com",
    password: "river lantern quiet maple",
  };
  assert.equal((await request(app).post("/api/auth/register").send(body)).status, 200);
  assert.ok(!emails[0].html.includes("<script>x</script>"));
  const code = db.codes[db.codes.length - 1].dbCode;
  const ver = await request(app)
    .post("/api/auth/verify")
    .send({ ...body, code });
  assert.equal(ver.status, 200);
  assert.ok(ver.body.token);
  const replay = await request(app)
    .post("/api/auth/verify")
    .send({ ...body, code });
  assert.equal(replay.status, 400);
});

test("unsubscribe needs a valid signed token", async () => {
  db.subscribers.push({ id: "s99", email: "sub@example.com", active: true });
  const noToken = await request(app)
    .get("/api/subscribers/unsubscribe")
    .query({ email: "sub@example.com" });
  assert.equal(noToken.status, 400);
  const badToken = await request(app)
    .get("/api/subscribers/unsubscribe")
    .query({ email: "sub@example.com", token: "nope" });
  assert.equal(badToken.status, 400);
  assert.equal(db.subscribers.find((s) => s.id === "s99").active, true);

  const good = await request(app)
    .get("/api/subscribers/unsubscribe")
    .query({ email: "sub@example.com", token: createUnsubscribeToken("sub@example.com") });
  assert.equal(good.status, 200);
  assert.equal(db.subscribers.find((s) => s.id === "s99").active, false);
});

test("subscribe escapes the email in the admin notification and sends an unsubscribe link", async () => {
  emails.length = 0;
  const res = await request(app).post("/api/subscribers").send({ email: "fan@example.com" });
  assert.equal(res.status, 201);
  const toSubscriber = emails.find((e) => e.to === "fan@example.com");
  assert.match(toSubscriber.html, /unsubscribe\?email=fan%40example\.com&amp;token=/);
  assert.equal(
    (
      await request(app)
        .post("/api/subscribers")
        .send({ email: { a: 1 } })
    ).status,
    400
  );
});

test("admin user update ignores non-whitelisted fields", async () => {
  const target = addUser({ id: "target1" });
  calls.length = 0;
  const res = await request(app)
    .put(`/api/admin/users/${target.id}`)
    .set("Authorization", `Bearer ${tokenFor(admin)}`)
    .send({ name: "Renamed", password: "hacked", tokenVersion: 99, id: "other" });
  assert.equal(res.status, 200);
  const upd = calls.find((c) => c.name === "user.update");
  assert.deepEqual(Object.keys(upd.args.data).sort(), ["name", "updatedAt"]);
  assert.equal(res.body.updatedUser.password, undefined);
});

const REAUTH_PASSWORD = "Reauth#Pass123";
const reauthAdmin = addUser({
  id: "admin2",
  isAdmin: true,
  password: bcrypt.hashSync(REAUTH_PASSWORD, 4),
});
const reauthAuth = () => ({ Authorization: `Bearer ${tokenFor(reauthAdmin)}` });

test("admins cannot delete or re-role themselves", async () => {
  const headers = { ...reauthAuth(), "X-Reauth-Credential": REAUTH_PASSWORD };
  assert.equal(
    (await request(app).delete(`/api/admin/delete/${reauthAdmin.id}`).set(headers)).status,
    400
  );
  assert.equal(
    (
      await request(app)
        .put(`/api/admin/users/${reauthAdmin.id}/role`)
        .set(headers)
        .send({ role: "user" })
    ).status,
    403
  );
});

test("deleting a user needs the admin password again", async () => {
  const target = addUser({ id: "victim1" });
  const missing = await request(app).delete(`/api/admin/delete/${target.id}`).set(reauthAuth());
  assert.equal(missing.status, 401);
  assert.equal(missing.body.code, "reauthentication_required");

  const wrong = await request(app)
    .delete(`/api/admin/delete/${target.id}`)
    .set({ ...reauthAuth(), "X-Reauth-Credential": "Wrong#Pass1" });
  assert.equal(wrong.status, 401);
  assert.equal(wrong.body.code, "invalid_credential");
  assert.ok(db.users.has(target.id));

  const ok = await request(app)
    .delete(`/api/admin/delete/${target.id}`)
    .set({ ...reauthAuth(), "X-Reauth-Credential": REAUTH_PASSWORD });
  assert.equal(ok.status, 200);
  assert.ok(!db.users.has(target.id));
});

test("changing a role needs the password, and the old role and admin fields are refused on plain updates", async () => {
  const target = addUser({ id: "promote1" });
  const url = `/api/admin/users/${target.id}`;
  assert.equal(
    (await request(app).put(url).set(reauthAuth()).send({ name: "Renamed Person" })).status,
    200
  );
  const legacy = await request(app).put(url).set(reauthAuth()).send({ isAdmin: true });
  assert.equal(legacy.status, 400);
  assert.equal(legacy.body.code, "use_role_endpoint");
  assert.equal(
    (await request(app).put(`${url}/role`).set(reauthAuth()).send({ role: "editor" })).status,
    401
  );
  const ok = await request(app)
    .put(`${url}/role`)
    .set({ ...reauthAuth(), "X-Reauth-Credential": REAUTH_PASSWORD })
    .send({ role: "editor" });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.role, "editor");
  await flush();
  const entry = db.auditLogs.find(
    (l) => l.action === "user.role_change" && l.targetUserId === target.id
  );
  assert.deepEqual(entry.diff.role, { from: "user", to: "editor" });
  assert.equal(entry.severity, "critical");
});

test("repeated wrong re-authentication passwords are rate limited", async () => {
  const locked = addUser({
    id: "admin3",
    isAdmin: true,
    password: bcrypt.hashSync(REAUTH_PASSWORD, 4),
  });
  const headers = {
    Authorization: `Bearer ${tokenFor(locked)}`,
    "X-Reauth-Credential": "Wrong#Pass1",
  };
  let last;
  for (let i = 0; i < 6; i++)
    last = await request(app).delete("/api/admin/delete/nobody").set(headers);
  assert.equal(last.status, 429);
});

test("password policy rejects common, simple and personal passwords but not plain long ones", async () => {
  let n = 0;
  const attempt = (password, extra = {}) =>
    request(app)
      .post("/api/auth/register")
      .set("X-Forwarded-For", `10.8.8.${++n}`)
      .send({ name: "Abel Tesfaye", email: "abel.tesfaye@example.com", password, ...extra });
  assert.equal((await attempt("short")).status, 400);
  assert.equal((await attempt("password123")).status, 400);
  assert.equal((await attempt("aaaaaaaaaa")).status, 400);
  assert.equal((await attempt("12345678")).status, 400);
  assert.equal((await attempt("tesfaye-is-me")).status, 400);
  assert.equal((await attempt("a".repeat(129))).status, 400);
  assert.equal((await attempt("river lantern quiet maple")).status, 200);
});

test("captcha is enforced on auth routes only when Turnstile is enabled", async () => {
  const { turnstile } = require("../config/security");
  const saved = { ...turnstile };
  try {
    turnstile.enabled = true;
    turnstile.secretKey = "";
    const noSecret = await request(app)
      .post("/api/auth/login")
      .set("X-Forwarded-For", "10.7.7.1")
      .send({ email: "a@example.com", password: "x" });
    assert.equal(noSecret.status, 503);

    turnstile.secretKey = "test-secret";
    const noToken = await request(app)
      .post("/api/auth/login")
      .set("X-Forwarded-For", "10.7.7.2")
      .send({ email: "a@example.com", password: "x" });
    assert.equal(noToken.status, 403);
    assert.equal(noToken.body.code, "captcha_required");

    const huge = await request(app)
      .post("/api/auth/login")
      .set("X-Forwarded-For", "10.7.7.3")
      .set("X-Captcha-Token", "t".repeat(3000))
      .send({ email: "a@example.com", password: "x" });
    assert.equal(huge.body.code, "captcha_failed");

    const publicRoute = await request(app).get("/api/languages");
    assert.notEqual(publicRoute.status, 403);
  } finally {
    Object.assign(turnstile, saved);
  }
});

test("uploads reject non-image files and oversized files", async () => {
  const auth = { Authorization: `Bearer ${tokenFor(admin)}` };
  const bad = await request(app)
    .post("/api/posts")
    .set(auth)
    .field("title", "t")
    .attach("image", Buffer.from("not an image"), {
      filename: "x.exe",
      contentType: "application/x-msdownload",
    });
  assert.equal(bad.status, 400);

  const big = await request(app)
    .post("/api/posts")
    .set(auth)
    .attach("image", Buffer.alloc(11 * 1024 * 1024), {
      filename: "big.png",
      contentType: "image/png",
    });
  assert.equal(big.status, 413);
});

test("login is rate limited", async () => {
  let last;
  for (let i = 0; i < 25; i++) {
    last = await request(app)
      .post("/api/auth/login")
      .send({ email: "rl@example.com", password: "Nope#Pass1" });
  }
  assert.equal(last.status, 429);
});

test("draft posts and media are hidden from the public but visible to admins", async () => {
  db.posts.set("p-draft", { id: "p-draft", title: "Draft", status: "draft" });
  db.posts.set("p-pub", { id: "p-pub", title: "Live", status: "published" });
  db.media.set("m-draft", {
    id: "m-draft",
    title: "Draft",
    status: "draft",
    mediaUrl: "https://x/y.jpg",
  });
  db.media.set("m-pub", {
    id: "m-pub",
    title: "Live",
    status: "published",
    mediaUrl: "https://x/z.jpg",
  });
  const adminAuth = { Authorization: `Bearer ${tokenFor(admin)}` };
  const memberAuth = { Authorization: `Bearer ${tokenFor(member)}` };

  assert.equal((await request(app).get("/api/posts/p-draft")).status, 404);
  assert.equal((await request(app).get("/api/posts/p-draft").set(memberAuth)).status, 404);
  assert.equal(
    (await request(app).get("/api/posts/p-draft").set({ Authorization: "Bearer garbage" })).status,
    404
  );
  assert.equal((await request(app).get("/api/posts/p-draft").set(adminAuth)).status, 200);
  assert.equal((await request(app).get("/api/posts/p-pub")).status, 200);

  assert.equal((await request(app).get("/api/media/m-draft")).status, 404);
  assert.equal((await request(app).get("/api/media/m-draft").set(adminAuth)).status, 200);

  const pub = await request(app).get("/api/media");
  assert.deepEqual(
    pub.body.map((m) => m.id),
    ["m-pub"]
  );
  const adm = await request(app).get("/api/media").set(adminAuth);
  assert.equal(adm.body.length, 2);
});

test("account locks after repeated wrong passwords, even for the right password, and unlocks after the window", async () => {
  const hash = await bcrypt.hash("Correct#Pass1", 4);
  const user = addUser({ id: "lock1", email: "lock1@example.com", password: hash });
  const { maxLoginAttempts } = require("../config/security");

  let last;
  for (let i = 0; i < maxLoginAttempts; i++) {
    last = await request(app)
      .post("/api/auth/login")
      .set("X-Forwarded-For", "10.9.9.1")
      .send({ email: user.email, password: "Wrong#Pass1" });
  }
  assert.equal(last.status, 429);
  assert.ok(user.lockedUntil > new Date());

  const stillLocked = await request(app)
    .post("/api/auth/login")
    .set("X-Forwarded-For", "10.9.9.1")
    .send({ email: user.email, password: "Correct#Pass1" });
  assert.equal(stillLocked.status, 429);
  assert.equal(stillLocked.body.token, undefined);

  user.lockedUntil = new Date(Date.now() - 1000);
  const ok = await request(app)
    .post("/api/auth/login")
    .set("X-Forwarded-For", "10.9.9.1")
    .send({ email: user.email, password: "Correct#Pass1" });
  assert.equal(ok.status, 200);
  assert.equal(user.failedLoginAttempts, 0);
  assert.equal(user.lockedUntil, null);
});

test("a successful login resets the failed-attempt counter", async () => {
  const hash = await bcrypt.hash("Correct#Pass1", 4);
  const user = addUser({ id: "lock2", email: "lock2@example.com", password: hash });
  await request(app)
    .post("/api/auth/login")
    .set("X-Forwarded-For", "10.9.9.1")
    .send({ email: user.email, password: "Wrong#Pass1" });
  assert.equal(user.failedLoginAttempts, 1);
  const ok = await request(app)
    .post("/api/auth/login")
    .set("X-Forwarded-For", "10.9.9.1")
    .send({ email: user.email, password: "Correct#Pass1" });
  assert.equal(ok.status, 200);
  assert.equal(user.failedLoginAttempts, 0);
});

test("auth responses are not cacheable", async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .set("X-Forwarded-For", "10.9.9.1")
    .send({});
  assert.equal(res.headers["cache-control"], "no-store");
});

test("login returns a refresh token and refresh rotates it; replaying the old one ends the sessions", async () => {
  const hash = await bcrypt.hash("Correct#Pass1", 4);
  addUser({ id: "sess1", email: "sess1@example.com", password: hash });
  const login = await request(app)
    .post("/api/auth/login")
    .set("X-Forwarded-For", "10.6.6.1")
    .send({ email: "sess1@example.com", password: "Correct#Pass1" });
  assert.equal(login.status, 200);
  assert.ok(login.body.refreshToken);

  const refreshed = await request(app)
    .post("/api/auth/refresh")
    .send({ refreshToken: login.body.refreshToken });
  assert.equal(refreshed.status, 200);
  assert.notEqual(refreshed.body.refreshToken, login.body.refreshToken);
  const me = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${refreshed.body.token}`);
  assert.equal(me.body.user.email, "sess1@example.com");

  const quick = await request(app)
    .post("/api/auth/refresh")
    .send({ refreshToken: login.body.refreshToken });
  assert.equal(quick.status, 409);
  const sid = [...db.sessions.values()].find((s) => s.userId === "sess1").id;
  db.sessions.get(sid).rotatedAt = new Date(Date.now() - 60 * 1000);
  const replay = await request(app)
    .post("/api/auth/refresh")
    .send({ refreshToken: login.body.refreshToken });
  assert.equal(replay.status, 401);
  assert.equal(
    (await request(app).get("/api/auth/me").set("Authorization", `Bearer ${refreshed.body.token}`))
      .status,
    403
  );
});

test("sessions can be listed and ended one by one", async () => {
  const user = addUser({ id: "sess2" });
  const token = tokenFor(user);
  tokenFor(user);
  const list = await request(app).get("/api/auth/sessions").set("Authorization", `Bearer ${token}`);
  assert.equal(list.body.sessions.length, 2);
  const other = list.body.sessions.find((s) => !s.current);
  assert.equal(
    (
      await request(app)
        .delete(`/api/auth/sessions/${other.id}`)
        .set("Authorization", `Bearer ${token}`)
    ).status,
    200
  );
  assert.equal(
    (
      await request(app)
        .delete(`/api/auth/sessions/${other.id}`)
        .set("Authorization", `Bearer ${token}`)
    ).status,
    404
  );
});

test("each role only reaches what its permissions allow", async () => {
  const editor = { Authorization: `Bearer ${tokenFor(addUser({ id: "ed1", role: "editor" }))}` };
  const staff = { Authorization: `Bearer ${tokenFor(addUser({ id: "ad1", role: "admin" }))}` };
  const owner = {
    Authorization: `Bearer ${tokenFor(addUser({ id: "ow1", role: "super_admin" }))}`,
  };

  assert.equal((await request(app).get("/api/admin/users").set(editor)).status, 403);
  assert.equal((await request(app).get("/api/subscribers").set(editor)).status, 403);
  assert.equal((await request(app).get("/api/admin/users").set(staff)).status, 200);
  assert.equal((await request(app).get("/api/admin/roles").set(staff)).status, 200);
  assert.equal((await request(app).get("/api/admin/audit-logs").set(staff)).status, 403);
  assert.equal((await request(app).get("/api/admin/audit-logs").set(owner)).status, 200);
  assert.equal(
    (await request(app).post("/api/admin/roles").set(staff).send({ name: "x1" })).status,
    403
  );
});

test("denied attempts and admin changes show up in the audit log", async () => {
  const editorUser = addUser({ id: "ed2", role: "editor" });
  const editor = { Authorization: `Bearer ${tokenFor(editorUser)}` };
  const owner = {
    Authorization: `Bearer ${tokenFor(addUser({ id: "ow2", role: "super_admin" }))}`,
  };
  await request(app).get("/api/admin/users").set(editor);
  await request(app)
    .put(`/api/admin/users/${editorUser.id}`)
    .set(owner)
    .send({ name: "Renamed Editor" });
  await flush();

  const res = await request(app).get("/api/admin/audit-logs").query({ limit: 100 }).set(owner);
  const denied = res.body.logs.find((l) => l.action === "access.denied" && l.actorId === "ed2");
  assert.equal(denied.outcome, "denied");
  const renamed = res.body.logs.find((l) => l.action === "user.update" && l.targetUserId === "ed2");
  assert.deepEqual(renamed.diff.name.to, "Renamed Editor");
  assert.ok(res.headers["x-request-id"]);
});
