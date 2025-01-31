const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth");
const sellerController = require("../controllers/sellerController");
const validateRequest = require("../middlewares/validateRequest");
const sellerSchemas = require("../validators/sellerSchemas");

// Public routes
router.get("/:id/profile", sellerController.getSellerPublicProfile);
router.get("/:id/products", sellerController.getSellerProducts);

// Protected routes
router.use(protect);

// Seller routes
router.get("/profile", authorize("seller"), sellerController.getProfile);
router.put("/profile", authorize("seller"), validateRequest(sellerSchemas.updateProfile), sellerController.updateProfile);
router.get("/orders", authorize("seller"), sellerController.getOrders);
router.get("/statistics", authorize("seller"), sellerController.getStatistics);

// Admin routes
router.use(authorize("admin"));
router.post("/add-seller", authorize("admin"), validateRequest(sellerSchemas.addSeller), sellerController.addSeller);
router.get("/list", sellerController.getSellersList);

module.exports = router;
