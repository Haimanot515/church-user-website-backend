// Conventional-commit style check used by .husky/commit-msg.
// Allowed: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
const fs = require("fs");

const file = process.argv[2];
if (!file) process.exit(0);

const msg = fs.readFileSync(file, "utf8").split("\n")[0].trim();
const pattern =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([\w./-]+\))?!?: .{1,100}$/;

// Let merges and reverts through untouched.
if (/^(Merge|Revert) /.test(msg) || pattern.test(msg)) process.exit(0);

console.error(`\nInvalid commit message: "${msg}"`);
console.error('Use the form "type(scope): summary", e.g. "fix(auth): revoke tokens on logout".\n');
process.exit(1);
