const multer = require('multer');
const path = require('path');
const fs = require('fs');

class UploadMiddleware {
  constructor() {
    this.uploadDir = path.join(__dirname, '../../public/uploads');
    if (!fs.existsSync(this.uploadDir)) fs.mkdirSync(this.uploadDir, { recursive: true });
    const storage = multer.diskStorage({
      destination: (req, file, cb) => cb(null, this.uploadDir),
      filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname))
    });
    this.uploader = multer({ storage });
  }
  single(fieldName) { return this.uploader.single(fieldName); }
}
module.exports = new UploadMiddleware();