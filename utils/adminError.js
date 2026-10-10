exports.httpError = (statusCode, message, code) =>
  Object.assign(new Error(message), { statusCode, code });

exports.sendAdminError = (res, err, label = "Admin request") => {
  if (err && err.statusCode && err.statusCode < 500) {
    return res
      .status(err.statusCode)
      .json({ success: false, msg: err.message, ...(err.code && { code: err.code }) });
  }
  if (err && err.code === "P2025")
    return res.status(404).json({ success: false, msg: "Not found." });
  if (err && err.code === "P2002")
    return res.status(409).json({ success: false, msg: "Already exists." });
  console.error(`${label} error:`, err);
  return res.status(500).json({ success: false, msg: "Server error" });
};
