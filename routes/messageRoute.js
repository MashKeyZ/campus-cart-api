const express = require('express');
const router = express.Router();
var authenticate = require('../authenticate');
const multer = require('multer');
const Messages = require('../models/Messages');

//– http://localhost:3001/channels
router.route('/')
.all((req,res,next) => {
    
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  next();
})
.get(authenticate.verifyUser,async(req,res,next) => {
    //Get detailed channels
    try {
        const channels = await Messages.getComChannels(req.user.userId)
        return res.status(201).json({ status: "Ok", type: "", message: "",channels:channels});
    
      } catch (error) {
        console.log("An error occured")
        console.log(error)
        return res.status(500).json({ status: "Failed", type: "Internal", message: "Could not retrieve users" });
      }

})
//– http://localhost:3001/channels/chats
router.route('/chats')
.all((req,res,next) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  next();
})
.post(authenticate.verifyUser,async(req,res,next) => {
    //Get all messages
    console.log("Inside")
    console.log(req.body)
    try {
        
        if(req.body.data?.linkId===undefined||req.body.data?.linkId===''){
            const user_2_id = req.body.data.user_2_id;
            const linkId = await Messages.getChannelId(req.user.userId,user_2_id)
            if(linkId){
                const messages = await Messages.getMessages(linkId);
                return res.status(201).json({ status: "Ok", type: "", message: "",messages:messages,linkId:linkId});
            }else{
                Messages.createComChannel(req.user.userId,user_2_id,(err,newLinkId)=>{
                    if(err){
                        return res.status(200).json({ status: "Failed", type: "Internal", message: "An error occurred" });
                    }else{
                        return res.status(201).json({ status: "Ok", type: "", message: "",messages:[],linkId:newLinkId});
                    }
                })
            }
        }else{
            const messages = await Messages.getMessages(req.body.data?.linkId);
            return res.status(201).json({ status: "Ok", type: "", message: "",messages:messages,linkId:req.body.data?.linkId});
        }  
    
      } catch (error) {
        console.log(error)
        return res.status(200).json({ status: "Failed", type: "Internal", message: "An error occurred" });
      }

})


module.exports = router;