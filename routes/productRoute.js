const express = require('express');
const router = express.Router();
var authenticate = require('../authenticate');
const Product = require('../models/Product');
const multer = require('multer');

//– http://localhost:3001/products
router.route('/')
.all((req,res,next) => {
    
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  next();
})
.get(authenticate.verifyUser,async(req,res,next) => {
    //Get all cart items
    //const {startIndex, countPerPage} = req.body;
    console.log(req.body);
    try {

        const {products,newCart} = await Product.getProducts(0, 100,req.user.userId);
        return res.status(201).json({ status: "Ok", type: "", message: "",products:products,cart:newCart});
    
      } catch (error) {
        console.log("An error occured")
        console.log(error)
        return res.status(500).json({ status: "Failed", type: "Internal", message: "An error occurred" });
      }

})
.post(authenticate.verifyUser,(req, res, next) => {
    //Add item to cart
    const product = req.body.product;

    const newProduct = new Product(product, req.user.userId);
  
    newProduct.createProduct((err, productId) => {
      if (err) {
          res.status(400).json({ status: "Failed", type: "Internal", message: "An error occurred, please try again." });
      } else {
        res.status(201).json({ status: "Ok", message: "Successfully Added to cart", productId:productId });
      }
    });
    //res.status(201).json({ status: "Ok", message: "Successfully Added to cart" });
})
.put(authenticate.verifyUser,(req, res, next) => {
    //Update cart item
    const product = req.body.product;
    Product.updtateProduct(product.productId,product?.price,product?.quantity,req.user.userId,(err, productId) => {
        if (err) {
            res.status(400).json({ status: "Failed", type: "Internal", message: "An error occurred, please try again." });
        } else {
          res.status(201).json({ status: "Ok", message: "Successfully Added to cart", productId:productId });
        }
      });
})
.delete(authenticate.verifyUser,(req, res, next) => {
    return res.status(200).json({ status: "Failed", type: "Internal", message: "End point not supported" });
});

//– http://localhost:3001/products/:productId
router.route('/:productId')
.all((req,res,next) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  next();
})
.get(authenticate.verifyUser,async(req,res,next) => {
    //Get all cart items
    try {

        const {product,rowsImages,newCart,reviews} = await Product.getProductById(req.params.productId,req.user.userId);
        console.log(rowsImages)
        return res.status(201).json({ status: "Ok", type: "", message: "",product:product,cart:newCart,images:rowsImages,reviews:reviews});
    
      } catch (error) {
        console.log(error);
        return res.status(400).json({ status: "Failed", type: "Internal", message: "An error occurred" });
      }

})
.post(authenticate.verifyUser,(req, res, next) => {
    return res.status(200).json({ status: "Failed", type: "Internal", message: "End point not supported" });
})
.put(authenticate.verifyUser,(req, res, next) => {
  Product.deleteProduct(req.params.productId, req.user.userId,(err,productId)=>{
    
    if(err){
      console.log(err)
      return res.status(400).json({ status: "Failed", type: "Internal", message: "An error occurred" });
    }else{
      return res.status(200).json({ status: "Success", type: "", message: "Item deleted",productId:productId });
    }
  })
   
})



//– http://localhost:3001/products/campus/:storeId
router.route('/campus/:storeId')
.all((req,res,next) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  next();
})
.get(authenticate.verifyUser,async(req,res,next) => {
    //Get all cart items
    try {
        console.log('Getting store items')
        const response= await Product.getStoreProducts(req.params.storeId,req.user.userId);
        return res.status(201).json({ status: "Ok", type: "", message: "",products:response?.products,cart:response?.newCart});
      } catch (error) {
        console.log(error)
        return res.status(400).json({ status: "Failed", type: "Internal", message: "An error occurred" });
      }

})

//Get all products for a specific user
router.route('/getmine/:userId')
.all((req,res,next) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  next();
})
.get(authenticate.verifyUser,async(req,res,next) => {
    //Get all cart items
    console.log('Recieved request')
    try {
       console.log("Req, "+req.params.userId)
        const {products,newCart} = await Product.getUserProducts(req.params.userId,req.user.userId);
        return res.status(201).json({ status: "Ok", type: "", message: "",products:products,cart:newCart});
    
      } catch (error) {
        console.log(error);
        return res.status(401).json({ status: "Failed", type: "Internal", message: "An error occurred" });
      }
})

//Get all products for a specific user
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