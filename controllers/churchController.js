const Church = require("../models/Church");
const ChurchAssignment = require("../models/ChurchAssignment");
const cloudinary = require("../config/cloudinary");


// Upload image to Cloudinary
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


// CREATE CHURCH
exports.createChurch = async (req, res) => {
  try {

    let image = "";

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      image = result.secure_url;
    }

    const isPrimary = req.body.isPrimary === true || req.body.isPrimary === "true";

    // Only one church PER LANGUAGE should ever be "primary" (the one
    // shown as the Hero on that language's public page) — each language
    // has its own translated Church document, so the uniqueness rule is
    // scoped to req.body.language rather than the entire collection.
    if (isPrimary) {
      await Church.updateMany(
        { language: req.body.language, isPrimary: true },
        { isPrimary: false }
      );
    }


    const church = await Church.create({

      churchName: req.body.churchName,

      shortDescription: req.body.shortDescription,

      description: req.body.description,

      history: req.body.history,

      image,

      address: req.body.address,

      phone: req.body.phone,

      email: req.body.email,

      serviceDays: req.body.serviceDays,

      serviceTime: req.body.serviceTime,

      language: req.body.language,

      isFeatured: req.body.isFeatured,

      isPrimary

    });


    res.status(201).json(church);


  } catch(err){

    res.status(500).json({
      message: err.message
    });

  }
};




// GET ALL CHURCHES
// language-scoped filter, always applied — same pattern as Post's
// getPosts/getLatestPosts
exports.getChurches = async(req,res)=>{

  try{

    const churches = await Church.find({
      language: req.language
    })
      .populate("language", "name code")
      .sort({
        createdAt:-1
      });


    res.json(churches);


  }catch(err){

    res.status(500).json({
      message:err.message
    });

  }

};




// GET SINGLE CHURCH
exports.getChurchById = async(req,res)=>{

  try{

    const church = await Church.findById(
      req.params.id
    )
      .populate("language", "name code");


    if(!church)
      return res.status(404).json({
        message:"Church not found"
      });


    res.json(church);


  }catch(err){

    res.status(500).json({
      message:err.message
    });

  }

};




