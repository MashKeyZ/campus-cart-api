const express = require('express');
const router = express.Router();
var authenticate = require('../authenticate');
const Product = require('../models/Product');
const multer = require('multer');

router.route('/search')
.all((req,res,next) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  next();
})
.post(authenticate.verifyUser,async(req,res,next) => {
    //Get all cart items
    console.log('creating review')
    try{

    
    const results = await Product.searchProducts(req.body?.name,req.user.userId)
      
    res.status(200).json({ status: "Ok", message: "Successfully Added  review", products:results?.products,cart:results?.newCart });
     
  }catch(err){
    res.status(400).json({ status: "Failed", type: "Internal", message: "An error occurred, please try again." });
  }
})




module.exports = router;