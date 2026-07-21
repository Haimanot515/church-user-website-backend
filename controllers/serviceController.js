const Service = require("../models/Service");
const cloudinary = require("../config/cloudinary");


// Upload image to Cloudinary
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "services",
      },

      (error, result) => {

        if (error) return reject(error);

        resolve(result);

      }
    );


    stream.end(fileBuffer);

  });
};




// GET ALL SERVICES
exports.getServices = async (req, res) => {

  try {

    const services = await Service.find()
      .sort({
        createdAt: -1,
        _id: -1
      });


    res.json(services);


  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};





// GET SINGLE SERVICE
exports.getServiceById = async (req, res) => {

  try {

    const service = await Service.findById(req.params.id);


    if (!service) {

      return res.status(404).json({
        message: "Service not found"
      });

    }


    res.json(service);


  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};






// CREATE SERVICE
exports.createService = async (req, res) => {

  try {

    let imageUrl = "";


    if(req.file){

      const result = await uploadToCloudinary(
        req.file.buffer
      );

      imageUrl = result.secure_url;

    }




    const service = new Service({

      title: req.body.title,

      description: req.body.description,

      imageUrl:imageUrl,


      schedule:req.body.schedule,


      category:req.body.category,


      location:req.body.location,


      isFeatured:
        req.body.isFeatured || false,


      status:
        req.body.status || "active"

    });




    const savedService = await service.save();


    res.status(201).json(savedService);



  } catch(err){


    console.error(err);


    res.status(500).json({

      message:"Failed to create service",

      error:err.message

    });


  }

};








// UPDATE SERVICE
exports.updateService = async(req,res)=>{


 try{


  let imageUrl="";



  if(req.file){

    const result = await uploadToCloudinary(
      req.file.buffer
    );


    imageUrl=result.secure_url;

  }




  const service = await Service.findByIdAndUpdate(

    req.params.id,


    {

      ...req.body,


      ...(imageUrl && {
        imageUrl:imageUrl
      }),


      updatedAt:Date.now()

    },


    {
      new:true
    }

  );




  if(!service){

    return res.status(404).json({

      message:"Service not found"

    });

  }




  res.json(service);



 }catch(err){


  res.status(500).json({

    message:err.message

  });


 }


};








// DELETE SERVICE
exports.deleteService = async(req,res)=>{


 try{


  const service =
    await Service.findByIdAndDelete(
      req.params.id
    );




  if(!service){

    return res.status(404).json({

      message:"Service not found"

    });

  }



  res.json({

    message:"Service deleted successfully"

  });



 }catch(err){


  res.status(500).json({

    message:err.message

  });


 }


};







// GET FEATURED SERVICES
exports.getFeaturedServices = async(req,res)=>{


 try{


  const services = await Service.find({

    isFeatured:true,

    status:"active"

  })
  .sort({

    createdAt:-1

  });



  res.json(services);



 }catch(err){


  res.status(500).json({

    message:err.message

  });


 }


};








// GET ACTIVE SERVICES
exports.getActiveServices = async(req,res)=>{


 try{


  const services = await Service.find({

    status:"active"

  })
  .sort({

    createdAt:-1

  });



  res.json(services);



 }catch(err){


  res.status(500).json({

    message:err.message

  });


 }


};