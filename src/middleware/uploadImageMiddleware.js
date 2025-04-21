const multer = require("multer");
const path = require("path");

const allowedExtensions = ['.jpg', '.jpeg', '.png'];

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            req.fileValidationError = "Only .jpg, .jpeg, and .png files are allowed";
            cb(null, false, req.fileValidationError);
        }
    }
});

module.exports = upload;
