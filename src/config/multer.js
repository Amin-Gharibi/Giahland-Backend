const multer = require("multer");
const path = require("path");

// Set up storage engine
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, path.join(__dirname, "../../uploads")); // Directory to save uploaded files
	},
	filename: function (req, file, cb) {
		cb(null, `${Date.now()}-${file.originalname}`);
	},
});

// Initialize upload
const upload = multer({
	storage: storage,
	limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB file size limit
	fileFilter: function (req, file, cb) {
		const fileTypes = /jpeg|jpg|png|gif/;
		const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
		const mimetype = fileTypes.test(file.mimetype);

		if (mimetype && extname) {
			return cb(null, true);
		} else {
			cb(new Error("Only images are allowed"));
		}
	},
});

module.exports = upload;
