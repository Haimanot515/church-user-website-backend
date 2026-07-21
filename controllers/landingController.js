const LandingHero = require("../models/LandingHero");
const cloudinary = require("../config/cloudinary");

/* ===============================
   Cloudinary Upload Helper
================================= */
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "portfolio", resource_type: "auto" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

/* ===============================
   Utility: Clean Undefined + Empty
================================= */
const cleanData = (data) => {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([_, value]) =>
        value !== undefined &&
        value !== null &&
        !(typeof value === "string" && value.trim() === "")
    )
  );
};

/* ===============================
   GET Landing Data
================================= */
exports.getLanding = async (req, res) => {
  try {
    const landing = await LandingHero.findOne();
    res.json(landing || {});
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch portfolio data" });
  }
};

/* ===============================
   1️⃣ UPDATE HERO & CAMPUS
================================= */
exports.updateHero = async (req, res) => {
  try {
    let updateData = cleanData(req.body);
    updateData.updatedAt = Date.now();

    // Images
    if (req.files?.heroImage) {
      updateData.heroImage = await uploadToCloudinary(
        req.files.heroImage[0].buffer
      );
    }

    if (req.files?.campusImage) {
      updateData.image = await uploadToCloudinary(
        req.files.campusImage[0].buffer
      );
    }

    const landing = await LandingHero.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, upsert: true }
    );

    res.json(landing);
  } catch (err) {
    res.status(500).json({ error: "Failed to update hero and campus" });
  }
};

/* ===============================
   2️⃣ UPDATE ACADEMIC
================================= */
exports.updateAcademic = async (req, res) => {
  try {
    let updateData = cleanData(req.body);
    updateData.updatedAt = Date.now();

    if (req.file) {
      updateData.aboutImage = await uploadToCloudinary(req.file.buffer);
    }

    const landing = await LandingHero.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, upsert: true }
    );

    res.json(landing);
  } catch (err) {
    res.status(500).json({ error: "Failed to update academic" });
  }
};

/* ===============================
   3️⃣ UPDATE VIDEOS
================================= */
exports.updateVideos = async (req, res) => {
  try {
    let updateData = cleanData(req.body);
    updateData.updatedAt = Date.now();

    if (req.files?.mainShowcaseFile) {
      updateData.mainShowcaseId = await uploadToCloudinary(
        req.files.mainShowcaseFile[0].buffer
      );
    }

    if (req.files?.selectedProjectFile) {
      updateData.selectedProjectId = await uploadToCloudinary(
        req.files.selectedProjectFile[0].buffer
      );
    }

    if (req.files?.architectureFile) {
      updateData.architectureId = await uploadToCloudinary(
        req.files.architectureFile[0].buffer
      );
    }

    if (req.files?.innovationFile) {
      updateData.innovationId = await uploadToCloudinary(
        req.files.innovationFile[0].buffer
      );
    }

    const landing = await LandingHero.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, upsert: true }
    );

    res.json(landing);
  } catch (err) {
    res.status(500).json({ error: "Failed to update videos" });
  }
};

/* ===============================
   4️⃣ UPDATE LIFESTYLE
================================= */
exports.updateLifestyle = async (req, res) => {
  try {
    let updateData = cleanData(req.body);
    updateData.updatedAt = Date.now();

    if (req.files?.tutorialImage) {
      updateData.tutorialImage = await uploadToCloudinary(
        req.files.tutorialImage[0].buffer
      );
    }

    if (req.files?.lifestyleImage) {
      updateData.lifestyleImage = await uploadToCloudinary(
        req.files.lifestyleImage[0].buffer
      );
    }

    const landing = await LandingHero.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, upsert: true }
    );

    res.json(landing);
  } catch (err) {
    res.status(500).json({ error: "Failed to update lifestyle" });
  }
};
