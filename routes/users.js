const express = require('express');
const router = express.Router();
var authenticate = require('../authenticate');
const User = require('../models/User')
const Uploads = require('../models/uploads');
const multer = require('multer');

/**
 200 => Success / OK
 304 => Not Modified
 401 => Unauthorized Error
 404 => Not found
 403 => Forbiden
 */

//– http://localhost:300/users/login
router.route('/login')
.all((req,res,next) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');

  next();
})
.get((req,res,next) => {
  res.statusCode = 403;
  res.end('GET not supported');
})
.post((req, res, next) => {
    const {email,password} = req.body;
    User.authorizeUser(email,password)
    .then((results)=>{
      if(results){
        res.statusCode = 201;
        res.json({status:"Ok",message:"Logged in",token:results.token,userId:results.userId,profile:results.profile})
      }else{
        res.statusCode = 201;
        res.json({status:"Failed",message:"Invalid Credentials!!!"})
      }

    }).catch(err =>{
      res.statusCode = 403;
      res.json({status:"Failed",message:"An error occured"})
    })
 
})
.put((req, res, next) => {
  res.statusCode = 403;
  res.end('PUT not supported');
})
.delete((req, res, next) => {
  res.statusCode = 403;
  res.end('DELETE not supported on login');
});
//– http://localhost:3000/users/signup

router.route('/signup')
.all((req,res,next) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  next();
})
.get((req,res,next) => {
  res.statusCode = 403;
  res.end('GET not supported');
    
})
.post((req, res, next) => {
  const { registrationData } = req.body;

  const { userProfile, address, authUser, campusStore } = registrationData;
  const newUser = new User(userProfile, authUser, address, campusStore);

  newUser.createUser((err, token) => {
    if (err) {
      if (err === "User Exist") {
        res.status(400).json({ status: "Failed", type: "Duplicate", message: "User already exist" });
      } else {
        res.status(500).json({ status: "Failed", type: "Internal", message: "An error occurred, please try again." });
      }
    } else {
      res.status(201).json({ status: "Ok", message: "User created successfully.", token: token });
    }
  });
})
.put((req, res, next) => {
  res.statusCode = 403;
  res.end('PUT not supported');  
})
.delete((req, res, next) => {
  res.statusCode = 403;
  res.end('DELETE not supported');
});

//This route checks if the user already exis
router.route('/signup/userexist').post(async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');

    const userByEmail = await User.getUserByEmail(req.body.email);
    if (userByEmail) {
      return res.status(200).json({ status: "Failed", type: "Duplicate", message: "Email already exists" });
    }

    const userByContact = await User.getUserByContact(req.body.contact);
    if (userByContact) {

      return res.status(200).json({ status: "Failed", type: "Duplicate", message: "Phone number already exists" });

    }

    return res.status(201).json({ status: "Ok", type: "", message: "" });

  } catch (error) {

    return res.status(200).json({ status: "Failed", type: "Internal", message: "An error occurred" });

  }
});

router.route('/userchannels').get(authenticate.verifyUser,async(req,res,next) => {
    //Get all cart items
    try {
        const chennels = await User.getChannels(req.user.userId)
        console.log(chennels)
        return res.status(201).json({ status: "Ok", type: "", message: "",channels:chennels });
    
      } catch (error) {
        return res.status(200).json({ status: "Failed", type: "Internal", message: "An error occurred" });
      }
})

router.route('/changeprofile').post(authenticate.verifyUser,async (req, res) => {

    res.setHeader('Content-Type', 'application/json');
    User.updtateProfilePic(req.user.userId, req.body?.data.imagePath,(err, path) => {
      if (err) {
          res.status(500).json({ status: "Failed", type: "Internal", message: "An error occurred, please try again." });
      } else {
        res.status(201).json({ status: "Ok", message: "User created successfully.", path: path });
      }
    });
});

router.route('/campusshops').get(authenticate.verifyUser,async(req,res,next) => {
  //Get all cart items
  try {
      const stores = await User.getCampusStores();
      
      return res.status(201).json({ status: "Ok", type: "", message: "",stores:stores });
  
    } catch (error) {
      return res.status(400).json({ status: "Failed", type: "Internal", message: "An error occurred" });
    }
})

module.exports = router;