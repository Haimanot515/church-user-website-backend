// Turn an unexpected error into a safe HTTP response.
// Known Prisma errors become 4xx; everything else is logged and returned as a generic 500
// so internal details (SQL, stack traces, schema names) never reach the client.
module.exports = function sendError(res, err, fallbackMessage = "Server error") {
  // Deliberate, user-facing validation errors thrown by our own services.
  if (err && err.isValidationError) {
    return res.status(400).json({ message: err.message });
  }
  if (err && err.statusCode && err.statusCode < 500) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  switch (err && err.code) {
    case "P2025":
      return res.status(404).json({ message: "Record not found." });
    case "P2002":
      return res.status(409).json({ message: "A record with these values already exists." });
    case "P2003":
      return res.status(400).json({ message: "A referenced record does not exist." });
    case "P2000":
    case "P2006":
    case "P2007":
      return res.status(400).json({ message: "Invalid input." });
    default:
  }
  if (err && err.name === "PrismaClientValidationError") {
    return res.status(400).json({ message: "Invalid input." });
  }

  console.error(err);
  return res.status(500).json({ message: fallbackMessage });
};
