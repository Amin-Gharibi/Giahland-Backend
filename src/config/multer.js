const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Set up storage engine
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		try {
			const uploadDir = path.join(__dirname, "../../uploads");

			// Ensure the directory exists
			if (!fs.existsSync(uploadDir)) {
				fs.mkdirSync(uploadDir, { recursive: true });
			}
			cb(null, uploadDir);
		} catch (error) {
			cb(new Error("Could not create upload directory"));
		}
	},
	filename: function (req, file, cb) {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(null, `${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
	},
});

// Initialize upload
const upload = multer({
	storage: storage,
	limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB file size limit
	fileFilter: function (req, file, cb) {
		const fileTypes = /jpeg|jpg|png/;
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
