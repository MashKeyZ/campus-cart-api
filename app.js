require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const multer = require('multer');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
const authenticate = require('./authenticate');
const User = require('./models/User')
var redis = require('./redis')
const Messages = require('./models/Messages')


const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
//const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({ region: 'eu-north-1' });

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var cartRouter = require('./routes/cartRoute');
var productRouter = require('./routes/productRoute');
var channelsRoute = require('./routes/messageRoute');
var orderRoute = require('./routes/orderRoute');
var reviewsRoute = require('./routes/reviewRoute');
var searchRoute = require('./routes/searchRoute');
const Order = require('./models/Order');

var app = express();

const server = http.createServer(app);
const io = socketIo(server);

//console.log(io)
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/cart', cartRouter);
app.use('/products', productRouter);
app.use('/channels',channelsRoute);
app.use('/orders',orderRoute);
app.use('/reviews',reviewsRoute);
app.use('/search',searchRoute)
app.use('/uploads', express.static('uploads'));


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});

const upload = multer({ storage });

app.post('/upload/profile', upload.single('image'), async(req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const filePath = req.file.path;
  const key = `${Date.now()}_${req.file.originalname}`;

  try {
    const params = {
      Bucket: 'campus-cart-s3-bucket',
      Key: key,
      Body: fs.createReadStream(filePath),
      //ACL: 'public-read',
    };

    await s3Client.send(new PutObjectCommand(params));

    const imageUrl = `https://campus-cart-s3-bucket.s3.eu-north-1.amazonaws.com/${key}`;
    //console.log(imageUrl);
    res.status(200).json({ imageUrl: imageUrl });
  } catch (error) {
    console.error('Error uploading to S3:', error);
    return res.status(500).json({ error: 'Error uploading to S3' });
  } finally {
    fs.unlinkSync(filePath); // Delete the file after uploading to S3
  }
});


io.on('connection', (socket) => {
  console.log('A new client connected');
  let userId;
  // Send a welcome message to the client
  socket.emit('authenticate', 'Send Token');

  socket.on('authenticate',  (token) => {
    console.log(`Received message: ${token}`);
    authenticate.verifySocket(token,async(err,user)=>{
      if(err){
        console.log("error")
      }else{
        const userInfo=await User.getUserById(user.userId)
        console.log(userInfo)
        let newUser ={
          userId: userInfo.userId,
          userName: userInfo.isStudent?userInfo.firstName+' '+userInfo.lastName:userInfo.name,
          image: userInfo.image,

        }
        userId = userInfo.userId;
        console.log("Socket Id : "+socket.id)
        const socketInfo = {id: socket.id,userInfo:newUser};
        const serializedSocket =JSON.stringify(socketInfo)
        io.emit('newuser', socketInfo);
        redis.set(user.userId, serializedSocket);
        //redis.quit();
        io.emit('Online', userId);
      }
    })
    
  });

  // Listen for messages from the client
  socket.on('message', (data) => {
    console.log(`Received message: ${data}`);
    // Retrieve the value for a given key
    let newData= JSON.parse(data); 
    redis.get(newData.sendTo).then(serializedSocketInfo => {

      const socketInfo = JSON.parse(serializedSocketInfo);
      const socketId = socketInfo?.id
      console.log('Socket Infor : '+socketId)
      //console.log('Socket if : '+io.sockets.sockets.socketInfo.id)
      Messages.addNewMessage(newData.linkId,newData.fromUserId,newData?.productId||null,newData.sendTo,newData._text,newData?._time,(err,done)=>{
        if(err){
          socket.emit('error','message not sent')
        }else{
          if(socketId){
            io.to(socketId).emit('message', data);
          }
          
        }
      })
      
    }).catch(err => {
      console.error('Error:', err);
      
    });
    
  });

  socket.on('orderchange', (data) => {
    console.log(`Received message: ${data}`);
    // Retrieve the value for a given key
    let newData= JSON.parse(data); 
    redis.get(newData.sendTo).then(serializedSocketInfo => {

      const socketInfo = JSON.parse(serializedSocketInfo);
      const socketId = socketInfo?.id
      console.log('Socket Infor : '+socketId)
      //console.log('Socket if : '+io.sockets.sockets.socketInfo.id)
      Order.updateOrder(newData?.orderStatus,newData?.orderId,(err,done)=>{
        if(err){
          socket.emit('error','message not sent')
        }else{
          if(socketId){
            io.to(socketId).emit('orderstatus', data);
          }
          
        }
      })
      
    }).catch(err => {
      console.error('Error:', err);
      
    });
    
  });

   // Listen for client disconnect
   socket.on('disconnect', () => {
    console.log('A client disconnected');
    // Perform any necessary cleanup or handling when a client disconnects
    io.emit('Disconnected', userId);
  });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Socket is running on port ${PORT}`);
});

module.exports = app;
