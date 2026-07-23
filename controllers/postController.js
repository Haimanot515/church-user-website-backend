const Post = require("../models/Post");
const Category = require("../models/Category");
const cloudinary = require("../config/cloudinary");


// Upload image to Cloudinary
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {

    const stream = cloudinary.uploader.upload_stream(
      { folder: "posts" },

      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(fileBuffer);
  });
};



// GET ALL POSTS (Newest first, paginated)
// Query params: ?page=1&limit=10&category=<name>
exports.getPosts = async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // === ADDED: resolve category name -> id, and build the filter ===
    const filter = {};

    if (req.query.category) {
      const categoryDoc = await Category.findOne({ name: req.query.category });

      if (categoryDoc) {
        filter.category = categoryDoc._id;
      } else {
        // No matching category — return an empty result instead of all posts
        return res.json({
          posts: [],
          currentPage: page,
          totalPages: 0,
          totalPosts: 0
        });
      }
    }

    const [posts, totalPosts] = await Promise.all([

      Post.find(filter)
        .populate("author", "name")
        .populate("category", "name")
        .populate("language", "name code")
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit),

      Post.countDocuments(filter)

    ]);

    res.json({

      posts,

      currentPage: page,

      totalPages: Math.ceil(totalPosts / limit),

      totalPosts

    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }
};




// GET SINGLE POST
exports.getPostById = async (req, res) => {

  try {

    const post = await Post.findById(req.params.id)
      .populate("author", "name")
      .populate("category", "name")
      .populate("language", "name");


    if (!post) {

      return res.status(404).json({
        message: "Post not found"
      });

    }


    res.json(post);


  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};




// CREATE POST
exports.createPost = async (req, res) => {

  try {

    let imageUrl = "";


    if (req.file) {

      const result = await uploadToCloudinary(req.file.buffer);

      imageUrl = result.secure_url;

    }



    const post = new Post({

      title: req.body.title,

      description: req.body.description,

      content: req.body.content,

      imageUrl: imageUrl,


      author: req.user.id,

      category: req.body.category,

      language: req.body.language,


      isTrending: req.body.isTrending === "true",

      isRecommended: req.body.isRecommended === "true",

      isFeatured: req.body.isFeatured === "true",


      status: req.body.status || "draft",

      publishedAt:
        req.body.status === "published"
          ? Date.now()
          : null

    });



    const savedPost = await post.save();


    res.status(201).json(savedPost);



  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Failed to create post",
      error: err.message
    });

  }

};




// UPDATE POST
exports.updatePost = async (req, res) => {

  try {


    let imageUrl = "";


    if (req.file) {

      const result = await uploadToCloudinary(req.file.buffer);

      imageUrl = result.secure_url;

    }


    const updateData = {

      ...req.body,

      ...(imageUrl && {
        imageUrl: imageUrl
      }),

      updatedAt: Date.now()

    };


    if (req.body.isTrending !== undefined) {
      updateData.isTrending = req.body.isTrending === "true";
    }

    if (req.body.isRecommended !== undefined) {
      updateData.isRecommended = req.body.isRecommended === "true";
    }

    if (req.body.isFeatured !== undefined) {
      updateData.isFeatured = req.body.isFeatured === "true";
    }


    const post = await Post.findByIdAndUpdate(

      req.params.id,

      updateData,

      {
        new:true
      }

    );



    if (!post) {

      return res.status(404).json({
        message:"Post not found"
      });

    }



    res.json(post);



  } catch(err){

    res.status(500).json({
      message:err.message
    });

  }

};




// DELETE POST
exports.deletePost = async(req,res)=>{

 try {


  const post = await Post.findByIdAndDelete(req.params.id);



  if(!post){

    return res.status(404).json({
      message:"Post not found"
    });

  }



  res.json({
    message:"Post deleted successfully"
  });



 }catch(err){

  res.status(500).json({
    message:err.message
  });

 }

};




// GET LATEST POSTS
exports.getLatestPosts = async(req,res)=>{

 try{

  const posts = await Post.find({
    status:"published"
  })
  .sort({
    createdAt:-1
  })
  .limit(10);


  res.json(posts);


 }catch(err){

  res.status(500).json({
    message:err.message
  });

 }

};




// GET TRENDING POSTS
exports.getTrendingPosts = async(req,res)=>{

 try{

  const posts = await Post.find({

    status:"published",

    isTrending:true

  })
  .sort({
    createdAt:-1
  });


  res.json(posts);



 }catch(err){

  res.status(500).json({
    message:err.message
  });

 }

};




// GET RECOMMENDED POSTS
exports.getRecommendedPosts = async(req,res)=>{

 try{


  const posts = await Post.find({

    status:"published",

    isRecommended:true

  })
  .sort({
    createdAt:-1
  });



  res.json(posts);



 }catch(err){


  res.status(500).json({
    message:err.message
  });


 }

};




// GET FEATURED POSTS
exports.getFeaturedPosts = async(req,res)=>{

 try{


  const posts = await Post.find({

    status:"published",

    isFeatured:true

  })
  .sort({
    createdAt:-1
  });



  res.json(posts);



 }catch(err){

  res.status(500).json({
    message:err.message
  });

 }

};