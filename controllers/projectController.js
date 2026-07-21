const Project = require("../models/Project");
const cloudinary = require("../config/cloudinary");

exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 }); // Newest projects first
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.createProject = async (req, res) => {
  try {
    // Added all 4 essential links for Upwork conversion + category
    const { 
      title, 
      description, 
      techStack, 
      githubLink, 
      liveLink, 
      demoLink, 
      docsLink,
      category // ADDED CATEGORY
    } = req.body;

    // Basic validation
    if (!title || !description) {
      return res.status(400).json({ msg: "Title and description are required" });
    }

    let imageUrl = "";

    // Cloudinary Upload Logic
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "projects" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });

      imageUrl = result.secure_url;
    }

    // Create project with the new link parameters
    const project = await Project.create({
      title,
      description,
      category, // ADDED CATEGORY
      techStack: Array.isArray(techStack) ? techStack : techStack.split(','), // Ensure it's an array
      githubLink,
      liveLink,
      demoLink,
      docsLink,
      image: imageUrl,
      owner: req.user?.id || null, 
    });

    res.status(201).json(project);
  } catch (err) {
    console.error("Project Creation Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
