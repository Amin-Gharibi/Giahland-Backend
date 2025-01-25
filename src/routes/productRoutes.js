const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth");
const productController = require("../controllers/productController");
const validateRequest = require("../middlewares/validateRequest");
const productSchemas = require("../validators/productSchemas");
const upload = require("../config/multer");

// Public routes
router.get("/", productController.getProducts);
router.get("/featured", productController.getFeaturedProducts);
router.get("/best-sellers", productController.getBestSellers);
router.get("/new-arrivals", productController.getNewArrivals);
router.get("/:id", productController.getProductById);
router.get("/category/:categoryId", productController.getProductsByCategory);

// Protected seller routes
router.use(protect);
router.use(authorize("seller"));

router.post("/", validateRequest(productSchemas.create), productController.createProduct);
router.put("/:id", validateRequest(productSchemas.update), productController.updateProduct);
router.delete("/:id", productController.deleteProduct);
router.post("/:id/images", validateRequest(productSchemas.uploadImages), upload.array("images", 5), productController.uploadImages);
router.delete("/:id/images/:imageId", productController.deleteImage);

module.exports = router;
