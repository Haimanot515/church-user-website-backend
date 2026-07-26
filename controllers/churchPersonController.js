const ChurchPerson = require("../models/ChurchPerson");
const cloudinary = require("../config/cloudinary");

// Helper function to handle Cloudinary stream uploads (supports multiple photos)
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

// Helper: upload an array of files and return their secure_urls
const uploadMultipleToCloudinary = async (files) => {
  const uploads = await Promise.all(
    files.map((file) => uploadToCloudinary(file.buffer))
  );
  return uploads.map((result) => result.secure_url);
};

// GET: Fetch ALL Church Persons
// Optionally filter by category via ?category=leader | specialThanks | testimony
// Sorted by church rank (rankOrder) first, then newest first.
exports.getChurchPersons = async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) {
      filter.category = req.query.category;
    }

    const churchPersons = await ChurchPerson.find(filter).sort({
      rankOrder: 1,
      createdAt: -1,
      _id: -1,
    });
    res.json(churchPersons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET: Fetch a single Church Person by ID
exports.getChurchPersonById = async (req, res) => {
  try {
    const churchPerson = await ChurchPerson.findById(req.params.id);
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

    const newChurchPerson = new ChurchPerson({
      name: req.body.name,
      title: req.body.title,
      description: req.body.description,
      role: req.body.role,
      message: req.body.message,
      category: req.body.category,
      rank: req.body.rank,
      rankOrder: req.body.rankOrder !== undefined ? Number(req.body.rankOrder) : 0,
      photos: photoUrls,
    });

    const savedChurchPerson = await newChurchPerson.save();
    res.status(201).json(savedChurchPerson);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create church person", error: err.message });
  }
};

// PUT: Update a specific Church Person entry by ID
// New photos are appended to existing ones unless replacePhotos=true is sent in the body
exports.updateChurchPerson = async (req, res) => {
  try {
    const existingPerson = await ChurchPerson.findById(req.params.id);
    if (!existingPerson) {
      return res.status(404).json({ message: "Church person not found" });
    }

    let photoUrls = existingPerson.photos || [];

    if (req.files && req.files.length > 0) {
      const newPhotoUrls = await uploadMultipleToCloudinary(req.files);

      if (req.body.replacePhotos === "true") {
        photoUrls = newPhotoUrls;
      } else {
        photoUrls = [...photoUrls, ...newPhotoUrls];
      }
    }

    const {
      name,
      title,
      description,
      role,
      message,
      category,
      rank,
      rankOrder,
    } = req.body;

    const updatedChurchPerson = await ChurchPerson.findByIdAndUpdate(
      req.params.id,
      {
        ...(name !== undefined && { name }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(role !== undefined && { role }),
        ...(message !== undefined && { message }),
        ...(category !== undefined && { category }),
        ...(rank !== undefined && { rank }),
        ...(rankOrder !== undefined && { rankOrder: Number(rankOrder) }),
        photos: photoUrls,
      },
      { new: true }
    );

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

    const churchPerson = await ChurchPerson.findById(req.params.id);
    if (!churchPerson) {
      return res.status(404).json({ message: "Church person not found" });
    }

    churchPerson.photos = (churchPerson.photos || []).filter(
      (url) => url !== photoUrl
    );

    await churchPerson.save();
    res.json(churchPerson);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE: Remove a church person entry
exports.deleteChurchPerson = async (req, res) => {
  try {
    const churchPerson = await ChurchPerson.findByIdAndDelete(req.params.id);
    if (!churchPerson) {
      return res.status(404).json({ message: "Church person not found" });
    }
    res.json({ message: "Church person deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};