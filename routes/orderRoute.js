const express = require('express');
const router = express.Router();
var authenticate = require('../authenticate');
const User = require('../models/User')
const Cart = require('../models/Cart');
const Uploads = require('../models/uploads');
const multer = require('multer');
const Order = require('../models/Order')

//– http://localhost:3001/orders
router.route('/')
.all((req,res,next) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  next();
})
.get(authenticate.verifyUser,async(req,res,next) => {
    //Get all cart items
    try {
        const orders = await Order.getMyOrders(req.user.userId)
        return res.status(201).json({ status: "Ok", type: "", message: "",orders:orders });
    
      } catch (error) {
        return res.status(400).json({ status: "Failed", type: "Internal", message: "An error occurred" });
      }
})
.post(authenticate.verifyUser,async (req, res, next) => {
    //Add item to cart
    console.log("Creating order : "+req.body.firstName)
    const order = new Order(req.user.userId,req.body.firstName)
    //const cart = await order.getDistinctUsersCart(req.user.userId)
    order.createOrder((err,product) => {
      if (err) {
          res.status(400).json({ status: "Failed", type: "Internal", message: "An error occurred, please try again." });
      } else {
        res.status(201).json({ status: "Ok", message: "Successfully Added to cart", });
      }
    });
    //res.status(201).json({ status: "Ok", message: "Successfully Added to cart", cart:cart});
})
.put(authenticate.verifyUser,(req, res, next) => {
    //Update cart item
    const product = req.body.product;
    /*if(product.quantity!==0){
    Cart.updateQuantity(product.quantity,product.productId,product.productUserId,req.user.userId,(err, cart) => {
        if (err) {
            console.log(err)
            res.status(400).json({ status: "Failed", type: "Internal", message: "An error occurred, please try again." });
        } else {
          res.status(201).json({ status: "Ok", message: "Successfully Added to cart", cart:cart });
        }
      });
    }else{
        Cart.deleteFromCart(product.productId,product.productUserId,req.user.userId,(err, cart) => {
            if (err) {
                console.log(err)
                res.status(400).json({ status: "Failed", type: "Internal", message: "An error occurred, please try again." });
            } else {
              res.status(201).json({ status: "Ok", message: "Successfully Added to cart", cart:cart });
            }
          });
    }*/
    res.status(201).json({ status: "Ok", message: "Successfully Added to cart" });
})
.delete(authenticate.verifyUser,(req, res, next) => {
  res.end('Deleting all dishes');
});

router.route('/track')
.all((req,res,next) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  next();
})
.get(authenticate.verifyUser,async(req,res,next) => {
    //Get all cart items
    console.log("Tracking")
    try {
        const orders = await Order.trackMyOrders(req.user.userId)
        return res.status(201).json({ status: "Ok", type: "", message: "",orders:orders });
    
      } catch (error) {
        return res.status(400).json({ status: "Failed", type: "Internal", message: "An error occurred" });
      }
})

router.route('/orderproducts/:orderId')
.all((req,res,next) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  next();
})
.get(authenticate.verifyUser,async(req,res,next) => {
    //Get all cart items
    try {
        const products = await Order.getOrderProducts(decodeURIComponent(req.params.orderId))
        console.log(products)
        return res.status(201).json({ status: "Ok", type: "", message: "",products:products });
    
      } catch (error) {
        return res.status(400).json({ status: "Failed", type: "Internal", message: "An error occurred" });
      }
})


module.exports = router;