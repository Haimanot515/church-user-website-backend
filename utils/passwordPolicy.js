const PASSWORD_MAX_LENGTH = 128;

const COMMON_PASSWORDS = new Set([
  "password",
  "passw0rd",
  "p@ssword",
  "p@ssw0rd",
  "pass1234",
  "password1",
  "password12",
  "password123",
  "password1234",
  "passwordpassword",
  "letmein",
  "letmein1",
  "welcome",
  "welcome1",
  "welcome123",
  "admin",
  "admin123",
  "admin1234",
  "administrator",
  "root",
  "toor",
  "qwerty",
  "qwerty1",
  "qwerty12",
  "qwerty123",
  "qwertyuiop",
  "qwertyui",
  "asdfghjk",
  "asdfghjkl",
  "zxcvbnm",
  "zxcvbnm1",
  "1qaz2wsx",
  "1q2w3e4r",
  "1q2w3e4r5t",
  "abc123",
  "abc12345",
  "abcd1234",
  "abcdefgh",
  "abcdefg1",
  "iloveyou",
  "iloveyou1",
  "monkey",
  "monkey123",
  "dragon",
  "dragon123",
  "master",
  "master123",
  "sunshine",
  "princess",
  "football",
  "baseball",
  "superman",
  "batman",
  "trustno1",
  "shadow",
  "access",
  "flower",
  "freedom",
  "whatever",
  "qazwsx",
  "qazwsxedc",
  "login",
  "hello",
  "hello123",
  "secret",
  "secret123",
  "default",
  "guest",
  "test",
  "test1234",
  "testtest",
  "changeme",
  "changeme1",
  "temp1234",
  "user",
  "user1234",
  "mypassword",
  "newpassword",
  "church",
  "church123",
  "churchpassword",
  "jesus",
  "jesus123",
  "jesuschrist",
  "godisgood",
  "god",
  "god1234",
  "amen",
  "amen1234",
  "blessed",
  "blessed123",
  "hallelujah",
  "ethiopia",
  "ethiopia1",
  "ethiopia123",
  "addisababa",
  "habesha",
  "orthodox",
  "tewahedo",
]);

const MESSAGES = {
  password_too_short: (min) => `Password must be at least ${min} characters.`,
  password_too_long: () => `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`,
  password_too_common: () => "That password is too common. Choose a less predictable one.",
  password_too_simple: () =>
    "That password is too simple. Avoid repeated or sequential characters.",
  password_contains_personal_info: () => "Password must not be built from your name or email.",
};

const stripNonLetters = (value) => value.replace(/^[^a-z]+|[^a-z]+$/g, "");

const isSingleRepeatedCharacter = (value) => value.length > 0 && new Set(value).size === 1;

const isSequentialRun = (value) => {
  if (value.length < 4) return false;
  let step = 0;
  for (let i = 1; i < value.length; i++) {
    const diff = value.charCodeAt(i) - value.charCodeAt(i - 1);
    if (diff !== 1 && diff !== -1) return false;
    if (step === 0) step = diff;
    else if (diff !== step) return false;
  }
  return true;
};

const isCommon = (lower) => {
  if (COMMON_PASSWORDS.has(lower)) return true;
  const base = stripNonLetters(lower);
  return base.length >= 4 && COMMON_PASSWORDS.has(base);
};

const containsPersonalInfo = (lower, personal) => {
  if (!Array.isArray(personal)) return false;
  for (const raw of personal) {
    const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
    if (!value) continue;
    if (value.includes("@")) {
      const local = value.split("@")[0];
      if (local.length >= 4 && lower.includes(local)) return true;
      if (lower === value) return true;
      continue;
    }
    for (const part of value.split(/\s+/)) {
      if (part.length >= 4 && lower.includes(part)) return true;
    }
  }
  return false;
};

// Length first, no composition rules, reject common/simple/personal passwords. Returns a reason code or null.
const checkPassword = (password, { minLength = 8, personal } = {}) => {
  if (typeof password !== "string" || password.length < minLength) return "password_too_short";
  if (password.length > PASSWORD_MAX_LENGTH) return "password_too_long";
  const lower = password.toLowerCase();
  if (isCommon(lower)) return "password_too_common";
  if (isSingleRepeatedCharacter(password) || isSequentialRun(lower)) return "password_too_simple";
  if (containsPersonalInfo(lower, personal)) return "password_contains_personal_info";
  return null;
};

const passwordMessage = (reason, minLength = 8) => MESSAGES[reason](minLength);

module.exports = { checkPassword, passwordMessage, PASSWORD_MAX_LENGTH };
