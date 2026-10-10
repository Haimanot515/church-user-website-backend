// Prints a random 96-character hex string suitable for JWT_SECRET.
console.log(require("crypto").randomBytes(48).toString("hex"));
