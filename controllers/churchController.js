const churchService = require("../services/churchService");
const churchAssignmentService = require("../services/churchAssignmentService");
const cloudinary = require("../config/cloudinary");

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

// =======================
// CHURCH CRUD
// =======================

exports.createChurch = async (req, res) => {
  try {
    let image = "";
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      image = result.secure_url;
    }
    const isPrimary = req.body.isPrimary === true || req.body.isPrimary === "true";

    if (isPrimary) {
      await churchService.unsetPrimaryForLanguage(req.body.language);
    }

    const church = await churchService.createChurch({
      churchName: req.body.churchName,
      description: req.body.description,
      history: req.body.history,
      image,
      address: req.body.address,
      serviceDays: req.body.serviceDays,
      serviceTime: req.body.serviceTime,
      language: req.body.language,
      isFeatured: req.body.isFeatured,
      isPrimary,
    });
    res.status(201).json(church);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getChurches = async (req, res) => {
  try {
    const churches = await churchService.getChurches(req.language);
    res.json(churches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getChurchById = async (req, res) => {
  try {
    const church = await churchService.getChurchById(req.params.id);
    if (!church) return res.status(404).json({ message: "Church not found" });
    res.json(church);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPrimaryChurch = async (req, res) => {
  try {
    const church = await churchService.getPrimaryChurch(req.language);
    if (!church) return res.status(404).json({ message: "No primary church found" });
    res.json(church);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateChurch = async (req, res) => {
  try {
    let image;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      image = result.secure_url;
    }
    const isPrimary = req.body.isPrimary === true || req.body.isPrimary === "true";

    if (isPrimary) {
      const existing = await churchService.findById(req.params.id);
      const languageId = req.body.language || existing?.languageId;
      await churchService.unsetPrimaryForLanguage(languageId, req.params.id);
    }

    const {
      churchName,
      description,
      history,
      address,
      serviceDays,
      serviceTime,
      language,
    } = req.body;

    const updateData = {
      ...(churchName !== undefined && { churchName }),
      ...(description !== undefined && { description }),
      ...(history !== undefined && { history }),
      ...(address !== undefined && { address }),
      ...(serviceDays !== undefined && { serviceDays }),
      ...(serviceTime !== undefined && { serviceTime }),
      ...(language !== undefined && { language }),
      ...(req.body.isFeatured !== undefined && { isFeatured: req.body.isFeatured }),
      ...(req.body.isPrimary !== undefined && { isPrimary }),
      ...(image && { image }),
    };

    const church = await churchService.updateChurch(req.params.id, updateData);
    if (!church) return res.status(404).json({ message: "Church not found" });
    res.json(church);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteChurch = async (req, res) => {
  try {
    const church = await churchService.deleteChurch(req.params.id);
    if (!church) return res.status(404).json({ message: "Church not found" });
    res.json({ message: "Church deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// =======================
// CHURCH ASSIGNMENT
// =======================

exports.createAssignment = async (req, res) => {
  try {
    const isCurrent = req.body.isCurrent !== undefined
      ? (req.body.isCurrent === true || req.body.isCurrent === "true")
      : true;
    const isPrimary = req.body.isPrimary === true || req.body.isPrimary === "true";

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
    res.status(500).json({ message: err.message });
  }
};

exports.updateAssignment = async (req, res) => {
  try {
    const updates = { ...req.body };

    if (req.body.isCurrent !== undefined) {
      const isCurrent = req.body.isCurrent === true || req.body.isCurrent === "true";
      updates.isCurrent = isCurrent;
      if (isCurrent) {
        await churchAssignmentService.unsetCurrentForUser(req.body.user, req.params.id);
      }
    }

    if (req.body.isPrimary !== undefined) {
      const isPrimary = req.body.isPrimary === true || req.body.isPrimary === "true";
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
    res.status(500).json({ message: err.message });
  }
};

exports.getCurrentChurch = async (req, res) => {
  try {
    const assignment = await churchAssignmentService.getCurrentChurchForUser(req.params.userId);
    if (!assignment) return res.status(404).json({ message: "Current church not found" });
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getLeadershipChurch = async (req, res) => {
  try {
    const assignment = await churchAssignmentService.getLeadershipAssignment();
    if (!assignment) return res.status(404).json({ message: "No primary leader assignment found" });
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAssignments = async (req, res) => {
  try {
    const assignments = await churchAssignmentService.getAllAssignments();
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await churchAssignmentService.deleteAssignment(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    res.json({ message: "Assignment deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
