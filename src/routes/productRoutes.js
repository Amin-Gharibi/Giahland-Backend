const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth");
const productController = require("../controllers/productController");
const validateRequest = require("../middlewares/validateRequest");
const productSchemas = require("../validators/productSchemas");
const upload = require("../config/multer");
const { APIError } = require("../middlewares/errorHandler");
const fs = require("fs");
const path = require("path");

// Public routes
router.get("/", productController.getProducts);
router.get("/new-arrivals", productController.getNewArrivals);
router.get("/:id", productController.getProductById);
router.get("/category/:categoryId", productController.getProductsByCategory);

// Protected seller routes
router.use(protect);
router.use(authorize("seller"));

router.post("/", validateRequest(productSchemas.create), productController.createProduct);
router.put("/:id", validateRequest(productSchemas.update), productController.updateProduct);
router.delete("/:id", productController.deleteProduct);
router.post(
	"/:id/images",
	upload.array("images", 5),
	(req, res, next) => {
		const files = req.files;
		const fileData = files?.map((file) => ({
			fieldname: file.fieldname,
			originalname: file.originalname,
			encoding: file.encoding,
			mimetype: file.mimetype,
			destination: file.destination,
			filename: file.filename,
			path: file.path,
			size: file.size,
		}));

		const { error } = productSchemas.uploadImages.validate({ images: fileData });
		if (error) {
			// Delete the uploaded files from disk if validation fails
			files.forEach((file) => {
				fs.unlink(path.join("..", "..", file.path), (err) => {
					if (err) {
						console.error(`Error deleting file: ${file.path}`, err);
					}
				});
			});

			const details = error.details?.map((err) => ({
				field: err.path[0],
				message: err.message,
			}));
			throw new APIError("Validation Error", 400, details);
		}

		next();
	},
	productController.uploadImages
);
router.delete("/:id/images/:imageId", productController.deleteImage);

module.exports = router;
