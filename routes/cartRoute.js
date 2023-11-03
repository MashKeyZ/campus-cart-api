const express = require('express');
const router = express.Router();
var authenticate = require('../authenticate');
const User = require('../models/User')
const Cart = require('../models/Cart');
const Uploads = require('../models/uploads');
const multer = require('multer');

//– http://localhost:3001/cart
router.route('/')
.all((req,res,next) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  next();
})
.get(authenticate.verifyUser,async(req,res,next) => {
    //Get all cart items
    try {
        const cart = await Cart.getUserCart(req.user.userId)
        return res.status(201).json({ status: "Ok", type: "", message: "",cart:cart });
    
      } catch (error) {
        return res.status(200).json({ status: "Failed", type: "Internal", message: "An error occurred" });
      }
})
.post(authenticate.verifyUser,(req, res, next) => {
    //Add item to cart
    const {data} = req.body;
    const newCart = new Cart(data, req.user.userId);
  
    newCart.addToCart((err, cart) => {
      if (err) {
          res.status(400).json({ status: "Failed", type: "Internal", message: "An error occurred, please try again." });
      } else {
        res.status(201).json({ status: "Ok", message: "Successfully Added to cart", cart:cart});
      }
    });
})
.put(authenticate.verifyUser,(req, res, next) => {
    //Update cart item
    const product = req.body.product;
    if(product.quantity!==0){
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
    }
})
.delete(authenticate.verifyUser,(req, res, next) => {
  res.end('Deleting all dishes');
});


module.exports = router;