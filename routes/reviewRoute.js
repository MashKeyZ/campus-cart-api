const express = require('express');
const router = express.Router();
var authenticate = require('../authenticate');
const Product = require('../models/Product');
const multer = require('multer');

//– http://localhost:3001/products

router.route('/addreview')
.all((req,res,next) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  next();
})
.post(authenticate.verifyUser,async(req,res,next) => {
    //Get all cart items
    console.log('creating review')
    console.log(req.body)
    Product.createReview(req.body?.productId, req.user?.userId,req.body?.review,req.body?.stars,(err, review) => {
      if (err) {
        console.log(err)
          res.status(400).json({ status: "Failed", type: "Internal", message: "An error occurred, please try again." });
      } else {
        console.log('created review')
        res.status(201).json({ status: "Ok", message: "Successfully Added  review", review:review });
      }
    });
})




module.exports = router;