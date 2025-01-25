const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth");
const sellerController = require("../controllers/sellerController");
const validateRequest = require("../middlewares/validateRequest");
const sellerSchemas = require("../validators/sellerSchemas");

router.use(protect);

// Public seller routes
router.get("/:id/profile", sellerController.getSellerPublicProfile);
router.get("/:id/products", sellerController.getSellerProducts);

// Protected seller routes
router.post("/register", validateRequest(sellerSchemas.register), sellerController.registerAsSeller);
router.put("/profile", authorize("seller"), validateRequest(sellerSchemas.updateProfile), sellerController.updateProfile);
router.get("/orders", authorize("seller"), sellerController.getOrders);
router.get("/statistics", authorize("seller"), sellerController.getStatistics);

module.exports = router;
