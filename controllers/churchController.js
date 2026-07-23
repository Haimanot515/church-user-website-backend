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

      isFeatured: req.body.isFeatured

    });


    res.status(201).json(church);


  } catch(err){

    res.status(500).json({
      message: err.message
    });

  }
};




// GET ALL CHURCHES
exports.getChurches = async(req,res)=>{

  try{

    const churches = await Church.find()
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
    );


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


    const church =
      await Church.findByIdAndUpdate(

        req.params.id,

        {
          ...req.body,

          ...(image && {
            image
          })

        },

        {
          new:true
        }

      );


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
exports.createAssignment = async(req,res)=>{

  try{

    const assignment =
      await ChurchAssignment.create({

        user:req.body.user,

        church:req.body.church,

        role:req.body.role,

        servingSince:req.body.servingSince,

        description:req.body.description,

        isCurrent:req.body.isCurrent

      });


    res.status(201).json(assignment);


  }catch(err){

    res.status(500).json({
      message:err.message
    });

  }

};




// GET CURRENT CHURCH OF PRIEST
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