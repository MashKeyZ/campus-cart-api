const multer = require('multer');

class Uploads {
  constructor(uploadDir) {
    this.uploadDir = uploadDir;
    this.initStorage();
  }

  initStorage() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadDir);
      },
      filename: (req, file, cb) => {
        // Generate a unique filename for the uploaded file
        cb(null, `${Date.now()}-${file.originalname}`);
      },
    });

    this.upload = multer({ storage });
  }

  handleUpload() {
    return this.upload.single('image');
  }
}

module.exports = Uploads;
