// Central error handler: never leak internals (stack traces, Prisma messages) to clients.
module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  // Malformed JSON body
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON body." });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body too large." });
  }

  // Multer upload errors
  if (err.name === "MulterError") {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const message = err.code === "LIMIT_FILE_SIZE" ? "File is too large." : "Invalid file upload.";
    return res.status(status).json({ message });
  }
  if (err.code === "UNSUPPORTED_FILE_TYPE") {
    return res.status(400).json({ message: err.message });
  }

  console.error(err);
  res.status(500).json({ message: "Server error" });
};
