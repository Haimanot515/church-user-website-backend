module.exports=function(req,res,next){
    if(!req.user) return res.status(401).json({msg:"No user info."});
    const isAdmin=req.user.isAdmin===true||req.user.isAdmin==="true";
    if(!req.user.isAdmin)return res.status(403).json({msg:"Acess denied.Admin only."});

    next();
};
