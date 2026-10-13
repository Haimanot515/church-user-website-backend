const misbakService = require("../services/misbakService");
const sendError = require("../utils/sendError");

const NOT_FOUND = { message: "Misbak not found" };
const CACHE = "public, max-age=60";

exports.getToday = async (req, res) => {
  try {
    const misbak = await misbakService.getToday(req.language);
    if (!misbak) return res.status(404).json(NOT_FOUND);
    res.vary("Accept-Language").set("Cache-Control", CACHE).json(misbak);
  } catch (err) {
    sendError(res, err);
  }
};

exports.getByDate = async (req, res) => {
  try {
    const misbak = await misbakService.getPublicByDate(req.params.date, req.language);
    if (!misbak) return res.status(404).json(NOT_FOUND);
    res.vary("Accept-Language").set("Cache-Control", CACHE).json(misbak);
  } catch (err) {
    sendError(res, err);
  }
};

exports.list = async (req, res) => {
  try {
    res.json(await misbakService.list(req.query));
  } catch (err) {
    sendError(res, err);
  }
};

exports.getById = async (req, res) => {
  try {
    const misbak = await misbakService.getById(req.params.id);
    if (!misbak) return res.status(404).json(NOT_FOUND);
    res.json(misbak);
  } catch (err) {
    sendError(res, err);
  }
};

exports.create = async (req, res) => {
  try {
    res.status(201).json(await misbakService.create(req.body));
  } catch (err) {
    sendError(res, err, "Failed to create misbak");
  }
};

exports.update = async (req, res) => {
  try {
    const misbak = await misbakService.update(req.params.id, req.body || {});
    if (!misbak) return res.status(404).json(NOT_FOUND);
    res.json(misbak);
  } catch (err) {
    sendError(res, err);
  }
};

exports.setStatus = async (req, res) => {
  try {
    const misbak = await misbakService.setStatus(req.params.id, (req.body || {}).status);
    if (!misbak) return res.status(404).json(NOT_FOUND);
    res.json(misbak);
  } catch (err) {
    sendError(res, err);
  }
};

exports.remove = async (req, res) => {
  try {
    const misbak = await misbakService.remove(req.params.id);
    if (!misbak) return res.status(404).json(NOT_FOUND);
    res.json({ message: "Misbak deleted successfully" });
  } catch (err) {
    sendError(res, err);
  }
};

exports.importMany = async (req, res) => {
  try {
    res.status(201).json(await misbakService.importMany((req.body || {}).items));
  } catch (err) {
    sendError(res, err, "Failed to import misbaks");
  }
};
