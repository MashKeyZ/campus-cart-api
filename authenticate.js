const jwt = require('jsonwebtoken');

const secretKey = process.env.SECRET_KEY

exports.verifyUser=(req, res, next)=> {
    const token = req.header('Authorization').split(' ')[1];

   //console.log(token)
  
    if (!token) {
      return res.status(401).json({staus:"Failed",type : "No token", message: 'Authorization token is missing' });
    }
  
    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {

        return res.status(401).json({status:"Failed",type:"Unautorized", message: 'Invalid token, please login to continue using the App.' });
      }
  
      req.user = decoded;
      next();
    });
  }

  exports.verifySocket=function(token,callback){
  
    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        callback(err,null)
      }else{
        callback(null, decoded)
      }
      
    });
  }

exports.signToken = function(userId){
    return jwt.sign({userId : userId}, secretKey, { expiresIn: '48h' });
}