// GET THE PRIMARY CHURCH (public, powers the Hero section)
// Scoped to the requester's language, same as getPrimaryPost-style
// endpoints — each language has its own primary church.
exports.getPrimaryChurch = async (req, res) => {
  try {

    const church = await Church.findOne({
      isPrimary: true,
      language: req.language,
    })
      .populate("language", "name code");

    if (!church)
      return res.status(404).json({
        message: "No primary church found",
      });

    res.json(church);

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};




// UPDATE CHURCH
exports.updateChurch = async(req,res)=>{

  try{

    let image;


    if(req.file){

      const result = await uploadToCloudinary(
        req.file.buffer
      );

      image = result.secure_url;

    }

    const isPrimary = req.body.isPrimary === true || req.body.isPrimary === "true";

    // Same per-language uniqueness rule on update: if this church is
    // being marked primary, unset whichever church currently holds that
    // flag for the same language first (excluding this church itself).
    // Falls back to this church's own current language if none was sent
    // in the body, so switching primary status without also resending
    // the language field doesn't accidentally scope across all of them.
    if (isPrimary) {
      const existing = await Church.findById(req.params.id);
      const languageId = req.body.language || existing?.language;

      await Church.updateMany(
        { _id: { $ne: req.params.id }, language: languageId, isPrimary: true },
        { isPrimary: false }
      );
    }


    const church =
      await Church.findByIdAndUpdate(

        req.params.id,

        {
          ...req.body,

          ...(image && {
            image
          }),

          ...(req.body.isPrimary !== undefined && {
            isPrimary
          })

        },

        {
          new:true
        }

      )
        .populate("language", "name code");


    res.json(church);


  }catch(err){

    res.status(500).json({
      message:err.message
    });

  }

};




// DELETE CHURCH
exports.deleteChurch = async(req,res)=>{

  try{

    await Church.findByIdAndDelete(
      req.params.id
    );


    res.json({
      message:"Church deleted successfully"
    });


  }catch(err){

    res.status(500).json({
      message:err.message
    });

  }

};





// =======================
// CHURCH ASSIGNMENT
// =======================


// CREATE ASSIGNMENT
exports.createAssignment = async (req, res) => {
  try {
    const isCurrent = req.body.isCurrent !== undefined
      ? (req.body.isCurrent === true || req.body.isCurrent === "true")
      : true;

    const isPrimary = req.body.isPrimary === true || req.body.isPrimary === "true";

    // Leader photo, uploaded the same way as a church image — via
    // multer + Cloudinary. Requires upload.single("image") on the
    // route and the frontend to send a multipart/form-data body.
    let image = "";
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      image = result.secure_url;
    }

    // If this assignment is being marked current, unset any other
    // "current" assignment for the same user first so a per-user lookup
    // never finds more than one match.
    if (isCurrent) {
      await ChurchAssignment.updateMany(
        { user: req.body.user, isCurrent: true },
        { isCurrent: false }
      );
    }

    // Only one assignment across the ENTIRE collection should ever be
    // "primary" (the one featured on the public Church page), regardless
    // of which user it belongs to. Enforce that here instead of trusting
    // whoever sets the flag to remember to unset the old one.
    if (isPrimary) {
      await ChurchAssignment.updateMany(
        { isPrimary: true },
        { isPrimary: false }
      );
    }

    const assignment = await ChurchAssignment.create({
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
    res.status(500).json({
      message: err.message,
    });
  }
};




// UPDATE ASSIGNMENT
// Lets an admin fix or change isCurrent / isPrimary / image (and other
// fields) on an existing assignment without deleting and recreating it.
exports.updateAssignment = async (req, res) => {
  try {
    const updates = { ...req.body };

    if (req.body.isCurrent !== undefined) {
      const isCurrent = req.body.isCurrent === true || req.body.isCurrent === "true";
      updates.isCurrent = isCurrent;

      if (isCurrent) {
        await ChurchAssignment.updateMany(
          { _id: { $ne: req.params.id }, user: req.body.user, isCurrent: true },
          { isCurrent: false }
        );
      }
    }

    if (req.body.isPrimary !== undefined) {
      const isPrimary = req.body.isPrimary === true || req.body.isPrimary === "true";
      updates.isPrimary = isPrimary;

      if (isPrimary) {
        await ChurchAssignment.updateMany(
          { _id: { $ne: req.params.id }, isPrimary: true },
          { isPrimary: false }
        );
      }
    }

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      updates.image = result.secure_url;
    }

    const assignment = await ChurchAssignment.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    )
      .populate("church")
      .populate("user");

    if (!assignment)
      return res.status(404).json({
        message: "Assignment not found",
      });

    res.json(assignment);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};




// GET CURRENT CHURCH OF A SPECIFIC USER
// (kept for cases like an admin viewing their own profile)
exports.getCurrentChurch = async(req,res)=>{

  try{

    const assignment =
      await ChurchAssignment
      .findOne({
        user:req.params.userId,
        isCurrent:true
      })
      .populate("church")
      .populate("user");


    if(!assignment)
      return res.status(404).json({
        message:"Current church not found"
      });


    res.json(assignment);


  }catch(err){

    res.status(500).json({
      message:err.message
    });

  }

};




// GET THE PRIMARY LEADER'S CURRENT CHURCH (public, no userId needed)
// Shows the one featured pastor/leader on the public Church page —
// not a list of all users' assignments.
exports.getLeadershipChurch = async (req, res) => {
  try {

    const assignment = await ChurchAssignment.findOne({
      isCurrent: true,
      isPrimary: true,
    })
      .populate("church")
      .populate("user");

    if (!assignment)
      return res.status(404).json({
        message: "No primary leader assignment found",
      });

    res.json(assignment);

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};




// GET ALL ASSIGNMENTS
exports.getAssignments = async(req,res)=>{

  try{

    const assignments =
      await ChurchAssignment.find()
      .populate("church")
      .populate("user");


    res.json(assignments);


  }catch(err){

    res.status(500).json({
      message:err.message
    });

  }

};




// DELETE ASSIGNMENT
exports.deleteAssignment = async(req,res)=>{

  try{

    await ChurchAssignment.findByIdAndDelete(
      req.params.id
    );


    res.json({
      message:"Assignment deleted successfully"
    });


  }catch(err){

    res.status(500).json({
      message:err.message
    });

  }

};