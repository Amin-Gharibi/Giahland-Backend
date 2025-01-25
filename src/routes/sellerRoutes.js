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
router.use(authorize("seller"));
router.get("/profile", sellerController.getProfile);
router.put("/profile", validateRequest(sellerSchemas.updateProfile), sellerController.updateProfile);
router.get("/orders", sellerController.getOrders);
router.get("/statistics", sellerController.getStatistics);

// Admin routes
router.use(authorize("admin"));
router.post("/add-seller", authorize("admin"), validateRequest(sellerSchemas.addSeller), sellerController.addSeller);
router.get("/list", sellerController.getSellersList);

module.exports = router;
