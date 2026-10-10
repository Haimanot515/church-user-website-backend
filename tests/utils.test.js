require("./helpers/setup");
const test = require("node:test");
const assert = require("node:assert/strict");

const { escapeHtml, escapeHtmlWithBreaks } = require("../utils/escapeHtml");
const pick = require("../utils/pick");
const { parsePagination, parseLimit } = require("../utils/pagination");
const {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
  buildUnsubscribeUrl,
} = require("../utils/unsubscribeToken");
const { parseCode } = require("../middleware/resolveLanguage");

test("escapeHtml neutralises markup", () => {
  assert.equal(
    escapeHtml(`<script>alert("x")</script>`),
    "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
  );
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtmlWithBreaks("a\nb<"), "a<br />b&lt;");
});

test("pick only copies whitelisted keys", () => {
  assert.deepEqual(pick({ a: 1, isAdmin: true, password: "x" }, ["a"]), { a: 1 });
  assert.deepEqual(pick(null, ["a"]), {});
});

test("pagination clamps and sanitises", () => {
  assert.deepEqual(parsePagination({ page: "2", limit: "5" }), { page: 2, limit: 5, skip: 5 });
  assert.equal(parsePagination({ limit: "999999" }, { maxLimit: 50 }).limit, 50);
  assert.equal(parsePagination({ page: "-3", limit: "abc" }).page, 1);
  assert.equal(parseLimit("0"), 20);
});

test("unsubscribe tokens are bound to the email", () => {
  const token = createUnsubscribeToken("a@x.com");
  assert.ok(verifyUnsubscribeToken("A@x.com", token));
  assert.ok(!verifyUnsubscribeToken("b@x.com", token));
  assert.ok(!verifyUnsubscribeToken("a@x.com", "bad"));
  assert.ok(!verifyUnsubscribeToken("a@x.com", undefined));
  assert.match(
    buildUnsubscribeUrl("a@x.com"),
    /\/api\/subscribers\/unsubscribe\?email=a%40x\.com&token=[0-9a-f]{64}$/
  );
});

test("Accept-Language parsing", () => {
  assert.equal(parseCode("am-ET,en;q=0.9"), "AM");
  assert.equal(parseCode("en-US"), "EN");
  assert.equal(parseCode(undefined), "EN");
  assert.equal(parseCode("'; DROP TABLE"), "EN");
});

test("env validation reports every problem and enforces production rules", () => {
  const { collectEnvErrors } = require("../config/env");
  const saved = { ...process.env };
  const restore = () => {
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  };
  try {
    Object.assign(process.env, {
      NODE_ENV: "production",
      JWT_SECRET: "changeme".repeat(6),
      JWT_EXPIRES_IN: "forever",
      BCRYPT_SALT_ROUNDS: "4",
      CLIENT_URL: "http://localhost:5173/",
      BACKEND_URL: "",
      DATABASE_URL: "mysql://x",
      MAX_LOGIN_ATTEMPTS: "0",
    });
    const { errors } = collectEnvErrors();
    const text = errors.join("\n");
    for (const needle of [
      "JWT_SECRET",
      "JWT_EXPIRES_IN",
      "BCRYPT_SALT_ROUNDS",
      "BACKEND_URL",
      "DATABASE_URL",
      "MAX_LOGIN_ATTEMPTS",
      "trailing slash",
    ]) {
      assert.ok(text.includes(needle), `expected an error mentioning ${needle}`);
    }
  } finally {
    restore();
  }

  const ok = collectEnvErrors();
  assert.deepEqual(ok.errors, []);
});

test("env validation requires a Turnstile secret when captcha is on", () => {
  const { collectEnvErrors } = require("../config/env");
  const saved = { ...process.env };
  try {
    Object.assign(process.env, { TURNSTILE_ENABLED: "true", TURNSTILE_SECRET_KEY: "" });
    assert.ok(collectEnvErrors().errors.join("\n").includes("TURNSTILE_SECRET_KEY"));
    process.env.TURNSTILE_SECRET_KEY = "secret";
    assert.deepEqual(collectEnvErrors().errors, []);
  } finally {
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  }
});
