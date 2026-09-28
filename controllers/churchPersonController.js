const churchPersonService = require("../services/churchPersonService");
const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "church-persons" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

const uploadMultipleToCloudinary = async (files) => {
  const uploads = await Promise.all(
    files.map((file) => uploadToCloudinary(file.buffer))
  );
  return uploads.map((result) => result.secure_url);
};

// GET: Fetch ALL Church Persons for the current language
exports.getChurchPersons = async (req, res) => {
  try {
    const churchPersons = await churchPersonService.getChurchPersons(req.language, req.query.category);
    res.json(churchPersons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET: Fetch a single Church Person by ID
exports.getChurchPersonById = async (req, res) => {
  try {
    const churchPerson = await churchPersonService.getChurchPersonById(req.params.id);
    if (!churchPerson) {
      return res.status(404).json({ message: "Church person not found" });
    }
    res.json(churchPerson);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST: Create a new Church Person with multi-photo upload
exports.createChurchPerson = async (req, res) => {
  try {
    let photoUrls = [];
    if (req.files && req.files.length > 0) {
      photoUrls = await uploadMultipleToCloudinary(req.files);
    }
    const savedChurchPerson = await churchPersonService.createChurchPerson({
      name: req.body.name,
      title: req.body.title,
      description: req.body.description,
      role: req.body.role,
      message: req.body.message,
      category: req.body.category,
      rank: req.body.rank,
      rankOrder: req.body.rankOrder,
      language: req.body.language,
      photos: photoUrls,
    });
    res.status(201).json(savedChurchPerson);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create church person", error: err.message });
  }
};

// PUT: Update a specific Church Person entry by ID
exports.updateChurchPerson = async (req, res) => {
  try {
    // Check existence first so we don't upload photos for a missing record
    const existingPerson = await churchPersonService.getChurchPersonById(req.params.id);
    if (!existingPerson) {
      return res.status(404).json({ message: "Church person not found" });
    }

    // Upload ONLY the new photos. The service merges them with the existing
    // ones (or replaces them when body.replacePhotos === "true").
    let newPhotoUrls = [];
    if (req.files && req.files.length > 0) {
      newPhotoUrls = await uploadMultipleToCloudinary(req.files);
    }

    const updatedChurchPerson = await churchPersonService.updateChurchPerson(
      req.params.id,
      req.body,
      newPhotoUrls
    );

    if (!updatedChurchPerson) {
      return res.status(404).json({ message: "Church person not found" });
    }

    res.json(updatedChurchPerson);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// PATCH: Remove a single photo from a Church Person's photos array by URL
exports.removeChurchPersonPhoto = async (req, res) => {
  try {
    const { photoUrl } = req.body;
    const updated = await churchPersonService.removeChurchPersonPhoto(req.params.id, photoUrl);
    if (!updated) {
      return res.status(404).json({ message: "Church person not found" });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// DELETE: Remove a church person entry
exports.deleteChurchPerson = async (req, res) => {
  try {
    const churchPerson = await churchPersonService.deleteChurchPerson(req.params.id);
    if (!churchPerson) {
      return res.status(404).json({ message: "Church person not found" });
    }
    res.json({ message: "Church person deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};