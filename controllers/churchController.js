const churchService = require("../services/churchService");
const churchAssignmentService = require("../services/churchAssignmentService");
const cloudinary = require("../config/cloudinary");

/* ------------------------------ helpers ------------------------------ */

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "churches" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

const toBool = (v) => v === true || v === "true" || v === "on" || v === "1";

// Maps service / Prisma errors to proper HTTP statuses instead of always 500
const handleError = (res, err) => {
  let status = err.statusCode || 500;
  let message = err.message;

  if (!err.statusCode) {
    if (err.code === "P2003") {
      status = 400;
      message = "A referenced record (language, user or church) does not exist.";
    } else if (err.code === "P2002") {
      status = 409;
      message = "A record with these values already exists.";
    }
  }

  if (status === 500) console.error(err);
  return res.status(status).json({ message });
};

// =======================
// CHURCH CRUD
// =======================

exports.createChurch = async (req, res) => {
  try {
    // Validate BEFORE any side effects (upload, unsetting primary)
    await churchService.assertLanguageExists(req.body.language);

    let image = "";
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      image = result.secure_url;
    }

    const isPrimary = toBool(req.body.isPrimary);
    if (isPrimary) {
      await churchService.unsetPrimaryForLanguage(req.body.language);
    }

    const church = await churchService.createChurch({
      churchName: req.body.churchName,
      description: req.body.description,
      shortDescription: req.body.shortDescription,
      history: req.body.history,
      image,
      address: req.body.address,
      serviceDays: req.body.serviceDays,
      serviceTime: req.body.serviceTime,
      language: req.body.language,
      isFeatured: req.body.isFeatured, // service converts string -> boolean
      isPrimary,
    });
    res.status(201).json(church);
  } catch (err) {
    handleError(res, err);
  }
};

exports.getChurches = async (req, res) => {
  try {
    const churches = await churchService.getChurches(req.language);
    res.json(churches);
  } catch (err) {
    handleError(res, err);
  }
};

exports.getChurchById = async (req, res) => {
  try {
    const church = await churchService.getChurchById(req.params.id);
    if (!church) return res.status(404).json({ message: "Church not found" });
    res.json(church);
  } catch (err) {
    handleError(res, err);
  }
};

exports.getPrimaryChurch = async (req, res) => {
  try {
    const church = await churchService.getPrimaryChurch(req.language);
    if (!church) return res.status(404).json({ message: "No primary church found" });
    res.json(church);
  } catch (err) {
    handleError(res, err);
  }
};

exports.updateChurch = async (req, res) => {
  try {
    const existing = await churchService.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Church not found" });

    const {
      churchName,
      description,
      shortDescription,
      history,
      address,
      serviceDays,
      serviceTime,
      language,
      isFeatured,
    } = req.body;

    // Only validate language if the client actually sent one
    const languageSent = language !== undefined && language !== "" && language !== "null";
    if (languageSent) await churchService.assertLanguageExists(language);

    let image;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      image = result.secure_url;
    }

    const isPrimary = toBool(req.body.isPrimary);
    if (isPrimary) {
      const languageId = languageSent ? language : existing.languageId;
      await churchService.unsetPrimaryForLanguage(languageId, req.params.id);
    }

    const updateData = {
      ...(churchName !== undefined && { churchName }),
      ...(description !== undefined && { description }),
      ...(shortDescription !== undefined && { shortDescription }),
      ...(history !== undefined && { history }),
      ...(address !== undefined && { address }),
      ...(serviceDays !== undefined && { serviceDays }),
      ...(serviceTime !== undefined && { serviceTime }),
      ...(languageSent && { language }),
      ...(isFeatured !== undefined && { isFeatured }), // service converts to boolean
      ...(req.body.isPrimary !== undefined && { isPrimary }),
      ...(image && { image }),
    };

    const church = await churchService.updateChurch(req.params.id, updateData);
    if (!church) return res.status(404).json({ message: "Church not found" });
    res.json(church);
  } catch (err) {
    handleError(res, err);
  }
};

exports.deleteChurch = async (req, res) => {
  try {
    const church = await churchService.deleteChurch(req.params.id);
    if (!church) return res.status(404).json({ message: "Church not found" });
    res.json({ message: "Church deleted successfully" });
  } catch (err) {
    handleError(res, err);
  }
};

// =======================
// CHURCH ASSIGNMENT
// =======================

exports.createAssignment = async (req, res) => {
  try {
    if (!req.body.user || !req.body.church) {
      return res.status(400).json({ message: "user and church are required" });
    }

    const isCurrent =
      req.body.isCurrent !== undefined ? toBool(req.body.isCurrent) : true;
    const isPrimary = toBool(req.body.isPrimary);

    let image = "";
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      image = result.secure_url;
    }

    if (isCurrent) {
      await churchAssignmentService.unsetCurrentForUser(req.body.user);
    }
    if (isPrimary) {
      await churchAssignmentService.unsetPrimaryGlobally();
    }

    const assignment = await churchAssignmentService.createAssignment({
      user: req.body.user,
      church: req.body.church,
      role: req.body.role,
      servingSince: req.body.servingSince,
      description: req.body.description,
      image,
      isCurrent,
      isPrimary,
    });
    res.status(201).json(assignment);
  } catch (err) {
    handleError(res, err);
  }
};

exports.updateAssignment = async (req, res) => {
  try {
    const existing = await churchAssignmentService.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Assignment not found" });

    const updates = { ...req.body };

    if (req.body.isCurrent !== undefined) {
      const isCurrent = toBool(req.body.isCurrent);
      updates.isCurrent = isCurrent;
      if (isCurrent) {
        // Use the assignment's real user when the body doesn't include one.
        const userId = req.body.user || existing.userId;
        await churchAssignmentService.unsetCurrentForUser(userId, req.params.id);
      }
    }

    if (req.body.isPrimary !== undefined) {
      const isPrimary = toBool(req.body.isPrimary);
      updates.isPrimary = isPrimary;
      if (isPrimary) {
        await churchAssignmentService.unsetPrimaryGlobally(req.params.id);
      }
    }

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      updates.image = result.secure_url;
    }

    const assignment = await churchAssignmentService.updateAssignment(req.params.id, updates);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    res.json(assignment);
  } catch (err) {
    handleError(res, err);
  }
};

exports.getCurrentChurch = async (req, res) => {
  try {
    const assignment = await churchAssignmentService.getCurrentChurchForUser(req.params.userId);
    if (!assignment) return res.status(404).json({ message: "Current church not found" });
    res.json(assignment);
  } catch (err) {
    handleError(res, err);
  }
};

exports.getLeadershipChurch = async (req, res) => {
  try {
    const assignment = await churchAssignmentService.getLeadershipAssignment();
    if (!assignment) {
      return res.status(404).json({ message: "No primary leader assignment found" });
    }
    res.json(assignment);
  } catch (err) {
    handleError(res, err);
  }
};

exports.getAssignments = async (req, res) => {
  try {
    const assignments = await churchAssignmentService.getAllAssignments();
    res.json(assignments);
  } catch (err) {
    handleError(res, err);
  }
};

exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await churchAssignmentService.deleteAssignment(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    res.json({ message: "Assignment deleted successfully" });
  } catch (err) {
    handleError(res, err);
  }
};